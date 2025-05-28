const Twilio = require('twilio');

exports.handler = async (context, event, callback) => {
  const twiml = new Twilio.twiml.VoiceResponse();

  try {
    // Get ngrok URL from environment - make sure this is set correctly
    const NGROK_URL = process.env.NGROK_URL;
    
    // Check if ngrok URL is available
    if (NGROK_URL && NGROK_URL !== 'https://your-ngrok-url.ngrok-free.app') {
      console.log('Using ngrok URL:', NGROK_URL);
      
      // Use ngrok/Express-based TTS server for greeting
      const greetingText = "Hello! This is Zee, Mario's personal assistant. How may I help you today?";
      const audioUrl = `${NGROK_URL}/tts?text=${encodeURIComponent(greetingText)}`;
      
      console.log('Playing greeting from:', audioUrl);
      twiml.play(audioUrl);
    } else {
      console.log('No valid ngrok URL, falling back to Polly');
      // Fallback to Polly if ngrok is not available
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