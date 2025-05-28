require('dotenv').config(); // <-- Add this at the very top

const { ElevenLabsClient } = require("elevenlabs");
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const tmp = require('tmp');

const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY
});

exports.handler = async (context, event, callback) => {
  try {
    const text = event.text || 'Hello';
    console.log('Generating ElevenLabs audio for:', text);

    // Step 1: Generate speech with ElevenLabs (MP3 output)
    const audioStream = await elevenlabs.generate({
      voiceId: "EXAVITQu4vr4xnSDxMaL",
      text,
      modelId: "eleven_multilingual_v2",
      outputFormat: "mp3",
      voiceSettings: {
        stability: 0.5,
        similarityBoost: 0.8,
        style: 0.0,
        useSpeakerBoost: true
      }
    });

    // Step 2: Save MP3 stream to a temp file
    const mp3File = tmp.tmpNameSync({ postfix: '.mp3' });
    const writeStream = fs.createWriteStream(mp3File);
    for await (const chunk of audioStream) {
      writeStream.write(chunk);
    }
    writeStream.end();

    await new Promise(resolve => writeStream.on('finish', resolve));

    // Step 3: Transcode MP3 to 8kHz mono μ-law WAV using FFmpeg
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

    // Step 4: Read the WAV output and clean up temp files
    const audioBuffer = fs.readFileSync(wavFile);
    fs.copyFileSync(wavFile, 'output.wav'); // Save for inspection!
    fs.unlinkSync(mp3File);
    fs.unlinkSync(wavFile);

    // Step 5: Return WAV file to Twilio
    callback(null, {
      statusCode: 200,
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': audioBuffer.length,
        'Cache-Control': 'public, max-age=3600'
      },
      body: audioBuffer.toString('base64'),
      isBase64Encoded: true
    });

  } catch (error) {
    console.error('ElevenLabs/FFmpeg Error:', error);
    callback(null, {
      statusCode: 500,
      headers: { 'Content-Type': 'text/plain' },
      body: 'Audio generation failed'
    });
  }
};

if (require.main === module) {
  exports.handler(
    {}, // context (empty object is fine)
    { text: "Hello, this is a test." }, // event (simulate a request)
    () => {
      console.log("Handler finished!");
    }
  );
}
