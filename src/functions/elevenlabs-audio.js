const { ElevenLabsClient } = require('elevenlabs');

exports.handler = async (context, event, callback) => {
  try {
    const text = event.text || 'Hello';
    
    console.log('Generating ElevenLabs audio for:', text);
    
    const elevenlabs = new ElevenLabsClient({
      apiKey: process.env.ELEVENLABS_API_KEY
    });
    
    // Use the 2025 API method
    const voiceId = process.env.ELEVENLABS_VOICE_ID || "pqHfZKP75CvOlQylNhV4";
    const audioStream = await elevenlabs.textToSpeech.convertAsStream(voiceId, {
      text: text,
      model_id: "eleven_multilingual_v2",
      output_format: "mp3_22050_32",
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.8,
        style: 0.0,
        use_speaker_boost: true
      }
    });
    
    // Collect all chunks into a buffer
    const chunks = [];
    for await (const chunk of audioStream) {
      chunks.push(chunk);
    }
    const audioBuffer = Buffer.concat(chunks);
    
    // Return audio file directly
    callback(null, {
      statusCode: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': 'inline; filename="voice.mp3"',
        'Cache-Control': 'public, max-age=300'
      },
      body: audioBuffer.toString('base64'),
      isBase64Encoded: true
    });
    
  } catch (error) {
    console.error('ElevenLabs Error:', error);
    callback(null, {
      statusCode: 500,
      headers: {
        'Content-Type': 'text/plain'
      },
      body: `Audio generation failed: ${error.message}`
    });
  }
};