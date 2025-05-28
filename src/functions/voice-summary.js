const Twilio = require('twilio');

exports.handler = (context, event, callback) => {
  const twiml = new Twilio.twiml.VoiceResponse();
  
  // Get the summary message from the URL parameter
  const summaryMessage = event.message || 'No summary available';
  
  // Use Polly voice (no static)
  twiml.say({
    voice: 'Polly.Emma-Neural',
    language: 'en-GB'
  }, summaryMessage);
  
  // Hang up after delivering the summary
  twiml.hangup();
  
  callback(null, twiml);
};