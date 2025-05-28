const OpenAI = require('openai');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

exports.handler = (context, event, callback) => {
  const WebSocket = require('ws');
  
  // This handles the WebSocket connection for audio streaming
  const response = {
    statusCode: 101,
    headers: {
      'Upgrade': 'websocket',
      'Connection': 'Upgrade'
    }
  };
  
  // Audio processing variables
  let audioBuffer = [];
  let conversationHistory = [
    {
      role: 'system',
      content: `You are Mario's AI assistant answering his phone calls. Keep responses brief and natural, like a human receptionist. Ask for their name, reason for calling, and if it's urgent. After gathering info, say you'll text Mario a summary and ask if they want to leave a voicemail. Keep it conversational and helpful.`
    }
  ];
  
  // WebSocket message handler
  const handleWebSocketMessage = async (ws, message) => {
    try {
      const data = JSON.parse(message);
      
      switch (data.event) {
        case 'connected':
          console.log('WebSocket connected');
          break;
          
        case 'start':
          console.log('Stream started:', data.start);
          break;
          
        case 'media':
          // Collect audio data
          audioBuffer.push(data.media.payload);
          
          // Process audio every 3 seconds of data (adjust as needed)
          if (audioBuffer.length > 150) { // ~3 seconds at 20ms chunks
            await processAudioChunk(ws, audioBuffer.join(''));
            audioBuffer = [];
          }
          break;
          
        case 'stop':
          console.log('Stream stopped');
          // Send final summary SMS here
          await sendSummaryToMario(conversationHistory);
          break;
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  };
  
  // Process audio chunk with OpenAI
  const processAudioChunk = async (ws, audioData) => {
    try {
      // Decode base64 audio to buffer
      const audioBuffer = Buffer.from(audioData, 'base64');
      
      // Send to Whisper for transcription
      const transcription = await openai.audio.transcriptions.create({
        file: audioBuffer,
        model: 'whisper-1',
        response_format: 'text'
      });
      
      if (transcription && transcription.trim()) {
        console.log('User said:', transcription);
        
        // Add to conversation
        conversationHistory.push({
          role: 'user',
          content: transcription
        });
        
        // Get GPT response
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: conversationHistory,
          max_tokens: 150,
          temperature: 0.7
        });
        
        const aiResponse = completion.choices[0].message.content;
        console.log('AI response:', aiResponse);
        
        // Add AI response to history
        conversationHistory.push({
          role: 'assistant',
          content: aiResponse
        });
        
        // Convert to speech and send back
        await speakResponse(ws, aiResponse);
      }
    } catch (error) {
      console.error('Audio processing error:', error);
    }
  };
  
  // Convert text to speech and send to Twilio
  const speakResponse = async (ws, text) => {
    try {
      const speech = await openai.audio.speech.create({
        model: 'tts-1',
        voice: 'nova',
        input: text,
        response_format: 'mulaw',
        speed: 1.0
      });
      
      const audioBuffer = Buffer.from(await speech.arrayBuffer());
      const base64Audio = audioBuffer.toString('base64');
      
      // Send audio back to Twilio
      ws.send(JSON.stringify({
        event: 'media',
        streamSid: ws.streamSid,
        media: {
          payload: base64Audio
        }
      }));
    } catch (error) {
      console.error('TTS error:', error);
    }
  };
  
  // Send summary SMS to Mario
  const sendSummaryToMario = async (conversation) => {
    try {
      const client = context.getTwilioClient();
      
      // Extract key info from conversation
      const userMessages = conversation.filter(msg => msg.role === 'user');
      const summary = `Call Summary:\n${userMessages.map(msg => msg.content).join('\n')}`;
      
      await client.messages.create({
        body: summary,
        from: context.TWILIO_PHONE_NUMBER || '+14806965200',
        to: '+14803696800' // Mario's T-Mobile number
      });
      
      console.log('Summary sent to Mario');
    } catch (error) {
      console.error('SMS error:', error);
    }
  };
  
  callback(null, response);
};