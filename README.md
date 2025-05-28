# Personal AI Phone Assistant

An intelligent phone assistant that answers your calls when you're unavailable, conducts natural conversations with callers, gathers their information, and leaves you voice message summaries.

## Features

- 🤖 **AI-Powered Conversations**: Uses OpenAI GPT-4o to conduct natural, human-like phone conversations
- 📞 **Smart Call Routing**: Conditionally forwards calls only when you don't answer
- 🎭 **Professional Assistant Persona**: Acts as your personal assistant "Zeeh" 
- 📝 **Intelligent Information Gathering**: Asks for caller's name, reason for calling, and urgency
- 🔊 **Voice Summaries**: Calls you back with a spoken summary of the conversation
- 🌍 **Natural Voice**: Uses high-quality text-to-speech for realistic conversations
- ⚡ **Serverless Architecture**: Built on Twilio Functions for reliability and scalability

## Demo

When someone calls your number:
1. If you don't answer within 30 seconds, the call forwards to your AI assistant
2. Zeeh introduces herself and asks how she can help
3. She conducts a natural conversation to gather information
4. After the call ends, she calls you back with a voice summary

## Prerequisites

- [Twilio Account](https://www.twilio.com/) (free tier works)
- [OpenAI API Account](https://platform.openai.com/) with GPT-4o access
- [Twilio CLI](https://www.twilio.com/docs/twilio-cli/quickstart) installed
- Node.js and npm installed
- A mobile phone with conditional call forwarding support

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/mario-digital/personal_phone_assistant.git
cd personal_phone_assistant
npm install
```

### 2. Get a Twilio Phone Number

1. Log into your [Twilio Console](https://console.twilio.com)
2. Go to **Phone Numbers** → **Manage** → **Buy a number**
3. Choose a local number in your area
4. Note down this number - you'll need it for configuration

### 3. Configure Environment Variables

Create a `.env` file in the project root:

```bash
# API Keys
OPENAI_API_KEY=sk-your-openai-api-key-here
ELEVENLABS_API_KEY=sk-your-elevenlabs-api-key-here  # Optional: for even better voice quality

# Phone Numbers
TWILIO_PHONE_NUMBER=+1234567890    # Your Twilio number from step 2
MARIO_PHONE_NUMBER=+1987654321     # Your actual mobile number
```

### 4. Deploy to Twilio

```bash
# Login to Twilio CLI
twilio login

# Deploy the functions
twilio serverless:deploy
```

After deployment, note the domain URL (e.g., `https://your-app-1234-dev.twil.io`)

### 5. Configure Your Twilio Number

1. In Twilio Console, go to **Phone Numbers** → **Manage** → **Active numbers**
2. Click on your Twilio number
3. In **Voice Configuration**:
   - **A call comes in**: Webhook
   - **URL**: `https://your-app-domain.twil.io/functions/incoming`
   - **HTTP Method**: POST
4. Save configuration

### 6. Set Up Call Forwarding on Your Mobile Phone

Configure conditional call forwarding to forward unanswered calls to your Twilio number:

**For most carriers, dial:**
```
**61*YOUR_TWILIO_NUMBER*11*30#
```

Replace `YOUR_TWILIO_NUMBER` with your Twilio number (e.g., `**61*14806965200*11*30#`)

This forwards calls to Twilio if you don't answer within 30 seconds.

**To disable forwarding later:**
```
##61#
```

### 7. Test Your Setup

1. Have someone call your mobile number
2. Don't answer for 30+ seconds
3. The AI assistant should pick up and start a conversation
4. After the conversation ends, you should receive a callback with a summary

## Customization

### Changing the Assistant's Personality

Edit the system prompt in `functions/conversation.js`:

```javascript
content: `You are Zeeh, Mario's professional assistant. Be warm, conversational, and helpful.

Your goals:
1. Get the caller's name politely
2. Understand why they're calling Mario
3. Ask if it's urgent or if they can wait for a callback
4. If not urgent, offer to take a detailed message
5. Only end the conversation after you have all the info Mario needs

Keep responses natural and under 25 words.`
```

### Changing the Voice

In your function files, modify the voice settings:

```javascript
twiml.say({
  voice: 'Polly.Emma-Neural',  // Try: Polly.Joanna-Neural, Polly.Salli-Neural, etc.
  language: 'en-GB'           // or 'en-US'
}, 'Your message here');
```

### Changing the Assistant's Name

1. Update the greeting in `functions/ai.js`
2. Update the system prompt in `functions/conversation.js`
3. Update the voice summary message format

## Troubleshooting

### Common Issues

**"Application error occurred" during calls:**
- Check Twilio Console → Monitor → Logs for detailed error messages
- Ensure all environment variables are set correctly
- Verify your OpenAI API key has GPT-4o access

**Call forwarding not working:**
- Verify the forwarding code worked (you should hear a confirmation tone)
- Test by calling yourself and not answering
- Some carriers use different codes - check with your provider

**Assistant not calling back with summaries:**
- Check if your carrier is blocking calls from the Twilio number
- Register your Twilio number at [freecallerregistry.com](https://www.freecallerregistry.com)
- For T-Mobile, also register at [portal.firstorion.com](https://portal.firstorion.com)

**Voice sounds robotic:**
- Try different Polly voices (Emma, Joanna, Salli)
- For ultra-realistic voice, set up ElevenLabs integration

### Checking Logs

Monitor your functions in real-time:
```bash
twilio serverless:logs --tail
```

Or check in Twilio Console → Monitor → Logs → Voice

## Cost Estimates

**Twilio Costs (per call):**
- Phone number: ~$1/month
- Incoming calls: ~$0.0085/minute
- Outgoing summary calls: ~$0.0130/minute

**OpenAI Costs:**
- GPT-4o: ~$0.01-0.05 per conversation
- Total per call: typically under $0.10

## Advanced Features

### Enable ElevenLabs for Ultra-Realistic Voice

1. Sign up for [ElevenLabs](https://elevenlabs.io/)
2. Add your API key to `.env`
3. The system will automatically use ElevenLabs when available

### Custom Integrations

The assistant can be extended to:
- Schedule appointments in your calendar
- Send email summaries instead of voice calls
- Integrate with CRM systems
- Handle specific business workflows

## Security Notes

- Never commit your `.env` file to version control
- Regularly rotate your API keys
- Monitor usage in Twilio and OpenAI dashboards
- Consider enabling Twilio's call screening features for additional security

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
1. Check the troubleshooting section above
2. Review Twilio logs for error details
3. Open an issue on GitHub with logs and error messages

---

**Made with ❤️ for better phone call management**