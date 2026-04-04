"""
Speech-to-Text Service
Multiple backends supported:
1. OpenAI Whisper (recommended - free, offline-capable)
2. SpeechRecognition + pocketsphinx (free, offline)
3. Google Cloud Speech-to-Text (optional, requires credentials)
"""
import os
from typing import Optional
from dotenv import load_dotenv

# Try to import Google Cloud (optional)
try:
    from google.cloud import speech_v1
    GOOGLE_CLOUD_AVAILABLE = True
except ImportError:
    GOOGLE_CLOUD_AVAILABLE = False

# Try to import OpenAI Whisper (recommended fallback)
try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    OpenAI = None

# Initialize OpenAI client if available
openai_client = None
if OPENAI_AVAILABLE and os.getenv("OPENAI_API_KEY"):
    try:
        openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    except Exception:
        openai_client = None

# Try to import SpeechRecognition (free offline alternative)
try:
    import speech_recognition as sr
    SPEECH_RECOGNITION_AVAILABLE = True
except ImportError:
    SPEECH_RECOGNITION_AVAILABLE = False

load_dotenv()

# Initialize Google Cloud Speech client if available
SPEECH_SERVICE_AVAILABLE = False
if GOOGLE_CLOUD_AVAILABLE:
    try:
        client = speech_v1.SpeechClient()
        SPEECH_SERVICE_AVAILABLE = True
    except Exception as e:
        print(f"Warning: Google Cloud Speech-to-Text not available: {e}")

# ======================== ALTERNATIVE BACKENDS ========================

def transcribe_audio_whisper(audio_file_path: str) -> Optional[str]:
    """
    Transcribe using OpenAI Whisper (free, offline-capable).
    Recommended alternative when Google Cloud is unavailable.
    
    Args:
        audio_file_path: Path to audio file
        
    Returns:
        Transcribed text or None if transcription fails
    """
    if not openai_client:
        return None
    
    try:
        with open(audio_file_path, "rb") as audio_file:
            transcript = openai_client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file
            )
            return transcript.text
    except Exception as e:
        print(f"Error with Whisper transcription: {e}")
        return None

def transcribe_audio_speech_recognition(audio_file_path: str) -> Optional[str]:
    """
    Transcribe using SpeechRecognition library (free, offline, no API key needed).
    
    Install: pip install SpeechRecognition pocketsphinx
    
    Args:
        audio_file_path: Path to audio file (WAV, AIFF, FLAC, OGG)
        
    Returns:
        Transcribed text or None if transcription fails
    """
    if not SPEECH_RECOGNITION_AVAILABLE:
        return None
    
    try:
        recognizer = sr.Recognizer()
        
        # Load audio file based on extension
        file_ext = os.path.splitext(audio_file_path)[1].lower()
        
        if file_ext == ".wav":
            with sr.AudioFile(audio_file_path) as source:
                audio = recognizer.record(source)
        elif file_ext == ".flac":
            with sr.AudioFile(audio_file_path) as source:
                audio = recognizer.record(source)
        else:
            print(f"Unsupported format: {file_ext}. Supported: .wav, .flac, .aiff, .ogg")
            return None
        
        # Use pocketsphinx for offline recognition (no internet needed)
        text = recognizer.recognize_sphinx(audio)
        return text
        
    except Exception as e:
        print(f"Error with SpeechRecognition transcription: {e}")
        return None

# ======================== MAIN TRANSCRIPTION FUNCTION ========================

def transcribe_audio(audio_file_path: str, language_code: str = "en-IN", use_backend: str = "auto") -> Optional[str]:
    """
    Transcribe audio file to text using best available backend.
    
    Backends (in order of preference when use_backend="auto"):
    1. Google Cloud Speech-to-Text (requires GOOGLE_APPLICATION_CREDENTIALS)
    2. OpenAI Whisper (requires OPENAI_API_KEY)
    3. SpeechRecognition with pocketsphinx (free, offline, no API key needed)
    
    Args:
        audio_file_path: Path to audio file
        language_code: BCP-47 language code (only used for Google Cloud)
        use_backend: Which backend to use ("auto", "google", "whisper", "speech_recognition")
        
    Returns:
        Transcribed text or None if transcription fails
    """
    
    # Try backends in order
    backends = []
    
    if use_backend == "auto":
        # Priority order
        if SPEECH_SERVICE_AVAILABLE:
            backends.append("google")
        if openai_client:
            backends.append("whisper")
        if SPEECH_RECOGNITION_AVAILABLE:
            backends.append("speech_recognition")
    else:
        backends.append(use_backend)
    
    if not backends:
        print("ERROR: No speech-to-text backend available!")
        print("Install one of:")
        print("  1. google-cloud-speech (Google Cloud)")
        print("  2. openai (for Whisper)")
        print("  3. SpeechRecognition pocketsphinx (pip install SpeechRecognition pocketsphinx)")
        return None
    
    # Try each backend
    for backend in backends:
        try:
            if backend == "google" and SPEECH_SERVICE_AVAILABLE:
                result = _transcribe_google_cloud(audio_file_path, language_code)
            elif backend == "whisper" and openai_client:
                result = transcribe_audio_whisper(audio_file_path)
            elif backend == "speech_recognition" and SPEECH_RECOGNITION_AVAILABLE:
                result = transcribe_audio_speech_recognition(audio_file_path)
            else:
                continue
            
            if result:
                print(f"Successfully transcribed using {backend}")
                return result
        except Exception as e:
            print(f"Backend '{backend}' failed: {e}")
            continue
    
    print("All speech-to-text backends failed")
    return None

def _transcribe_google_cloud(audio_file_path: str, language_code: str = "en-IN") -> Optional[str]:
    """
    Internal: Transcribe using Google Cloud Speech-to-Text.
    """
    if not SPEECH_SERVICE_AVAILABLE:
        return None
    
    try:
        # Read audio file
        with open(audio_file_path, "rb") as audio_file:
            content = audio_file.read()
        
        # Determine audio encoding based on file extension
        file_ext = os.path.splitext(audio_file_path)[1].lower()
        
        encoding_map = {
            ".wav": speech_v1.RecognitionConfig.AudioEncoding.LINEAR16,
            ".mp3": speech_v1.RecognitionConfig.AudioEncoding.MP3,
            ".flac": speech_v1.RecognitionConfig.AudioEncoding.FLAC,
            ".ogg": speech_v1.RecognitionConfig.AudioEncoding.OGG_OPUS,
        }
        
        encoding = encoding_map.get(file_ext, speech_v1.RecognitionConfig.AudioEncoding.LINEAR16)
        
        # Configure audio
        audio = speech_v1.RecognitionAudio(content=content)
        
        config = speech_v1.RecognitionConfig(
            encoding=encoding,
            language_code=language_code,
            enable_automatic_punctuation=True,
            model="latest_long",  # Use latest long-form model for better accuracy
            use_enhanced=True,  # Use enhanced model
        )
        
        # Perform transcription
        operation = client.long_running_recognize(config=config, audio=audio)
        print(f"Waiting for transcription operation to complete...")
        
        response = operation.result(timeout=300)
        
        # Extract transcribed text
        transcribed_text = ""
        for result in response.results:
            if result.alternatives:
                transcribed_text += result.alternatives[0].transcript + " "
        
        return transcribed_text.strip()
    
    except FileNotFoundError:
        print(f"Audio file not found: {audio_file_path}")
        return None
    except Exception as e:
        print(f"Error during transcription: {e}")
        return None

def transcribe_audio_stream(audio_bytes: bytes, language_code: str = "en-IN", use_backend: str = "auto") -> Optional[str]:
    """
    Transcribe audio from bytes (useful for streaming/uploaded files).
    Tries backends in order: Google Cloud -> Whisper -> SpeechRecognition
    
    Args:
        audio_bytes: Audio data as bytes
        language_code: BCP-47 language code (only for Google Cloud)
        use_backend: Which backend to use ("auto", "google", "whisper", "speech_recognition")
        
    Returns:
        Transcribed text or None if transcription fails
    """
    
    # Try backends in order
    backends = []
    
    if use_backend == "auto":
        if SPEECH_SERVICE_AVAILABLE:
            backends.append("google")
        if openai_client:
            backends.append("whisper")
    else:
        backends.append(use_backend)
    
    if not backends:
        print("No speech-to-text backend available for streaming")
        return None
    
    # Try Google Cloud
    if "google" in backends and SPEECH_SERVICE_AVAILABLE:
        try:
            audio = speech_v1.RecognitionAudio(content=audio_bytes)
            config = speech_v1.RecognitionConfig(
                encoding=speech_v1.RecognitionConfig.AudioEncoding.LINEAR16,
                language_code=language_code,
                enable_automatic_punctuation=True,
            )
            response = client.recognize(config=config, audio=audio)
            transcribed_text = ""
            for result in response.results:
                if result.alternatives:
                    transcribed_text += result.alternatives[0].transcript + " "
            if transcribed_text:
                return transcribed_text.strip()
        except Exception as e:
            print(f"Google Cloud backend failed: {e}")
    
    # Try Whisper as fallback
    if "whisper" in backends and openai_client:
        try:
            from io import BytesIO
            file_obj = BytesIO(audio_bytes)
            file_obj.name = "audio.wav"  # Give it a recognizable name
            transcript = openai_client.audio.transcriptions.create(
                model="whisper-1",
                file=file_obj
            )
            return transcript.text
        except Exception as e:
            print(f"Whisper backend failed: {e}")
    
    print("All streaming backends failed")
    return None

def get_confidence_score(audio_file_path: str, language_code: str = "en-IN") -> Optional[float]:
    """
    Get confidence score of transcription (0-1).
    
    Args:
        audio_file_path: Path to audio file
        language_code: BCP-47 language code
        
    Returns:
        Confidence score 0-1 or None if transcription fails
    """
    
    if not SPEECH_SERVICE_AVAILABLE:
        return None
    
    try:
        with open(audio_file_path, "rb") as audio_file:
            content = audio_file.read()
        
        audio = speech_v1.RecognitionAudio(content=content)
        
        config = speech_v1.RecognitionConfig(
            encoding=speech_v1.RecognitionConfig.AudioEncoding.LINEAR16,
            language_code=language_code,
        )
        
        response = client.recognize(config=config, audio=audio)
        
        if response.results:
            first_result = response.results[0]
            if first_result.alternatives:
                return first_result.alternatives[0].confidence
        
        return None
    
    except Exception as e:
        print(f"Error getting confidence score: {e}")
        return None
