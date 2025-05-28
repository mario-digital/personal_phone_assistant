const Twilio = require('twilio');

exports.handler = (context, event, callback) => {
  const twiml = new Twilio.twiml.VoiceResponse();
  
  // Skip the dial for now, go straight to AI with correct path
  twiml.redirect('/functions/ai');
  
  callback(null, twiml);
};