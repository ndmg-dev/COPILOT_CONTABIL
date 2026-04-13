"""
Copilot Contábil IA — Audio Service
Integrates with OpenAI Whisper (STT) and TTS to enable voice interactions.
"""
import os
import uuid
import base64
import logging
import aiofiles
from openai import AsyncOpenAI
from app.config import get_settings

logger = logging.getLogger(__name__)

async def process_audio_base64_to_text(base64_audio: str) -> str:
    """
    Decodes base64 audio, saves a temp file, runs Whisper for transcription, and cleans up.
    """
    settings = get_settings()
    if not settings.openai_api_key:
        logger.warning("OPENAI_API_KEY is not configured for Whisper.")
        return "[Áudio não pôde ser transcrito: Falta de configuração de IA]"

    client = AsyncOpenAI(api_key=settings.openai_api_key)
    
    # Strip data:audio/ogg;base64, if present
    if "," in base64_audio:
        base64_audio = base64_audio.split(",")[1]
    
    file_bytes = base64.b64decode(base64_audio)
    temp_filename = f"/tmp/whatsapp_audio_{uuid.uuid4().hex}.ogg"
    
    try:
        # Write binary securely
        async with aiofiles.open(temp_filename, "wb") as f:
            await f.write(file_bytes)
            
        with open(temp_filename, "rb") as audio_file:
            transcript = await client.audio.transcriptions.create(
                model="whisper-1", 
                file=audio_file, 
                language="pt"
            )
            
        logger.info("Voice transcription successful.")
        return transcript.text
        
    except Exception as e:
        logger.error(f"Failed to transcribe audio: {e}", exc_info=True)
        return "[Erro na transcrição do áudio]"
        
    finally:
        if os.path.exists(temp_filename):
            os.remove(temp_filename)


async def generate_text_to_speech_base64(text: str) -> str:
    """
    Generates spoken audio from text using OpenAI TTS, and returns base64.
    """
    settings = get_settings()
    if not settings.openai_api_key:
        return ""
        
    client = AsyncOpenAI(api_key=settings.openai_api_key)
    temp_filename = f"/tmp/whatsapp_tts_{uuid.uuid4().hex}.mp3"
    
    try:
        response = await client.audio.speech.create(
            model="tts-1",
            voice="alloy", # Options: alloy, echo, fable, onyx, nova, shimmer
            input=text
        )
        
        response.stream_to_file(temp_filename)
        
        async with aiofiles.open(temp_filename, "rb") as f:
            audio_data = await f.read()
            
        base64_audio = base64.b64encode(audio_data).decode("utf-8")
        return base64_audio
        
    except Exception as e:
        logger.error(f"Failed to generate TTS: {e}", exc_info=True)
        return ""
        
    finally:
        if os.path.exists(temp_filename):
            os.remove(temp_filename)
