const Twilio = require('twilio');

exports.handler = (context, event, callback) => {
  const twiml = new Twilio.twiml.VoiceResponse();
  
  // Use Polly voice for now (no static)
  twiml.say({
    voice: 'Polly.Emma-Neural',
    language: 'en-GB'
  }, 'Hello! This is Zeee, Mario\'s personal assistant. How may I help you today?');
  
  // Start conversation
  const gather = twiml.gather({
    input: 'speech',
    timeout: 4,
    speechTimeout: 'auto',
    action: '/functions/conversation',
    method: 'POST'
  });
  
  twiml.say({
    voice: 'Polly.Emma-Neural',
    language: 'en-GB'
  }, 'I didn\'t hear anything. Please call back if you need assistance. Goodbye!');
  
  callback(null, twiml);
};