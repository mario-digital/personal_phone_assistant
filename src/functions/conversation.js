const Twilio = require('twilio');
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Store conversation state
const conversations = new Map();

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
        content: `You are Zeeh, Mario's professional assistant. Be warm, conversational, and helpful. Act like a real human assistant would.

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

Be professional but friendly, like a real assistant.`
      }
    ];
    
    // Add user input to conversation
    if (userSpeech.trim()) {
      conversation.push({
        role: 'user',
        content: userSpeech
      });
      
      // Get AI response
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: conversation,
        max_tokens: 100,
        temperature: 0.8
      });
      
      const aiResponse = completion.choices[0].message.content;
      console.log(`AI response: "${aiResponse}"`);
      
      // Add AI response to conversation
      conversation.push({
        role: 'assistant',
        content: aiResponse
      });
      
      // Store updated conversation
      conversations.set(callSid, conversation);
      
      // Speak the AI response with Polly voice (no ElevenLabs yet)
      twiml.say({
        voice: 'Polly.Emma-Neural',
        language: 'en-GB'
      }, aiResponse);
      
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
        const gather = twiml.gather({
          input: 'speech',
          timeout: 4,
          speechTimeout: 'auto',
          action: '/functions/conversation',
          method: 'POST'
        });
        
        // Timeout fallback
        twiml.say('Are you still there?');
        twiml.redirect('/functions/conversation');
      }
    } else {
      // No speech detected
      twiml.say('I didn\'t catch that. Could you repeat?');
      const gather = twiml.gather({
        input: 'speech',
        timeout: 4,
        speechTimeout: 'auto',
        action: '/functions/conversation',
        method: 'POST'
      });
      twiml.say('I\'m having trouble hearing you. Please call back. Goodbye!');
    }
    
  } catch (error) {
    console.error('Conversation error:', error);
    twiml.say('I\'m having technical difficulties. Please call back later. Goodbye!');
    twiml.hangup();
  }
  
  callback(null, twiml);
};

// Determine if conversation should end
function shouldEndConversation(aiResponse, conversation) {
  const endPhrases = [
    'mario will get back to you',
    'i\'ll make sure mario gets',
    'have a great day',
    'goodbye',
    'talk to you soon',
    'thanks for calling'
  ];
  
  const responseWords = aiResponse.toLowerCase();
  const shouldEnd = endPhrases.some(phrase => responseWords.includes(phrase)) || 
         conversation.length > 16;
  
  console.log(`Checking if should end: "${aiResponse}" -> ${shouldEnd}`);
  return shouldEnd;
}

// Call Mario back with voice summary
async function sendSummaryToMario(context, callerNumber, conversation) {
  try {
    console.log('Starting voice summary process...');
    const client = context.getTwilioClient();
    
    const userMessages = conversation
      .filter(msg => msg.role === 'user')
      .map(msg => msg.content)
      .join('. ');
    
    const callerInfo = callerNumber.replace('+1', '').replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
    const voiceSummary = `Hi Mario, this is Zeeh with a call summary. You received a call from ${callerInfo}. Here's what they said: ${userMessages}. End of summary.`;
    
    const call = await client.calls.create({
      from: context.TWILIO_PHONE_NUMBER,
      to: context.MAIN_PHONE_NUMBER,
      url: `https://${context.DOMAIN_NAME}/functions/voice-summary?message=${encodeURIComponent(voiceSummary)}`,
      timeout: 20
    });
    
    console.log('Voice summary call created with SID:', call.sid);
  } catch (error) {
    console.error('Voice callback error:', error);
  }
}