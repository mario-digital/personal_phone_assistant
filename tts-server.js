require('dotenv').config();

const express = require('express');
const { ElevenLabsClient } = require('elevenlabs');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const tmp = require('tmp');
const app = express();

const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY
});

app.get('/tts', async (req, res) => {
  try {
    const text = req.query.text || 'Hello from ElevenLabs!';
    console.log('Generating:', text);

    // Step 1: Generate ElevenLabs audio with the correct method for the elevenlabs package you're using
    const voiceId = process.env.ELEVENLABS_VOICE_ID || "pqHfZKP75CvOlQylNhV4";
    
    // Use the correct method for the elevenlabs package (not @elevenlabs/elevenlabs-js)
    const audioStream = await elevenlabs.generate({
      voice: voiceId,
      text: text,
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.8,
        style: 0.0,
        use_speaker_boost: true
      }
    });

    // Step 2: Save MP3 to temp file
    const mp3File = tmp.tmpNameSync({ postfix: '.mp3' });
    const writeStream = fs.createWriteStream(mp3File);
    
    for await (const chunk of audioStream) {
      writeStream.write(chunk);
    }
    writeStream.end();
    await new Promise(resolve => writeStream.on('finish', resolve));

    // Step 3: Transcode to 8kHz mono μ-law WAV (Twilio format)
    const wavFile = tmp.tmpNameSync({ postfix: '.wav' });
    await new Promise((resolve, reject) => {
      ffmpeg(mp3File)
        .audioChannels(1)
        .audioFrequency(8000)
        .audioCodec('pcm_mulaw')
        .format('wav')
        .on('end', resolve)
        .on('error', reject)
        .save(wavFile);
    });

    // Step 4: Stream WAV file to Twilio/browser
    const stat = fs.statSync(wavFile);
    res.set('Content-Type', 'audio/wav');
    res.set('Content-Length', stat.size);
    res.set('Content-Disposition', 'inline; filename="voice.wav"');
    const readStream = fs.createReadStream(wavFile);
    readStream.pipe(res);

    // Step 5: Cleanup
    readStream.on('close', () => {
      try {
        fs.unlinkSync(mp3File);
        fs.unlinkSync(wavFile);
      } catch (err) {
        console.warn('Cleanup error:', err.message);
      }
    });

  } catch (err) {
    console.error('TTS server error:', err);
    res.status(500).send('TTS server error: ' + err.message);
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`TTS server listening on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`TTS endpoint: http://localhost:${PORT}/tts?text=Hello`);
});