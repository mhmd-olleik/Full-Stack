"""
🎙️ Voice-to-Text Telegram Bot
Converts voice messages and audio files to text using local Whisper.
Supports 99+ languages — default: Arabic.
"""

import os
import logging
import uuid
import asyncio
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import (
    ApplicationBuilder,
    CommandHandler,
    MessageHandler,
    CallbackQueryHandler,
    ContextTypes,
    filters,
)
from telegram.request import HTTPXRequest
from pydub import AudioSegment
from config import (
    TELEGRAM_BOT_TOKEN,
    WHISPER_MODEL,
    DEFAULT_LANGUAGE,
    CHANNEL_LINK,
    CHANNEL_NAME,
    TEMP_DIR,
    SUPPORTED_LANGUAGES,
    PROXY_URL,
)
from transcriber import transcribe_audio

# === Logging ===
logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)

# === User preferences (in-memory) ===
user_languages = {}  # {user_id: language_code}


# ─────────────────────────────────────────────
# Command Handlers
# ─────────────────────────────────────────────

async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /start command."""
    user = update.effective_user
    welcome_text = (
        f"مرحباً {user.first_name}! 👋\n"
        f"Welcome to the **Voice-to-Text Bot** 🎙️\n\n"
        f"🔹 Send me a **voice message** or **audio file** and I'll convert it to text!\n"
        f"🔹 I support **99+ languages** with auto-detection.\n"
        f"🔹 Default language: **Arabic** 🇸🇦\n\n"
        f"📋 **Commands:**\n"
        f"/start — Show this message\n"
        f"/help — Detailed help & tips\n"
        f"/lang — Change transcription language\n"
        f"/lang ar — Set to Arabic\n"
        f"/lang en — Set to English\n"
        f"/lang auto — Auto-detect language\n"
    )

    if CHANNEL_LINK:
        welcome_text += f"\n📢 Join our channel: [{CHANNEL_NAME}]({CHANNEL_LINK})"

    keyboard = []
    if CHANNEL_LINK:
        keyboard.append([InlineKeyboardButton(f"📢 {CHANNEL_NAME}", url=CHANNEL_LINK)])
    keyboard.append([InlineKeyboardButton("🇸🇦 عربي", callback_data="setlang_ar"),
                     InlineKeyboardButton("🇬🇧 English", callback_data="setlang_en"),
                     InlineKeyboardButton("🌍 Auto", callback_data="setlang_auto")])

    reply_markup = InlineKeyboardMarkup(keyboard) if keyboard else None

    await update.message.reply_text(
        welcome_text,
        parse_mode="Markdown",
        reply_markup=reply_markup,
    )


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /help command."""
    user_id = update.effective_user.id
    current_lang = user_languages.get(user_id, DEFAULT_LANGUAGE)
    lang_name = SUPPORTED_LANGUAGES.get(current_lang, current_lang)

    help_text = (
        "📖 **Voice-to-Text Bot — Help** 🎙️\n\n"
        "**How to use:**\n"
        "1️⃣ Send a voice message 🎤 or audio file 🎵\n"
        "2️⃣ Wait a few seconds ⏳\n"
        "3️⃣ Get the transcription as text! ✅\n\n"
        "**Commands:**\n"
        "• `/start` — Welcome message\n"
        "• `/help` — This help message\n"
        "• `/lang <code>` — Set language\n"
        "• `/lang auto` — Auto-detect (default)\n"
        "• `/lang ar` — Arabic 🇸🇦\n"
        "• `/lang en` — English 🇬🇧\n"
        "• `/lang fr` — French 🇫🇷\n"
        "• `/lang de` — German 🇩🇪\n\n"
        f"🌍 **Your current language:** {lang_name} (`{current_lang}`)\n"
        f"🤖 **Whisper model:** `{WHISPER_MODEL}`\n\n"
        "**Supported formats:** Voice notes, .mp3, .wav, .ogg, .m4a, .flac\n"
        "**Supported languages:** 99+ languages!\n\n"
        "💡 **Tip:** For best results, speak clearly and minimize background noise."
    )

    await update.message.reply_text(help_text, parse_mode="Markdown")


async def lang_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /lang command to set transcription language."""
    user_id = update.effective_user.id

    if context.args and len(context.args) > 0:
        lang_code = context.args[0].lower().strip()

        if lang_code not in SUPPORTED_LANGUAGES:
            # Show some popular languages
            popular = (
                "**Popular language codes:**\n"
                "• `ar` — Arabic 🇸🇦\n"
                "• `en` — English 🇬🇧\n"
                "• `fr` — French 🇫🇷\n"
                "• `de` — German 🇩🇪\n"
                "• `es` — Spanish 🇪🇸\n"
                "• `tr` — Turkish 🇹🇷\n"
                "• `ru` — Russian 🇷🇺\n"
                "• `zh` — Chinese 🇨🇳\n"
                "• `ja` — Japanese 🇯🇵\n"
                "• `ko` — Korean 🇰🇷\n"
                "• `hi` — Hindi 🇮🇳\n"
                "• `auto` — Auto-detect 🌍\n"
            )
            await update.message.reply_text(
                f"❌ Unknown language code: `{lang_code}`\n\n{popular}",
                parse_mode="Markdown"
            )
            return

        user_languages[user_id] = lang_code
        lang_name = SUPPORTED_LANGUAGES[lang_code]
        await update.message.reply_text(
            f"✅ Language set to **{lang_name}** (`{lang_code}`)",
            parse_mode="Markdown"
        )
    else:
        # Show current language and quick-set buttons
        current = user_languages.get(user_id, DEFAULT_LANGUAGE)
        lang_name = SUPPORTED_LANGUAGES.get(current, current)

        keyboard = [
            [
                InlineKeyboardButton("🇸🇦 عربي", callback_data="setlang_ar"),
                InlineKeyboardButton("🇬🇧 English", callback_data="setlang_en"),
                InlineKeyboardButton("🇫🇷 Français", callback_data="setlang_fr"),
            ],
            [
                InlineKeyboardButton("🇩🇪 Deutsch", callback_data="setlang_de"),
                InlineKeyboardButton("🇪🇸 Español", callback_data="setlang_es"),
                InlineKeyboardButton("🇹🇷 Türkçe", callback_data="setlang_tr"),
            ],
            [
                InlineKeyboardButton("🌍 Auto-detect", callback_data="setlang_auto"),
            ],
        ]

        await update.message.reply_text(
            f"🌍 **Current language:** {lang_name} (`{current}`)\n\n"
            "Choose a language or use `/lang <code>`:",
            parse_mode="Markdown",
            reply_markup=InlineKeyboardMarkup(keyboard),
        )


async def lang_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle inline button presses for language selection."""
    query = update.callback_query
    await query.answer()

    lang_code = query.data.replace("setlang_", "")
    user_id = query.from_user.id
    user_languages[user_id] = lang_code
    lang_name = SUPPORTED_LANGUAGES.get(lang_code, lang_code)

    await query.edit_message_text(
        f"✅ Language set to **{lang_name}** (`{lang_code}`)",
        parse_mode="Markdown",
    )


# ─────────────────────────────────────────────
# Voice & Audio Handlers
# ─────────────────────────────────────────────

async def handle_voice(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle incoming voice messages."""
    user_id = update.effective_user.id
    msg = await update.message.reply_text("🎙️ جاري تحويل الصوت إلى نص...\n⏳ Processing voice message...")

    file_id = update.message.voice.file_id
    duration = update.message.voice.duration

    # Warn if audio is very long
    if duration and duration > 300:
        await msg.edit_text(
            "🎙️ جاري تحويل الصوت إلى نص...\n"
            f"⏳ Audio is {duration}s long — this may take a while..."
        )

    ogg_path = None
    mp3_path = None
    try:
        # Download the voice file
        unique_id = str(uuid.uuid4())[:8]
        ogg_path = os.path.join(TEMP_DIR, f"voice_{unique_id}.ogg")
        mp3_path = os.path.join(TEMP_DIR, f"voice_{unique_id}.mp3")

        new_file = await context.bot.get_file(file_id)
        await new_file.download_to_drive(custom_path=ogg_path)
        logger.info(f"Downloaded voice file: {ogg_path}")

        # Convert OGG to MP3
        audio = AudioSegment.from_ogg(ogg_path)
        audio.export(mp3_path, format="mp3")
        logger.info(f"Converted to MP3: {mp3_path}")

        # Get user's preferred language
        lang = user_languages.get(user_id, DEFAULT_LANGUAGE)

        # Transcribe
        result = transcribe_audio(mp3_path, language=lang if lang != "auto" else None)

        if result["success"]:
            response = (
                f"📝 **النص | Transcription:**\n\n"
                f"{result['text']}\n\n"
                f"🌍 **اللغة | Language:** {result['language_name']} (`{result['language']}`)"
            )
            if duration:
                response += f"\n⏱️ **المدة | Duration:** {duration}s"
        else:
            response = f"❌ **خطأ | Error:** {result['error']}"

        await msg.edit_text(response, parse_mode="Markdown")

    except Exception as e:
        logger.error(f"Error processing voice: {e}", exc_info=True)
        await msg.edit_text(f"❌ An error occurred:\n`{str(e)}`", parse_mode="Markdown")

    finally:
        # Cleanup temp files
        for path in [ogg_path, mp3_path]:
            if path and os.path.exists(path):
                try:
                    os.remove(path)
                except OSError:
                    pass


async def handle_audio(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle incoming audio files (mp3, wav, etc. sent as documents or audio)."""
    user_id = update.effective_user.id
    msg = await update.message.reply_text("🎵 جاري تحويل الملف الصوتي إلى نص...\n⏳ Processing audio file...")

    # Get file from either audio or document
    if update.message.audio:
        file_id = update.message.audio.file_id
        file_name = update.message.audio.file_name or "audio"
        duration = update.message.audio.duration
    elif update.message.document:
        file_id = update.message.document.file_id
        file_name = update.message.document.file_name or "document"
        duration = None
    else:
        await msg.edit_text("❌ Could not process this file.")
        return

    # Check file extension
    ext = os.path.splitext(file_name)[1].lower()
    supported_exts = {".mp3", ".wav", ".ogg", ".oga", ".m4a", ".flac", ".wma", ".aac", ".opus"}
    if ext and ext not in supported_exts:
        await msg.edit_text(
            f"❌ Unsupported file format: `{ext}`\n"
            f"✅ Supported: {', '.join(supported_exts)}",
            parse_mode="Markdown"
        )
        return

    input_path = None
    mp3_path = None
    try:
        unique_id = str(uuid.uuid4())[:8]
        input_path = os.path.join(TEMP_DIR, f"audio_{unique_id}{ext or '.ogg'}")
        mp3_path = os.path.join(TEMP_DIR, f"audio_{unique_id}.mp3")

        new_file = await context.bot.get_file(file_id)
        await new_file.download_to_drive(custom_path=input_path)
        logger.info(f"Downloaded audio file: {input_path}")

        # Convert to MP3 if not already
        if ext != ".mp3":
            audio = AudioSegment.from_file(input_path)
            audio.export(mp3_path, format="mp3")
            logger.info(f"Converted to MP3: {mp3_path}")
        else:
            mp3_path = input_path

        # Get user's preferred language
        lang = user_languages.get(user_id, DEFAULT_LANGUAGE)

        # Transcribe
        result = transcribe_audio(mp3_path, language=lang if lang != "auto" else None)

        if result["success"]:
            response = (
                f"📝 **النص | Transcription:**\n\n"
                f"{result['text']}\n\n"
                f"🌍 **اللغة | Language:** {result['language_name']} (`{result['language']}`)"
            )
            if duration:
                response += f"\n⏱️ **المدة | Duration:** {duration}s"
        else:
            response = f"❌ **خطأ | Error:** {result['error']}"

        await msg.edit_text(response, parse_mode="Markdown")

    except Exception as e:
        logger.error(f"Error processing audio: {e}", exc_info=True)
        await msg.edit_text(f"❌ An error occurred:\n`{str(e)}`", parse_mode="Markdown")

    finally:
        for path in [input_path, mp3_path]:
            if path and os.path.exists(path):
                try:
                    os.remove(path)
                except OSError:
                    pass


# ─────────────────────────────────────────────
# Error Handler
# ─────────────────────────────────────────────

async def error_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Log errors."""
    logger.error(f"Update {update} caused error: {context.error}", exc_info=context.error)


# ─────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────

def main():
    """Start the bot."""
    print("=" * 50)
    print("🎙️  Voice-to-Text Telegram Bot")
    print(f"🤖  Whisper Model: {WHISPER_MODEL}")
    print(f"🌍  Default Language: {DEFAULT_LANGUAGE} ({SUPPORTED_LANGUAGES.get(DEFAULT_LANGUAGE, 'Unknown')})")
    if CHANNEL_LINK:
        print(f"📢  Channel: {CHANNEL_LINK}")
    if PROXY_URL:
        print(f"🔒  Proxy: {PROXY_URL}")
    print("=" * 50)
    print("🚀 Starting bot...")

    # Build app with proxy if configured
    builder = ApplicationBuilder().token(TELEGRAM_BOT_TOKEN).connect_timeout(30).read_timeout(30).write_timeout(30)
    if PROXY_URL:
        request = HTTPXRequest(proxy=PROXY_URL, connect_timeout=30, read_timeout=30, write_timeout=30)
        builder = builder.request(request).get_updates_request(request)
    app = builder.build()

    # Command handlers
    app.add_handler(CommandHandler("start", start_command))
    app.add_handler(CommandHandler("help", help_command))
    app.add_handler(CommandHandler("lang", lang_command))

    # Callback query handler (inline buttons)
    app.add_handler(CallbackQueryHandler(lang_callback, pattern="^setlang_"))

    # Voice message handler
    app.add_handler(MessageHandler(filters.VOICE, handle_voice))

    # Audio file handler
    app.add_handler(MessageHandler(filters.AUDIO, handle_audio))

    # Document handler (for audio files sent as documents)
    audio_doc_filter = filters.Document.MimeType("audio/mpeg") | \
                       filters.Document.MimeType("audio/wav") | \
                       filters.Document.MimeType("audio/ogg") | \
                       filters.Document.MimeType("audio/flac") | \
                       filters.Document.MimeType("audio/mp4") | \
                       filters.Document.MimeType("audio/x-m4a") | \
                       filters.Document.MimeType("audio/aac")
    app.add_handler(MessageHandler(audio_doc_filter, handle_audio))

    # Error handler
    app.add_error_handler(error_handler)

    print("✅ Bot is running! Send a voice message to transcribe.")
    print("   Press Ctrl+C to stop.\n")

    # Python 3.14+ requires explicit event loop creation
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    app.run_polling(drop_pending_updates=True)


if __name__ == "__main__":
    main()
