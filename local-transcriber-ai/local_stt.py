"""
Nexus Offline Local Speech-to-Text Engine
Powered by Faster-Whisper with CTranslate2 int8 quantization.
Runs 100% locally on CPU or GPU with zero network calls and zero cloud API dependency.
"""

import os
from pathlib import Path
from faster_whisper import WhisperModel

_cached_model = None

def get_whisper_model(model_size="tiny.en", device="cpu", compute_type="int8"):
    global _cached_model
    if _cached_model is None:
        _cached_model = WhisperModel(model_size, device=device, compute_type=compute_type)
    return _cached_model

def transcribe_audio_file(audio_path, model_size="tiny.en"):
    """
    Transcribes a local WAV/MP3 audio file completely offline on your PC.
    Returns a dict with full transcript, timestamps, and metadata.
    """
    if not os.path.exists(audio_path):
        raise FileNotFoundError(f"Audio file not found: {audio_path}")

    model = get_whisper_model(model_size)
    segments_raw, info = model.transcribe(str(audio_path), beam_size=5)
    
    segments = []
    text_parts = []
    
    for seg in segments_raw:
        clean_text = seg.text.strip()
        if clean_text:
            text_parts.append(clean_text)
            segments.append({
                "start": round(seg.start, 2),
                "end": round(seg.end, 2),
                "text": clean_text
            })
            
    full_text = " ".join(text_parts)
    
    return {
        "text": full_text,
        "segments": segments,
        "duration": getattr(info, "duration", 0),
        "language": getattr(info, "language", "en")
    }

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        target = sys.argv[1]
        print(f"Transcribing {target} locally...")
        res = transcribe_audio_file(target)
        print("Done! Transcript length:", len(res["text"]))
        print("Sample:", res["text"][:200])
    else:
        print("Local STT engine ready.")
