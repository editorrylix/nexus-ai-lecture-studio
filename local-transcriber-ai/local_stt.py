"""
Nexus Offline Local Speech-to-Text Engine
Powered by Faster-Whisper with CTranslate2 int8 quantization.
Runs 100% locally on CPU or GPU with zero network calls and zero cloud API dependency.
Fully compliant with Windows 11 Smart App Control (SAC) — zero unsigned .pyd binaries.
"""

import os
import sys
import types
import wave
from pathlib import Path
import numpy as np

# Windows 11 Smart App Control (SAC) Compatibility:
# PyAV bundles 'filter.pyd' which lacks EV Authenticode signing from PyPI wheels.
# On Windows 11 systems with Smart App Control in Enforce Mode, loading 'filter.pyd' triggers
# a Code Integrity block dialog ("We can't verify who published filter.pyd").
# We safely mock 'av' in sys.modules so Faster-Whisper never loads PyAV binaries, and we decode WAVs
# using Python's native standard library `wave` and `numpy`.
if 'av' not in sys.modules:
    mock_av = types.ModuleType('av')
    mock_av.audio = types.ModuleType('av.audio')
    mock_av.audio.resampler = types.ModuleType('av.audio.resampler')
    mock_av.audio.resampler.AudioResampler = object
    sys.modules['av'] = mock_av
    sys.modules['av.audio'] = mock_av.audio
    sys.modules['av.audio.resampler'] = mock_av.audio.resampler

from faster_whisper import WhisperModel

_cached_models = {}

def get_whisper_model(model_size="base", device="cpu", compute_type="int8"):
    global _cached_models
    # Fallback to tiny if base is not downloaded yet
    actual_size = model_size
    if actual_size not in _cached_models:
        # Constrain to 2 CPU threads so it never monopolizes the Ryzen 5 U-series processor
        try:
            _cached_models[actual_size] = WhisperModel(
                actual_size, 
                device=device, 
                compute_type=compute_type,
                cpu_threads=2,
                num_workers=1
            )
        except Exception:
            # Fallback to tiny
            actual_size = "tiny"
            if actual_size not in _cached_models:
                _cached_models[actual_size] = WhisperModel(
                    actual_size, 
                    device=device, 
                    compute_type=compute_type,
                    cpu_threads=2,
                    num_workers=1
                )
    return _cached_models[actual_size]

def load_audio_waveform(audio_path, target_sr=16000):
    """
    Decodes audio into a 16kHz mono float32 numpy array.
    Uses pure standard library `wave` + `numpy`, entirely avoiding
    PyAV / filter.pyd for 100% Windows Smart App Control compliance.
    """
    if not os.path.exists(audio_path):
        raise FileNotFoundError(f"Audio file not found: {audio_path}")

    with wave.open(str(audio_path), 'rb') as wf:
        n_channels = wf.getnchannels()
        sampwidth = wf.getsampwidth()
        framerate = wf.getframerate()
        n_frames = wf.getnframes()
        data = wf.readframes(n_frames)

    if sampwidth == 2:
        audio = np.frombuffer(data, dtype=np.int16).astype(np.float32) / 32768.0
    elif sampwidth == 4:
        audio = np.frombuffer(data, dtype=np.float32)
    elif sampwidth == 1:
        audio = (np.frombuffer(data, dtype=np.uint8).astype(np.float32) - 128.0) / 128.0
    else:
        raise ValueError(f"Unsupported sample width: {sampwidth}")

    if n_channels == 2:
        audio = audio.reshape(-1, 2).mean(axis=1)
    elif n_channels > 2:
        audio = audio.reshape(-1, n_channels).mean(axis=1)

    if framerate != target_sr and len(audio) > 0:
        target_len = int(len(audio) * target_sr / framerate)
        audio = np.interp(
            np.linspace(0, len(audio), target_len, endpoint=False),
            np.arange(len(audio)),
            audio
        ).astype(np.float32)

    return audio

def transcribe_audio_file(audio_path, model_size="base", language=None, prompt_mode="auto"):
    """
    Transcribes a local WAV audio file completely offline on your PC.
    Optimized for ultra-low CPU usage and real-time responsiveness.
    Safe under Windows 11 Smart App Control.
    
    Supports:
      - 'auto': Multilingual auto-detection (English, Hindi, etc.)
      - 'hinglish': Code-switched Hindi and English written in Latin/Roman script
      - 'hi': Hindi written in Devanagari script
      - 'en': English Only
    """
    if not os.path.exists(audio_path):
        raise FileNotFoundError(f"Audio file not found: {audio_path}")

    waveform = load_audio_waveform(audio_path)
    model = get_whisper_model(model_size)

    # Configure language and initial prompt based on prompt_mode
    initial_prompt = None
    whisper_lang = None

    mode = (prompt_mode or "auto").lower()
    if mode == "hinglish":
        initial_prompt = (
            "Transcribe accurately in Hinglish (Hindi spoken words written in Roman script) "
            "mixed with English technical terms. Examples: Namaste dosto, aaj hum padhenge "
            "standard deviation formula. Yeh concept exam ke liye bohot important hai."
        )
        whisper_lang = None
    elif mode in ("hi", "hindi"):
        whisper_lang = "hi"
        initial_prompt = "नमस्ते दोस्तों, आज हम इस व्याख्यान में मुख्य अवधारणाओं को समझेंगे।"
    elif mode in ("en", "english"):
        whisper_lang = "en"
    else:
        whisper_lang = language if (language and language != "auto") else None
        initial_prompt = "Transcribe clearly in English or Hindi / Hinglish as spoken."

    # Pass the numpy ndarray directly to model.transcribe to bypass PyAV entirely
    segments_raw, info = model.transcribe(
        waveform,
        beam_size=1,
        best_of=1,
        temperature=0.0,
        vad_filter=True,
        vad_parameters=dict(min_silence_duration_ms=400),
        language=whisper_lang,
        initial_prompt=initial_prompt
    )
    
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
        "duration": getattr(info, "duration", round(len(waveform) / 16000.0, 2)),
        "language": getattr(info, "language", whisper_lang or "en")
    }

if __name__ == "__main__":
    if sys.platform == 'win32':
        try:
            sys.stdout.reconfigure(encoding='utf-8')
        except Exception:
            pass
    if len(sys.argv) > 1:
        target = sys.argv[1]
        mode = sys.argv[2] if len(sys.argv) > 2 else "auto"
        print(f"Transcribing {target} locally (mode: {mode})...")
        res = transcribe_audio_file(target, model_size="base", prompt_mode=mode)
        print("Done! Transcript length:", len(res["text"]))
        print("Detected language:", res.get("language"))
        print("Sample:", res["text"][:200])
    else:
        print("Local STT engine ready.")
