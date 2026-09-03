import time
import struct
import numpy as np
import wave
import datetime
import os
import subprocess

PIPE_NAME = r'\\.\pipe\AudioCapturePipe'
SAMPLE_RATE = 48000
CHANNELS = 2

def record_audio():
    print(f"Connecting to pipe {PIPE_NAME}...")
    
    # Wait for the pipe
    pipe = None
    while True:
        try:
            pipe = open(PIPE_NAME, 'rb')
            break
        except FileNotFoundError:
            print("Waiting for C# AudioCapture process to start...", end='\r')
            time.sleep(2)
        except Exception as e:
            print(f"Error connecting to pipe: {e}")
            time.sleep(2)

    print("Connected! Recording audio...")

    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    out_file = f"recording_{timestamp}.wav"
    
    wav_file = wave.open(out_file, 'wb')
    wav_file.setnchannels(CHANNELS)
    wav_file.setsampwidth(2) # 16-bit PCM
    wav_file.setframerate(SAMPLE_RATE)
    
    print(f"Saving to {out_file}...")
    print("Press Ctrl+C to stop recording and process the meeting.")
    
    remainder = b""
    try:
        while True:
            raw_bytes = pipe.read(8192)
            if not raw_bytes:
                break
                
            data = remainder + raw_bytes
            # Each float32 is 4 bytes (2 channels * 2 bytes/float = 4 bytes per sample frame)
            valid_bytes = (len(data) // 4) * 4
            if valid_bytes > 0:
                chunk = data[:valid_bytes]
                remainder = data[valid_bytes:]
                
                # Convert float32 from C# loopback to int16 cleanly without wrap-around distortion
                audio_float = np.frombuffer(chunk, dtype=np.float32)
                audio_int16 = (np.clip(audio_float, -1.0, 1.0) * 32767.0).astype(np.int16)
                wav_file.writeframes(audio_int16.tobytes())
            else:
                remainder = data
            
    except KeyboardInterrupt:
        print("\n[INFO] Stopped recording.")
    finally:
        wav_file.close()
        try:
            pipe.close()
        except: pass
        
    print(f"\n[SUCCESS] Recording saved: {out_file}")
    print("[AI] Triggering Gemini 3.6 Flash Synthesis pipeline...")
    try:
        import sys
        result = subprocess.run([sys.executable, "ai_synthesis.py"], check=True)
        print("[SUCCESS] Meeting synthesis complete! Check your Web Dashboard.")
    except Exception as e:
        print(f"[ERROR] Failed to run synthesis script: {e}")

if __name__ == "__main__":
    record_audio()
