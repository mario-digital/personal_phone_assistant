const Twilio = require('twilio');

exports.handler = async (context, event, callback) => {
  console.log('Callback status received:', {
    CallSid: event.CallSid,
    CallStatus: event.CallStatus,
    Duration: event.CallDuration,
    From: event.From,
    To: event.To
  });
  
  try {
    const callStatus = event.CallStatus;
    
    // Handle different call outcomes
    switch (callStatus) {
      case 'completed':
        console.log('Summary call completed successfully');
        break;
        
      case 'no-answer':
        console.log('No answer - summary call not answered');
        // Could send SMS backup here if needed
        await sendSMSBackup(context, event);
        break;
        
      case 'busy':
        console.log('Line busy - summary call not completed');
        await sendSMSBackup(context, event);
        break;
        
      case 'failed':
        console.log('Summary call failed');
        await sendSMSBackup(context, event);
        break;
        
      default:
        console.log('Unknown call status:', callStatus);
    }
    
  } catch (error) {
    console.error('Callback status error:', error);
  }
  
  // Always return empty response
  callback(null, '');
};

// Send SMS backup if voice call fails
async function sendSMSBackup(context, event) {
  try {
    const client = context.getTwilioClient();
    const twilioNumber = process.env.TWILIO_PHONE_NUMBER;
    const mainPhoneNumber = process.env.MAIN_PHONE_NUMBER;
    
    // Extract summary from the original URL (if possible)
    const originalUrl = event.CallbackSource || '';
    const messageMatch = originalUrl.match(/message=([^&]+)/);
    let summaryText = 'Call summary unavailable';
    
    if (messageMatch) {
      summaryText = decodeURIComponent(messageMatch[1]);
    }
    
    // Send SMS as backup
    await client.messages.create({
      body: `Voice summary failed to deliver. ${summaryText}`,
      from: twilioNumber,
      to: mainPhoneNumber
    });
    
    console.log('SMS backup sent successfully');
    
  } catch (smsError) {
    console.error('SMS backup error:', smsError);
  }
}