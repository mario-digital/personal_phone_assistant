require('dotenv').config();
const { ElevenLabsClient } = require('elevenlabs');
const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY
});

(async () => {
  const voices = await elevenlabs.voices.getAll();
  voices.voices.forEach(v => {
    console.log(`${v.name}: ${v.voice_id}`);
  });
})();