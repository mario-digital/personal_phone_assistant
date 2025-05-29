# Personal AI Phone Assistant

An intelligent phone assistant that answers your calls when you're unavailable, conducts natural conversations with callers, gathers their information, and leaves you voice message summaries.

## Features

- 🤖 **AI-Powered Conversations**: Uses OpenAI GPT-4o to conduct natural, human-like phone conversations
- 📞 **Smart Call Routing**: Conditionally forwards calls only when you don't answer
- 🎭 **Professional Assistant Persona**: Acts as your personal assistant "Zee" 
- 📝 **Intelligent Information Gathering**: Asks for caller's name, reason for calling, and urgency
- 🔊 **Voice Summaries**: Calls you back with a spoken summary of the conversation
- 🎵 **High-Quality Voice**: Uses ElevenLabs integration for ultra-realistic voice synthesis
- ⚡ **Serverless Architecture**: Built on Twilio Functions for reliability and scalability
- 🔄 **Automatic Fallbacks**: Gracefully handles API failures with Polly voice backup
- 📱 **SMS Backup**: Sends text summaries if voice callbacks fail

## Architecture

The system consists of two main components:

1. **Main Phone Assistant** (Twilio Functions) - Handles call logic and conversation flow
2. **TTS Service** (Vercel) - Provides high-quality voice synthesis via ElevenLabs

## Demo

When someone calls your number:
1. If you don't answer within 30 seconds, the call forwards to your AI assistant
2. Zee introduces herself and asks how she can help
3. She conducts a natural conversation to gather information
4. After the call ends, she calls you back with a voice summary
5. If you don't answer the summary call, you get an SMS backup

## Prerequisites

- [Twilio Account](https://www.twilio.com/) (free tier works)
- [OpenAI API Account](https://platform.openai.com/) with GPT-4o access
- [ElevenLabs Account](https://elevenlabs.io/) for premium voice quality
- [Vercel Account](https://vercel.com/) for TTS service deployment
- [Twilio CLI](https://www.twilio.com/docs/twilio-cli/quickstart) installed
- Node.js 20+ and npm installed
- A mobile phone with conditional call forwarding support

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/mario-digital/personal_phone_assistant.git
cd personal_phone_assistant
npm install
```

### 2. Deploy the TTS Service (Vercel)

First, deploy the text-to-speech service:

```bash
# Clone the TTS service (separate repo)
git clone https://github.com/mario-digital/phone-assistant-tts.git
cd phone-assistant-tts

# Deploy to Vercel
npm install -g vercel
vercel login
vercel --prod

# Note the deployment URL (e.g., https://your-tts-app.vercel.app)
```

### 3. Get a Twilio Phone Number

1. Log into your [Twilio Console](https://console.twilio.com)
2. Go to **Phone Numbers** → **Manage** → **Buy a number**
3. Choose a local number in your area
4. Note down this number - you'll need it for configuration

### 4. Configure Environment Variables

Create a `.env` file in the project root:

```bash
# API Keys
OPENAI_API_KEY=sk-your-openai-api-key-here
ELEVENLABS_API_KEY=sk-your-elevenlabs-api-key-here

# OpenAI Configuration
OPENAI_MODEL=gpt-4o
OPENAI_MAX_TOKENS=100
OPENAI_TEMPERATURE=0.8

# Phone Numbers
TWILIO_PHONE_NUMBER=+1234567890    # Your Twilio number from step 3
MAIN_PHONE_NUMBER=+1987654321      # Your actual mobile number

# TTS Configuration
TTS_MODE=vercel                    # or 'local' for development
VERCEL_TTS_URL=https://your-tts-app.vercel.app  # From step 2
LOCAL_TTS_URL=https://your-ngrok-url.ngrok-free.app  # For local development

# ElevenLabs Voice Settings
ELEVENLABS_VOICE_ID=pqHfZKP75CvOlQylNhV4  # Default voice, can be customized
```

### 5. Deploy to Twilio

```bash
# Login to Twilio CLI
twilio login

# Deploy the functions
npm run deploy
```

After deployment, note the domain URL (e.g., `https://your-app-1234-dev.twil.io`)

### 6. Configure Your Twilio Number

1. In Twilio Console, go to **Phone Numbers** → **Manage** → **Active numbers**
2. Click on your Twilio number
3. In **Voice Configuration**:
   - **A call comes in**: Webhook
   - **URL**: `https://your-app-domain.twil.io/functions/incoming`
   - **HTTP Method**: POST
4. Save configuration

### 7. Set Up Call Forwarding on Your Mobile Phone

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

**Carrier-Specific Codes:**
- **Verizon**: `*71YOUR_TWILIO_NUMBER` (to enable), `*73` (to disable)
- **AT&T**: Same as above
- **T-Mobile**: `**004*YOUR_TWILIO_NUMBER#` (all), `##004#` (disable)

### 8. Test Your Setup

1. Have someone call your mobile number
2. Don't answer for 30+ seconds
3. The AI assistant should pick up and start a conversation
4. After the conversation ends, you should receive a callback with a summary
5. If you miss the callback, you'll get an SMS summary

## Customization

### Changing the Assistant's Personality

Edit the system prompt in `src/functions/conversation.js`:

```javascript
const systemMessage = `You are Zee, Mario's professional assistant. Be warm, conversational, and helpful.

Your goals:
1. Get the caller's name politely
2. Understand why they're calling Mario
3. Ask if it's urgent or if they can wait for a callback
4. If not urgent, offer to take a detailed message
5. Only end the conversation after you have all the info Mario needs

Keep responses natural and under 25 words.`;
```

### Changing the Voice

**ElevenLabs Voices (Premium):**
1. Visit [ElevenLabs Voice Library](https://elevenlabs.io/voice-library)
2. Find a voice you like and copy its ID
3. Update `ELEVENLABS_VOICE_ID` in your `.env` file

**Polly Voices (Fallback):**
```javascript
twiml.say({
  voice: 'Polly.Emma-Neural',  // Try: Polly.Joanna-Neural, Polly.Salli-Neural, etc.
  language: 'en-GB'           // or 'en-US'
}, 'Your message here');
```

### Conversation Flow Settings

Adjust conversation behavior in `config.js`:

```javascript
// OpenAI Configuration
openai: {
  model: 'gpt-4o',
  maxTokens: 100,      // Longer responses = higher tokens
  temperature: 0.8     // Lower = more consistent, Higher = more creative
}
```

### TTS Mode Switching

Switch between local development and production:

```bash
# For development with ngrok
TTS_MODE=local

# For production with Vercel
TTS_MODE=vercel
```

## Troubleshooting

### Common Issues

**"Application error occurred" during calls:**
- Check Twilio Console → Monitor → Logs for detailed error messages
- Ensure all environment variables are set correctly
- Verify your OpenAI API key has GPT-4o access
- Check that your Vercel TTS service is deployed and responding

**Voice sounds robotic or British accent appears:**
- Verify ElevenLabs API key is working
- Check TTS service logs in Vercel dashboard
- Ensure `VERCEL_TTS_URL` points to correct deployment
- The system uses Polly as fallback when ElevenLabs fails

**Call forwarding not working:**
- Verify the forwarding code worked (you should hear a confirmation tone)
- Test by calling yourself and not answering
- Some carriers use different codes - check with your provider
- Try the carrier-specific codes listed above

**Assistant not calling back with summaries:**
- Check if your carrier is blocking calls from the Twilio number
- Register your Twilio number at [freecallerregistry.com](https://www.freecallerregistry.com)
- For T-Mobile, also register at [portal.firstorion.com](https://portal.firstorion.com)
- Check SMS backup messages if voice calls fail

**Continuous callback loops:**
- Check Twilio logs for callback failures
- The system now prevents loops with attempt tracking
- SMS backup should trigger if voice calls repeatedly fail

### Checking Logs

**Twilio Logs:**
```bash
twilio serverless:logs --tail
```

Or check in Twilio Console → Monitor → Logs → Voice

**Vercel TTS Logs:**
Check the Vercel dashboard for your TTS deployment

**Environment Variable Check:**
```bash
# Test TTS service directly
curl "https://your-tts-app.vercel.app/api/tts?text=Hello%20test"
```

## Cost Estimates

**Twilio Costs (per call):**
- Phone number: ~$1/month
- Incoming calls: ~$0.0085/minute
- Outgoing summary calls: ~$0.0130/minute
- SMS backup: ~$0.0075/message

**OpenAI Costs:**
- GPT-4o: ~$0.01-0.05 per conversation

**ElevenLabs Costs:**
- ~$0.18 per 1,000 characters
- Typical conversation: ~$0.02-0.10

**Total per call: typically $0.05-0.20**

## Development

### Local Development Setup

1. **Start TTS service locally:**
```bash
cd phone-assistant-tts
npm run dev  # Starts on port 3000
```

2. **Expose with ngrok:**
```bash
ngrok http 3000
# Copy the https URL to LOCAL_TTS_URL
```

3. **Set development mode:**
```bash
TTS_MODE=local
```

4. **Deploy and test:**
```bash
npm run deploy
```

### File Structure

```
personal_phone_assistant/
├── src/
│   ├── functions/
│   │   ├── ai.js              # Initial greeting
│   │   ├── conversation.js    # Main conversation logic
│   │   ├── voice-summary.js   # Voice callback handler
│   │   ├── callback-status.js # Callback status tracking
│   │   └── incoming.js        # Call routing
│   └── assets/               # Static assets
├── package.json              # Dependencies
├── .env                      # Environment variables (create this)
└── README.md
```

## Advanced Features

### Custom Voice Training

1. Upload voice samples to ElevenLabs
2. Train a custom voice model
3. Update `ELEVENLABS_VOICE_ID` with your custom voice

### Business Integrations

The assistant can be extended to:
- **Calendar Integration**: Check availability and schedule appointments
- **CRM Integration**: Log calls and update contact records  
- **Email Summaries**: Send detailed email reports instead of voice calls
- **Slack Notifications**: Send summaries to team channels
- **Custom Workflows**: Handle industry-specific requirements

### Advanced Conversation Logic

Customize conversation ending, urgency detection, and routing in `conversation.js`.

## Security & Privacy

- **API Keys**: Never commit your `.env` file to version control
- **Call Encryption**: All calls use Twilio's encrypted infrastructure
- **Data Retention**: Conversations are stored temporarily in memory only
- **Access Control**: Consider IP whitelisting for webhook endpoints
- **Monitoring**: Regularly check usage in Twilio and OpenAI dashboards

## Monitoring & Analytics

### Key Metrics to Track

- **Call Volume**: Number of calls handled per day/week
- **Conversation Length**: Average duration and complexity
- **Summary Delivery Success**: Voice vs SMS backup ratios
- **API Costs**: Track OpenAI and ElevenLabs usage
- **Error Rates**: Monitor failed calls and API errors

### Alerts Setup

Consider setting up alerts for:
- High error rates in Twilio functions
- API quota limits approaching
- Unusual call volume spikes
- TTS service downtime

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and test thoroughly
4. Update documentation if needed
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:

1. **Check troubleshooting section** above
2. **Review logs** in Twilio Console and Vercel Dashboard  
3. **Test individual components**:
   - TTS service: `curl "https://your-tts-app.vercel.app/api/health"`
   - OpenAI API: Check your usage dashboard
4. **Open an issue** on GitHub with:
   - Complete error logs
   - Environment setup details
   - Steps to reproduce

## Roadmap

**Upcoming Features:**
- [ ] Web dashboard for call management
- [ ] Multi-language support
- [ ] Advanced caller screening
- [ ] Integration with popular CRM systems
- [ ] Voice analytics and insights
- [ ] Custom conversation templates

---

**Made with ❤️ for better phone call management**

> **Note**: This project requires two repositories - the main assistant logic (this repo) and the TTS service. Make sure to deploy both components for full functionality.