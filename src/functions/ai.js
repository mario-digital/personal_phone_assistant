const Twilio = require('twilio');

exports.handler = async (context, event, callback) => {
  const twiml = new Twilio.twiml.VoiceResponse();

  try {
    // Get TTS configuration from environment variables
    const ttsMode = process.env.TTS_MODE || 'vercel';
    const baseUrl = ttsMode === 'local' 
      ? process.env.LOCAL_TTS_URL 
      : process.env.VERCEL_TTS_URL;
    const endpoint = ttsMode === 'local' ? '/tts' : '/api/tts';
    
    console.log(`TTS Mode: ${ttsMode}`);
    console.log(`TTS Base URL: ${baseUrl}`);
    
    // Check if we have a valid TTS URL
    if (baseUrl && baseUrl !== 'https://your-ngrok-url.ngrok-free.app') {
      // Use ElevenLabs via Vercel/ngrok
      const greetingText = "Hello! This is Zee, Mario's personal assistant. How may I help you today?";
      const audioUrl = `${baseUrl}${endpoint}?text=${encodeURIComponent(greetingText)}`;
      
      console.log('Playing greeting from:', audioUrl);
      twiml.play(audioUrl);
    } else {
      console.log('No valid TTS URL, using Polly fallback');
      // Fallback to Polly
      twiml.say({
        voice: 'Polly.Emma-Neural',
        language: 'en-GB'
      }, "Hello! This is Zee, Mario's personal assistant. How may I help you today?");
    }

    // Start conversation with speech input
    twiml.gather({
      input: 'speech',
      timeout: 6,
      speechTimeout: 'auto',
      action: '/functions/conversation',
      method: 'POST'
    });

    // Fallback if no speech detected
    twiml.say({
      voice: 'Polly.Emma-Neural',
      language: 'en-GB'
    }, "I didn't hear anything. Please call back if you need assistance. Goodbye!");

  } catch (error) {
    console.error('AI handler error:', error);
    
    // Complete fallback to Polly on any error
    twiml.say({
      voice: 'Polly.Emma-Neural',
      language: 'en-GB'
    }, "Hello! This is Zee, Mario's personal assistant. How may I help you today?");

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
    }, "I didn't hear anything. Please call back if you need assistance. Goodbye!");
  }

  callback(null, twiml);
};