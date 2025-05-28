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
      }
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
    
    // Return audio file directly
    callback(null, {
      statusCode: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioData.length,
        'Cache-Control': 'public, max-age=3600'
      },
      body: audioData.toString('base64'),
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