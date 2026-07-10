"""
Transcriber module — Uses local OpenAI Whisper for speech-to-text.
Supports 99+ languages with automatic language detection.
"""

import os
import logging
import whisper
from config import WHISPER_MODEL, SUPPORTED_LANGUAGES

logger = logging.getLogger(__name__)

# Global model variable — loaded once on first use
_model = None


def _get_model():
    """Load the Whisper model (lazy loading — only on first call)."""
    global _model
    if _model is None:
        logger.info(f"🔄 Loading Whisper model: '{WHISPER_MODEL}' (this may take a moment)...")
        _model = whisper.load_model(WHISPER_MODEL)
        logger.info(f"✅ Whisper model '{WHISPER_MODEL}' loaded successfully!")
    return _model


def transcribe_audio(file_path: str, language: str = None) -> dict:
    """
    Transcribe an audio file using local Whisper.

    Args:
        file_path: Path to the audio file (.mp3, .wav, .ogg, etc.)
        language: Optional language code (e.g., 'en', 'ar', 'fr').
                  If None, Whisper auto-detects the language.

    Returns:
        dict with keys:
            - "text": The transcribed text
            - "language": Detected/used language code
            - "language_name": Human-readable language name
            - "success": True if transcription succeeded
            - "error": Error message if failed
    """
    try:
        if not os.path.exists(file_path):
            return {
                "text": "",
                "language": "",
                "language_name": "",
                "success": False,
                "error": "Audio file not found."
            }

        model = _get_model()

        # Build transcription options
        options = {}
        if language and language != "auto":
            options["language"] = language
            logger.info(f"🌍 Transcribing with language: {language}")
        else:
            logger.info("🌍 Transcribing with auto-detect language...")

        # Run transcription
        logger.info(f"🎙️ Transcribing: {file_path}")
        result = model.transcribe(file_path, **options)

        detected_lang = result.get("language", "unknown")
        lang_name = SUPPORTED_LANGUAGES.get(detected_lang, detected_lang.capitalize())
        text = result.get("text", "").strip()

        if not text:
            return {
                "text": "",
                "language": detected_lang,
                "language_name": lang_name,
                "success": False,
                "error": "No speech detected in the audio."
            }

        logger.info(f"✅ Transcription complete — Language: {lang_name}, Length: {len(text)} chars")

        return {
            "text": text,
            "language": detected_lang,
            "language_name": lang_name,
            "success": True,
            "error": None
        }

    except Exception as e:
        logger.error(f"❌ Transcription error: {e}", exc_info=True)
        return {
            "text": "",
            "language": "",
            "language_name": "",
            "success": False,
            "error": f"Transcription failed: {str(e)}"
        }
