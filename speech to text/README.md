# 🎙️ Voice-to-Text Telegram Bot

A Telegram bot that converts voice messages and audio files to text using **local OpenAI Whisper**.  
Supports **99+ languages** with Arabic as the default.

## ✨ Features

- 🎤 **Voice Messages** — Send a voice note, get text back
- 🎵 **Audio Files** — Supports .mp3, .wav, .ogg, .m4a, .flac, .aac
- 🌍 **99+ Languages** — Auto-detect or set manually
- 🇸🇦 **Arabic Default** — Optimized for Arabic transcription
- 📢 **Channel Link** — Promote your Telegram channel
- ⚡ **Local Processing** — No API costs, runs on your machine

## 🚀 Setup

### Prerequisites

1. **Python 3.10+**
2. **FFmpeg** — Required for audio conversion
   - Windows: Download from [ffmpeg.org](https://ffmpeg.org/download.html) and add to PATH
   - Or: `winget install FFmpeg`
3. **Telegram Bot Token** — Get from [@BotFather](https://t.me/BotFather)

### Installation

```bash
# 1. Navigate to the project
cd "speech to text"

# 2. Create virtual environment (recommended)
python -m venv venv
venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Edit .env with your settings
# - Add your bot token
# - Set channel link (optional)
# - Choose Whisper model size

# 5. Run the bot
python bot.py
```

### Whisper Models

| Model | Size | Speed | Accuracy | RAM |
|-------|------|-------|----------|-----|
| `tiny` | 39 MB | ⚡⚡⚡⚡ | ★★☆☆☆ | ~1 GB |
| `base` | 74 MB | ⚡⚡⚡ | ★★★☆☆ | ~1 GB |
| `small` | 244 MB | ⚡⚡ | ★★★★☆ | ~2 GB |
| `medium` | 769 MB | ⚡ | ★★★★★ | ~5 GB |
| `large` | 1550 MB | 🐢 | ★★★★★ | ~10 GB |

Set in `.env`: `WHISPER_MODEL=base`

## 📋 Bot Commands

| Command | Description |
|---------|-------------|
| `/start` | Welcome message |
| `/help` | Help & tips |
| `/lang` | Show/change language |
| `/lang ar` | Set Arabic |
| `/lang en` | Set English |
| `/lang auto` | Auto-detect |

## 📁 Project Structure

```
speech to text/
├── bot.py           # Main bot logic
├── transcriber.py   # Whisper transcription module
├── config.py        # Configuration & env loading
├── .env             # Your secrets (gitignored)
├── .env.example     # Template for .env
├── requirements.txt # Python dependencies
├── .gitignore       # Git ignore rules
└── README.md        # This file
```

## 🛠️ Troubleshooting

- **"FFmpeg not found"** → Install FFmpeg and add to system PATH
- **Slow transcription** → Use a smaller model (`tiny` or `base`)
- **Out of memory** → Use a smaller model or close other apps
- **Bot not responding** → Check your bot token and internet connection
