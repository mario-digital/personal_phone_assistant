const OpenAI = require('openai');
const Twilio = require('twilio');

// Initialize OpenAI with environment variables
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Store conversation state (in production, use Redis or database)
const conversations = new Map();

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
  
  try {
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
        const completion = await openai.chat.completions.create({
          model: 'gpt-4.1-nano',
          messages: conversation,
          max_tokens: 100,
          temperature: 0.8
        });
        
        aiResponse = completion.choices[0].message.content;
        console.log(`AI response: "${aiResponse}"`);
      } catch (openaiError) {
        console.error('OpenAI API error:', openaiError);
        // Fallback response if OpenAI fails
        aiResponse = "I'm sorry, I'm having trouble processing that right now. Could you please repeat what you need help with?";
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
        twiml.say({
          voice: 'Polly.Emma-Neural',
          language: 'en-GB'
        }, 'Mario will get back to you soon. Have a great day!');
        twiml.hangup();
      } else {
        // Continue conversation
        twiml.gather({
          input: 'speech',
          timeout: 6,
          speechTimeout: 'auto',
          action: '/functions/conversation',
          method: 'POST'
        });
        
        // Timeout fallback
        twiml.say({
          voice: 'Polly.Emma-Neural',
          language: 'en-GB'
        }, 'Are you still there?');
        twiml.redirect('/functions/conversation');
      }
    } else {
      // No speech detected
      twiml.say({
        voice: 'Polly.Emma-Neural',
        language: 'en-GB'
      }, 'I didn\'t catch that. Could you repeat?');
      
      twiml.gather({
        input: 'speech',
        timeout: 6,
        speechTimeout: 'auto',
        action: '/functions/conversation',
        method: 'POST'
      });
      
      twiml.say({
        voice: 'Polly.Emma-Neural',
        language: 'en-GB'
      }, 'I\'m having trouble hearing you. Please call back. Goodbye!');
    }
    
  } catch (error) {
    console.error('Conversation error:', error);
    console.error('Error stack:', error.stack);
    
    // Provide helpful error response
    twiml.say({
      voice: 'Polly.Emma-Neural',
      language: 'en-GB'
    }, 'I\'m having technical difficulties. Please call back later. Goodbye!');
    twiml.hangup();
  }
  
  callback(null, twiml);
};

// Determine if conversation should end
function shouldEndConversation(aiResponse, conversation) {
  const endPhrases = [
    'mario will get back to you soon',
    'have a great day',
    'goodbye',
    'talk to you soon',
    'thanks for calling',
    'take care'
  ];
  
  const responseWords = aiResponse.toLowerCase();
  const shouldEnd = endPhrases.some(phrase => responseWords.includes(phrase)) || 
         conversation.length > 20; // Allow longer conversations
  
  console.log(`Checking if should end: "${aiResponse}" -> ${shouldEnd}`);
  return shouldEnd;
}

// Call Mario back with voice summary
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
    
    // Call Mario's phone numbers using environment variables
    const call = await client.calls.create({
      from: twilioPhoneNumber,
      to: mainPhoneNumber,
      url: `https://${context.DOMAIN_NAME}/functions/voice-summary?message=${encodeURIComponent(voiceSummary)}`,
      timeout: 20 // Ring for 20 seconds then go to voicemail
    });
    
    console.log('Voice summary call created with SID:', call.sid);
  } catch (error) {
    console.error('Voice callback error:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
  }
}