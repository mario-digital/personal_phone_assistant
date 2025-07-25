// config.js - Centralized configuration management with TTS mode switching

// Determine TTS URL and endpoint based on mode
function getTTSConfig() {
  const mode = process.env.TTS_MODE || 'vercel';
  
  if (mode === 'local') {
    return {
      baseUrl: process.env.LOCAL_TTS_URL || 'https://your-ngrok-url.ngrok-free.app',
      endpoint: '/tts' // Local server uses /tts
    };
  } else {
    return {
      baseUrl: process.env.VERCEL_TTS_URL || 'https://tts-vercel-phone-assistant-7oou5wx4n-marios-projects-5e68f152.vercel.app',
      endpoint: '/api/tts' // Vercel uses /api/tts
    };
  }
}

const ttsConfig = getTTSConfig();

module.exports = {
  // TTS Configuration
  tts: {
    mode: process.env.TTS_MODE || 'vercel',
    baseUrl: ttsConfig.baseUrl,
    endpoint: ttsConfig.endpoint,
    fullUrl: `${ttsConfig.baseUrl}${ttsConfig.endpoint}`
  },

  // ElevenLabs Configuration
  elevenlabs: {
    apiKey: process.env.ELEVENLABS_API_KEY,
    voiceId: process.env.ELEVENLABS_VOICE_ID || "pqHfZKP75CvOlQylNhV4",
    model: "eleven_multilingual_v2",
    outputFormat: "mp3_22050_32",
    voiceSettings: {
      stability: 0.5,
      similarity_boost: 0.8,
      style: 0.0,
      use_speaker_boost: true
    }
  },

  // Twilio Configuration
  twilio: {
    phoneNumber: process.env.TWILIO_PHONE_NUMBER,
    mainPhoneNumber: process.env.MAIN_PHONE_NUMBER,
  },

  // OpenAI Configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4o',
    maxTokens: 100,
    temperature: 0.8
  },

  // Server Configuration (legacy for local mode)
  server: {
    port: process.env.PORT || 3000,
    ngrokUrl: ttsConfig.baseUrl // Backward compatibility
  },

  // System Messages
  systemMessage: `You are Zee, Mario's professional assistant. Be warm, conversational, and helpful. Act like a real human assistant would.

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

Be professional but friendly, like a real assistant.`,

  // Greeting message
  greetingMessage: "Hello! This is Zee, Mario's personal assistant. How may I help you today?"
};