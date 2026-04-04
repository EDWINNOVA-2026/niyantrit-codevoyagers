"""
Speech-to-Text Service

Backends supported (auto mode priority):
1. Faster-Whisper (local/offline, preferred)
2. OpenAI Whisper API (optional cloud fallback)
3. SpeechRecognition + pocketsphinx (optional offline fallback)
4. Google Cloud Speech-to-Text (optional, only if credentials are configured)
"""

import os
import tempfile
from typing import Optional

from dotenv import load_dotenv

load_dotenv()

# On Windows, Hugging Face cache symlink warnings are common when Developer Mode
# is disabled. Caching still works, so silence this warning by default.
if os.name == "nt":
    os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS_WARNING", "1")

# Keep Hugging Face hub logs quiet unless explicitly overridden.
os.environ.setdefault("HF_HUB_VERBOSITY", "error")

# Try to import Faster-Whisper (local preferred backend)
try:
    from faster_whisper import WhisperModel

    FASTER_WHISPER_AVAILABLE = True
except ImportError:
    FASTER_WHISPER_AVAILABLE = False
    WhisperModel = None

# Try to import OpenAI Whisper API client (optional)
try:
    from openai import OpenAI

    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    OpenAI = None

# Try to import SpeechRecognition (optional offline backend)
try:
    import speech_recognition as sr

    SPEECH_RECOGNITION_AVAILABLE = True
except ImportError:
    SPEECH_RECOGNITION_AVAILABLE = False

# Try to import Google Cloud (optional)
try:
    from google.cloud import speech_v1

    GOOGLE_CLOUD_AVAILABLE = True
except ImportError:
    GOOGLE_CLOUD_AVAILABLE = False


def _language_for_whisper(language_code: str) -> str:
    """Convert BCP-47 code (e.g., en-IN) to Whisper language token (en)."""
    if not language_code:
        return "en"
    return language_code.split("-")[0].lower()


def _guess_audio_extension(filename: Optional[str], content_type: Optional[str]) -> str:
    """Guess a useful extension so decoders can infer container/codec."""
    if filename:
        _, ext = os.path.splitext(filename)
        ext = ext.lower()
        if ext in {".wav", ".webm", ".ogg", ".mp3", ".m4a", ".flac", ".aac"}:
            return ext

    if content_type:
        mime_map = {
            "audio/wav": ".wav",
            "audio/x-wav": ".wav",
            "audio/webm": ".webm",
            "audio/ogg": ".ogg",
            "audio/mpeg": ".mp3",
            "audio/mp4": ".m4a",
            "audio/flac": ".flac",
            "audio/aac": ".aac",
        }
        return mime_map.get(content_type.lower(), ".wav")

    return ".wav"


def _write_temp_audio_file(
    audio_bytes: bytes, filename: Optional[str] = None, content_type: Optional[str] = None
) -> str:
    """Persist uploaded audio bytes to a temporary file and return its path."""
    suffix = _guess_audio_extension(filename, content_type)
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    tmp.write(audio_bytes)
    tmp.flush()
    tmp.close()
    return tmp.name


# Initialize OpenAI client (optional)
openai_client = None
if OPENAI_AVAILABLE and os.getenv("OPENAI_API_KEY"):
    try:
        openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    except Exception:
        openai_client = None


# Initialize Google client only when credentials are explicitly configured.
SPEECH_SERVICE_AVAILABLE = False
google_client = None
google_credentials_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
if GOOGLE_CLOUD_AVAILABLE and google_credentials_path and os.path.exists(google_credentials_path):
    try:
        google_client = speech_v1.SpeechClient()
        SPEECH_SERVICE_AVAILABLE = True
    except Exception as exc:
        print(f"Warning: Google Cloud Speech-to-Text initialization failed: {exc}")


# Lazily initialize Faster-Whisper model to avoid startup cost.
_faster_whisper_model = None


def _get_faster_whisper_model():
    """Load Faster-Whisper model lazily on first use."""
    global _faster_whisper_model

    if not FASTER_WHISPER_AVAILABLE:
        return None

    if _faster_whisper_model is None:
        model_name = os.getenv("FASTER_WHISPER_MODEL", "base")
        device = os.getenv("FASTER_WHISPER_DEVICE", "cpu")
        compute_type = os.getenv("FASTER_WHISPER_COMPUTE_TYPE", "int8")

        try:
            _faster_whisper_model = WhisperModel(
                model_name,
                device=device,
                compute_type=compute_type,
            )
            print(f"Faster-Whisper model loaded: {model_name} ({device}, {compute_type})")
        except Exception as exc:
            print(f"Faster-Whisper model initialization failed: {exc}")
            _faster_whisper_model = None

    return _faster_whisper_model


def transcribe_audio_faster_whisper(audio_file_path: str, language_code: str = "en-IN") -> Optional[str]:
    """Transcribe audio with local Faster-Whisper model."""
    model = _get_faster_whisper_model()
    if not model:
        return None

    try:
        segments, _ = model.transcribe(
            audio_file_path,
            language=_language_for_whisper(language_code),
            vad_filter=True,
            beam_size=5,
        )

        text_parts = [segment.text.strip() for segment in segments if segment.text and segment.text.strip()]
        text = " ".join(text_parts).strip()
        return text or None
    except Exception as exc:
        print(f"Faster-Whisper transcription failed: {exc}")
        return None


def transcribe_audio_whisper(audio_file_path: str) -> Optional[str]:
    """Transcribe audio with OpenAI Whisper API."""
    if not openai_client:
        return None

    try:
        with open(audio_file_path, "rb") as audio_file:
            transcript = openai_client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
            )
        return transcript.text
    except Exception as exc:
        print(f"OpenAI Whisper transcription failed: {exc}")
        return None


def transcribe_audio_speech_recognition(audio_file_path: str) -> Optional[str]:
    """Transcribe audio with SpeechRecognition + pocketsphinx."""
    if not SPEECH_RECOGNITION_AVAILABLE:
        return None

    _, ext = os.path.splitext(audio_file_path.lower())
    if ext not in {".wav", ".flac", ".aiff", ".aif"}:
        return None

    try:
        recognizer = sr.Recognizer()
        with sr.AudioFile(audio_file_path) as source:
            audio = recognizer.record(source)
        return recognizer.recognize_sphinx(audio)
    except Exception as exc:
        print(f"SpeechRecognition transcription failed: {exc}")
        return None


def _transcribe_google_cloud(audio_file_path: str, language_code: str = "en-IN") -> Optional[str]:
    """Internal helper: transcribe with Google Cloud Speech-to-Text."""
    if not SPEECH_SERVICE_AVAILABLE or not google_client:
        return None

    try:
        with open(audio_file_path, "rb") as audio_file:
            content = audio_file.read()

        ext = os.path.splitext(audio_file_path)[1].lower()
        encoding_map = {
            ".wav": speech_v1.RecognitionConfig.AudioEncoding.LINEAR16,
            ".mp3": speech_v1.RecognitionConfig.AudioEncoding.MP3,
            ".flac": speech_v1.RecognitionConfig.AudioEncoding.FLAC,
            ".ogg": speech_v1.RecognitionConfig.AudioEncoding.OGG_OPUS,
        }

        audio = speech_v1.RecognitionAudio(content=content)
        config = speech_v1.RecognitionConfig(
            encoding=encoding_map.get(ext, speech_v1.RecognitionConfig.AudioEncoding.LINEAR16),
            language_code=language_code,
            enable_automatic_punctuation=True,
        )
        response = google_client.recognize(config=config, audio=audio)

        text_parts = []
        for result in response.results:
            if result.alternatives:
                text_parts.append(result.alternatives[0].transcript)

        text = " ".join(text_parts).strip()
        return text or None
    except Exception as exc:
        print(f"Google Cloud transcription failed: {exc}")
        return None


def _auto_backends() -> list[str]:
    """Return enabled backends in preferred auto order."""
    backends = []
    if FASTER_WHISPER_AVAILABLE:
        backends.append("faster_whisper")
    if openai_client:
        backends.append("whisper")
    if SPEECH_RECOGNITION_AVAILABLE:
        backends.append("speech_recognition")
    if SPEECH_SERVICE_AVAILABLE:
        backends.append("google")
    return backends


def _transcribe_with_backend(backend: str, audio_file_path: str, language_code: str) -> Optional[str]:
    """Dispatch transcription to a specific backend."""
    if backend == "faster_whisper":
        return transcribe_audio_faster_whisper(audio_file_path, language_code)
    if backend == "whisper":
        return transcribe_audio_whisper(audio_file_path)
    if backend == "speech_recognition":
        return transcribe_audio_speech_recognition(audio_file_path)
    if backend == "google":
        return _transcribe_google_cloud(audio_file_path, language_code)
    return None


def transcribe_audio(audio_file_path: str, language_code: str = "en-IN", use_backend: str = "auto") -> Optional[str]:
    """Transcribe an audio file with the best available backend."""
    backends = _auto_backends() if use_backend == "auto" else [use_backend]

    if not backends:
        print("No speech-to-text backend available")
        print("Install/configure one of:")
        print("  1. faster-whisper (local, recommended)")
        print("  2. openai + OPENAI_API_KEY")
        print("  3. SpeechRecognition + pocketsphinx")
        print("  4. google-cloud-speech + GOOGLE_APPLICATION_CREDENTIALS")
        return None

    for backend in backends:
        result = _transcribe_with_backend(backend, audio_file_path, language_code)
        if result:
            print(f"Successfully transcribed using {backend}")
            return result

    print("All speech-to-text backends failed")
    return None


def transcribe_audio_stream(
    audio_bytes: bytes,
    language_code: str = "en-IN",
    use_backend: str = "auto",
    filename: Optional[str] = None,
    content_type: Optional[str] = None,
) -> Optional[str]:
    """Transcribe uploaded audio bytes using local-first fallback order."""
    if not audio_bytes:
        return None

    temp_audio_path = _write_temp_audio_file(audio_bytes, filename=filename, content_type=content_type)
    try:
        return transcribe_audio(temp_audio_path, language_code=language_code, use_backend=use_backend)
    finally:
        try:
            os.remove(temp_audio_path)
        except OSError:
            pass


def get_confidence_score(audio_file_path: str, language_code: str = "en-IN") -> Optional[float]:
    """Get confidence score when Google Cloud backend is configured."""
    if not SPEECH_SERVICE_AVAILABLE or not google_client:
        return None

    try:
        with open(audio_file_path, "rb") as audio_file:
            content = audio_file.read()

        audio = speech_v1.RecognitionAudio(content=content)
        config = speech_v1.RecognitionConfig(
            encoding=speech_v1.RecognitionConfig.AudioEncoding.LINEAR16,
            language_code=language_code,
        )

        response = google_client.recognize(config=config, audio=audio)
        if response.results and response.results[0].alternatives:
            return response.results[0].alternatives[0].confidence
        return None
    except Exception as exc:
        print(f"Error getting confidence score: {exc}")
        return None
