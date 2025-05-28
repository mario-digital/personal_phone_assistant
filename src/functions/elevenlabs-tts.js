const https = require('https');

exports.handler = async (context, event, callback) => {
  try {
    const text = event.text || 'Hello';
    
    console.log('Generating ElevenLabs audio for:', text);
    
    const postData = JSON.stringify({
      text: text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.8,
        style: 0.0,
        use_speaker_boost: true
      },
      output_format: 'mp3_22050_32' // Specify MP3 format compatible with Twilio
    });
    
    const options = {
      hostname: 'api.elevenlabs.io',
      port: 443,
      path: '/v1/text-to-speech/EXAVITQu4vr4xnSDxMaL',
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const audioData = await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        const chunks = [];
        
        res.on('data', (chunk) => {
          chunks.push(chunk);
        });
        
        res.on('end', () => {
          if (res.statusCode === 200) {
            resolve(Buffer.concat(chunks));
          } else {
            reject(new Error(`ElevenLabs API error: ${res.statusCode}`));
          }
        });
      });
      
      req.on('error', (error) => {
        reject(error);
      });
      
      req.write(postData);
      req.end();
    });
    
    // Return properly formatted audio for Twilio
    const response = new Twilio.twiml.VoiceResponse();
    
    callback(null, {
      statusCode: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': 'inline',
        'Cache-Control': 'no-cache'
      },
      body: audioData.toString('base64'),
      isBase64Encoded: true
    });
    
  } catch (error) {
    console.error('ElevenLabs Error:', error);
    // Fallback to Twilio TTS if ElevenLabs fails
    const twiml = new Twilio.twiml.VoiceResponse();
    twiml.say({
      voice: 'Polly.Emma-Neural',
      language: 'en-GB'
    }, event.text || 'Hello');
    
    callback(null, twiml);
  }
};