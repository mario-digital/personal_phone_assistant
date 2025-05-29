const OpenAI = require('openai');
const Twilio = require('twilio');

// Initialize OpenAI with environment variables
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Store conversation state (in production, use Redis or database)
const conversations = new Map();
const callAttempts = new Map(); // Track callback attempts

// System message
const systemMessage = `You are Zee, Mario's professional assistant. Be warm, conversational, and helpful. Act like a real human assistant would.

Your goals:
1. Get the caller's name politely
2. Understand why they're calling Mario
3. Ask if it's urgent or if they can wait for a callback
4. If not urgent, offer to take a detailed message
5. Only end the conversation after you have all the info Mario needs

Keep responses natural and under 25 words. Use phrases like:
- "May I ask who's calling?"
- "What can I help you with regarding Mario?"
- "Is this something urgent or can Mario call you back?"
- "Let me take down your message for Mario"
- "I'll make sure Mario gets this message"

Be professional but friendly, like a real assistant.`;

// Use TTS server for speech playback with error handling
async function playElevenLabsSpeech(twiml, text) {
  try {
    // Get TTS configuration from environment variables
    const ttsMode = process.env.TTS_MODE || 'vercel';
    const baseUrl = ttsMode === 'local' 
      ? process.env.LOCAL_TTS_URL 
      : process.env.VERCEL_TTS_URL;
    const endpoint = ttsMode === 'local' ? '/tts' : '/api/tts';
    
    if (baseUrl && baseUrl !== 'https://your-ngrok-url.ngrok-free.app') {
      console.log(`Using ${ttsMode} TTS for:`, text);
      const encodedText = encodeURIComponent(text.trim());
      const audioUrl = `${baseUrl}${endpoint}?text=${encodedText}`;
      
      console.log('Audio URL:', audioUrl);
      twiml.play(audioUrl);
    } else {
      console.log('No valid TTS URL, using Polly fallback');
      twiml.say({
        voice: 'Polly.Emma-Neural',
        language: 'en-GB'
      }, text);
    }
  } catch (error) {
    console.error(`TTS error:`, error);
    // Fallback to Polly if TTS fails
    twiml.say({
      voice: 'Polly.Emma-Neural',
      language: 'en-GB'
    }, text);
  }
}

exports.handler = async (context, event, callback) => {
  const twiml = new Twilio.twiml.VoiceResponse();
  const callSid = event.CallSid;
  const userSpeech = event.SpeechResult || '';
  const confidence = event.Confidence || 0;
  
  console.log(`User said: "${userSpeech}" (confidence: ${confidence})`);
  console.log(`Call Status: ${event.CallStatus || 'unknown'}`);
  
  try {
    // Check if call ended unexpectedly (hangup detection)
    if (event.CallStatus === 'completed' || event.CallStatus === 'failed' || 
        event.CallStatus === 'busy' || event.CallStatus === 'no-answer') {
      console.log('Call ended unexpectedly, sending summary...');
      const conversation = conversations.get(callSid) || [];
      if (conversation.length > 1) { // Only send if there was actual conversation
        await sendSummaryToMario(context, event.From, conversation);
      }
      // Clean up conversation memory
      conversations.delete(callSid);
      callback(null, twiml);
      return;
    }

    // Get or create conversation history
    let conversation = conversations.get(callSid) || [
      {
        role: 'system',
        content: systemMessage
      }
    ];
    
    // Add user input to conversation
    if (userSpeech.trim()) {
      conversation.push({
        role: 'user',
        content: userSpeech
      });
      
      // Get AI response with error handling
      let aiResponse;
      try {
        // Use configurable OpenAI settings from environment variables
        const model = process.env.OPENAI_MODEL;
        const maxTokens = parseInt(process.env.OPENAI_MAX_TOKENS) || 50;
        const temperature = parseFloat(process.env.OPENAI_TEMPERATURE) || 0.7;
        
        console.log(`Using OpenAI model: ${model}, max_tokens: ${maxTokens}, temperature: ${temperature}`);
        
        const completion = await openai.chat.completions.create({
          model: model,
          messages: conversation,
          max_tokens: maxTokens,
          temperature: temperature
        });
        
        aiResponse = completion.choices[0].message.content;
        console.log(`AI response: "${aiResponse}"`);
      } catch (openaiError) {
        console.error('OpenAI API error:', openaiError);
        console.error('OpenAI error details:', JSON.stringify(openaiError, null, 2));
        // Fallback response if OpenAI fails
        aiResponse = "Sorry, could you repeat that?";
      }
      
      // Add AI response to conversation
      conversation.push({
        role: 'assistant',
        content: aiResponse
      });
      
      // Store updated conversation
      conversations.set(callSid, conversation);
      
      // Generate and play speech
      await playElevenLabsSpeech(twiml, aiResponse);
      
      // Check if conversation should end
      if (shouldEndConversation(aiResponse, conversation)) {
        // Send summary and end call
        await sendSummaryToMario(context, event.From, conversation);
        
        // Use ElevenLabs for goodbye message too
        await playElevenLabsSpeech(twiml, 'Mario will get back to you soon. Have a great day!');
        twiml.hangup();
        conversations.delete(callSid);
      } else {
        // Continue conversation
        twiml.gather({
          input: 'speech',
          timeout: 6,
          speechTimeout: 'auto',
          action: '/functions/conversation',
          method: 'POST'
        });
        
        // Timeout fallback - use ElevenLabs for consistency
        await playElevenLabsSpeech(twiml, 'Are you still there?');
        twiml.redirect('/functions/conversation');
      }
    } else {
      // Handle timeout/no speech with summary if conversation exists
      if (conversation.length > 1) {
        console.log('No speech detected but conversation exists, sending summary...');
        await sendSummaryToMario(context, event.From, conversation);
        await playElevenLabsSpeech(twiml, 'I didn\'t catch that. Mario will get a summary of our call. Goodbye!');
        conversations.delete(callSid);
      } else {
        // No conversation yet, just the standard no speech response
        await playElevenLabsSpeech(twiml, 'I didn\'t catch that. Could you repeat?');
        
        twiml.gather({
          input: 'speech',
          timeout: 6,
          speechTimeout: 'auto',
          action: '/functions/conversation',
          method: 'POST'
        });
        
        await playElevenLabsSpeech(twiml, 'I\'m having trouble hearing you. Please call back. Goodbye!');
      }
    }
    
  } catch (error) {
    console.error('Conversation error:', error);
    console.error('Error stack:', error.stack);
    
    // Even on error, try to send summary if conversation existed
    const conversation = conversations.get(callSid) || [];
    if (conversation.length > 1) {
      try {
        await sendSummaryToMario(context, event.From, conversation);
      } catch (summaryError) {
        console.error('Summary error:', summaryError);
      }
    }
    
    // Provide helpful error response
    await playElevenLabsSpeech(twiml, 'I\'m having technical difficulties. Mario will get a summary. Goodbye!');
    twiml.hangup();
    conversations.delete(callSid);
  }
  
  callback(null, twiml);
};

// FIXED: More precise conversation ending detection
function shouldEndConversation(aiResponse, conversation) {
  const definiteEndPhrases = [
    'mario will get back to you soon',
    'have a great day',
    'goodbye',
    'talk to you soon',
    'thanks for calling',
    'take care',
    'i\'ll make sure mario gets this message',
    'mario will receive'
    // REMOVED: 'is there anything else' - this should NOT end the conversation
  ];
  
  const responseWords = aiResponse.toLowerCase();
  
  // Only end if we have a definite ending phrase AND sufficient conversation
  const hasEndPhrase = definiteEndPhrases.some(phrase => responseWords.includes(phrase));
  const hasEnoughConversation = conversation.length > 6; // At least some back-and-forth
  const tooLongConversation = conversation.length > 20; // Emergency brake
  
  const shouldEnd = (hasEndPhrase && hasEnoughConversation) || tooLongConversation;
  
  console.log(`Checking if should end: "${aiResponse}" -> ${shouldEnd} (endPhrase: ${hasEndPhrase}, enough: ${hasEnoughConversation}, tooLong: ${tooLongConversation})`);
  return shouldEnd;
}

// FIXED: Improved callback system with attempt tracking and voicemail handling
async function sendSummaryToMario(context, callerNumber, conversation) {
  try {
    console.log('Starting voice summary process...');
    
    // Check if required environment variables exist
    const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
    const mainPhoneNumber = process.env.MAIN_PHONE_NUMBER;
    
    if (!twilioPhoneNumber || !mainPhoneNumber) {
      console.error('Missing Twilio phone numbers in environment variables');
      return;
    }

    // Create a unique key for tracking attempts
    const attemptKey = `${callerNumber}-${Date.now()}`;
    
    // Check if we've already attempted this recently (prevent loops)
    const existingAttempt = callAttempts.get(callerNumber);
    if (existingAttempt && (Date.now() - existingAttempt) < 300000) { // 5 minutes
      console.log('Recent callback attempt exists, skipping to prevent loop');
      return;
    }
    
    // Track this attempt
    callAttempts.set(callerNumber, Date.now());
    
    const client = context.getTwilioClient();
    
    // Extract user messages for summary
    const userMessages = conversation
      .filter(msg => msg.role === 'user')
      .map(msg => msg.content)
      .join('. ');
    
    console.log('User messages:', userMessages);
    
    // Create a voice summary
    const callerInfo = callerNumber.replace('+1', '').replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
    const voiceSummary = `Hi Mario, this is Zee with a call summary. You received a call from ${callerInfo}. Here's what they said: ${userMessages}. End of summary.`;
    
    console.log('Voice summary:', voiceSummary);
    console.log(`About to make call to ${mainPhoneNumber} from ${twilioPhoneNumber}`);
    
    // Call Mario with improved settings
    const call = await client.calls.create({
      from: twilioPhoneNumber,
      to: mainPhoneNumber,
      url: `https://${context.DOMAIN_NAME}/functions/voice-summary?message=${encodeURIComponent(voiceSummary)}`,
      timeout: 20, // Shorter timeout
      machineDetection: 'Enable',
      machineDetectionTimeout: 5, // Shorter detection time
      // If it goes to voicemail, leave the message
      record: false, // Don't record the summary call
      // Add status callback to handle call completion
      statusCallback: `https://${context.DOMAIN_NAME}/functions/callback-status`,
      statusCallbackEvent: ['completed', 'failed', 'no-answer', 'busy'],
      statusCallbackMethod: 'POST'
    });
    
    console.log('Voice summary call created with SID:', call.sid);
    
    // Clean up attempt tracking after 5 minutes
    setTimeout(() => {
      callAttempts.delete(callerNumber);
    }, 300000);
    
  } catch (error) {
    console.error('Voice callback error:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
  }
}