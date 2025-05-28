const Twilio = require('twilio');

exports.handler = async (context, event, callback) => {
    const twiml = new Twilio.twiml.VoiceResponse();
    
    // Thank the caller
    twiml.say('Thank you for your message. Mario will receive a summary shortly. Goodbye!');
    
    // Get the recording transcription (if available)
    const transcription = event.TranscriptionText || 'No transcription available';
    const recordingUrl = event.RecordingUrl || 'No recording';
    
    // Send SMS summary to Mario using environment variables
    try {
      const client = context.getTwilioClient();
      const twilioNumber = process.env.TWILIO_PHONE_NUMBER;
      const marioNumber = process.env.MAIN_PHONE_NUMBER;
      
      const summary = `New voicemail:\nCaller: ${event.From}\nMessage: ${transcription}\nRecording: ${recordingUrl}`;
      
      await client.messages.create({
        body: summary,
        from: twilioNumber,
        to: marioNumber
      });
      
      console.log(`Summary sent to Mario at ${marioNumber}`);
    } catch (error) {
      console.error('SMS error:', error);
    }
    
    callback(null, twiml);
  };