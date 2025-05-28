exports.handler = async (context, event, callback) => {
    const twiml = new Twilio.twiml.VoiceResponse();
    
    // Thank the caller
    twiml.say('Thank you for your message. Mario will receive a summary shortly. Goodbye!');
    
    // Get the recording transcription (if available)
    const transcription = event.TranscriptionText || 'No transcription available';
    const recordingUrl = event.RecordingUrl || 'No recording';
    
    // Send SMS summary to Mario
    try {
      const client = context.getTwilioClient();
      
      const summary = `New voicemail:\nCaller: ${event.From}\nMessage: ${transcription}\nRecording: ${recordingUrl}`;
      
      await client.messages.create({
        body: summary,
        from: '+14806965200', // Your Twilio number
        to: '+14803696800'    // Your T-Mobile number
      });
      
      console.log('Summary sent to Mario');
    } catch (error) {
      console.error('SMS error:', error);
    }
    
    callback(null, twiml);
  };