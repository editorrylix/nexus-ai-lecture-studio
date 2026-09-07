"""
Nexus Audio Daemon
Lightweight local HTTP bridge between the Web Dashboard and Windows Audio Loopback Capture.
Runs on http://127.0.0.1:5005
"""

import os
import sys
import time
import json
import wave
import datetime
import threading
import subprocess
import numpy as np
import ctypes
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler

try:
    from pycaw.pycaw import AudioUtilities
    import psutil
    PYCAW_AVAILABLE = True
except Exception:
    PYCAW_AVAILABLE = False

PORT = 5005
PIPE_NAME = r'\\.\pipe\AudioCapturePipe'
SAMPLE_RATE = 48000
CHANNELS = 2

# Global Daemon State
state = {
    "isRecording": False,
    "isProcessing": False,
    "startTime": None,
    "elapsed": 0,
    "vuLevel": 0.0,
    "targetPid": None,
    "targetName": "",
    "currentWav": None,
    "lastError": None,
    "lastSavedSession": None,
    "liveTranscript": "",
    "language": "auto"
}

csharp_process = None
recording_thread = None

def get_audio_processes():
    results = [{
        "pid": 0,
        "name": "Entire System Audio (All Apps & Meetings)",
        "title": "Entire System Audio (All Apps & Meetings)",
        "appType": "system",
        "isActive": True
    }]
    seen = {0}

    # 1. Primary: Audio Sessions from Windows Core Audio (PyCaw)
    if PYCAW_AVAILABLE:
        try:
            try:
                ctypes.windll.ole32.CoInitialize(None)
            except Exception:
                pass

            sessions = AudioUtilities.GetAllSessions()
            for s in sessions:
                if not s.Process or s.Process.pid in seen:
                    continue
                pid = s.Process.pid
                raw_name = s.Process.name()
                low_name = raw_name.lower()
                
                # Determine friendly display name and appType
                if "chrome" in low_name:
                    app_name = "Google Chrome (YouTube / Audio)"
                    app_type = "chrome"
                elif "teams" in low_name:
                    app_name = "Microsoft Teams"
                    app_type = "teams"
                elif "discord" in low_name:
                    app_name = "Discord"
                    app_type = "discord"
                elif "zoom" in low_name:
                    app_name = "Zoom Meeting"
                    app_type = "zoom"
                elif "spotify" in low_name:
                    app_name = "Spotify"
                    app_type = "spotify"
                elif "edge" in low_name or "msedge" in low_name:
                    app_name = "Microsoft Edge"
                    app_type = "edge"
                elif "firefox" in low_name:
                    app_name = "Mozilla Firefox"
                    app_type = "firefox"
                else:
                    app_name = raw_name
                    app_type = "generic"

                is_active = False
                try:
                    is_active = (s.State == 1)
                except Exception:
                    pass

                seen.add(pid)
                results.append({
                    "pid": pid,
                    "name": app_name,
                    "title": app_name,
                    "appType": app_type,
                    "isActive": is_active
                })
        except Exception as e:
            print(f"PyCaw session scan warning: {e}")

    # 2. Fallback: Detect running browsers & communication tools via psutil
    recognized_targets = [
        ("chrome.exe", "Google Chrome", "chrome"),
        ("msedge.exe", "Microsoft Edge", "edge"),
        ("firefox.exe", "Mozilla Firefox", "firefox"),
        ("brave.exe", "Brave Browser", "chrome"),
        ("teams.exe", "Microsoft Teams", "teams"),
        ("zoom.exe", "Zoom", "zoom"),
        ("spotify.exe", "Spotify", "spotify"),
        ("discord.exe", "Discord", "discord")
    ]

    added_names = {r["name"].lower() for r in results}

    for p in psutil.process_iter(['pid', 'name']):
        try:
            proc_name = (p.info.get('name') or '').lower()
            for exe_name, friendly_name, app_type in recognized_targets:
                if exe_name in proc_name and friendly_name.lower() not in added_names:
                    pid = p.info['pid']
                    if pid not in seen:
                        seen.add(pid)
                        added_names.add(friendly_name.lower())
                        results.append({
                            "pid": pid,
                            "name": friendly_name,
                            "title": friendly_name,
                            "appType": app_type,
                            "isActive": False
                        })
        except Exception:
            continue

    # Sort active audio streams to top
    results.sort(key=lambda x: not x.get("isActive", False))
    return results

def recording_loop():
    global state
    pipe = None
    state["startTime"] = time.time()
    
    # Wait for pipe
    for _ in range(30):
        if not state["isRecording"]:
            return
        try:
            pipe = open(PIPE_NAME, 'rb')
            break
        except Exception:
            time.sleep(0.5)

    if not pipe:
        state["lastError"] = "Timed out connecting to AudioCapturePipe. Make sure audio is playing."
        state["isRecording"] = False
        return

    wav_file = wave.open(state["currentWav"], 'wb')
    wav_file.setnchannels(CHANNELS)
    wav_file.setsampwidth(2)
    wav_file.setframerate(SAMPLE_RATE)

    remainder = b""
    try:
        while state["isRecording"]:
            raw_bytes = pipe.read(8192)
            if not raw_bytes:
                break

            data = remainder + raw_bytes
            valid_bytes = (len(data) // 4) * 4
            if valid_bytes > 0:
                chunk = data[:valid_bytes]
                remainder = data[valid_bytes:]

                audio_float = np.frombuffer(chunk, dtype=np.float32)
                rms = np.sqrt(np.mean(audio_float**2)) if len(audio_float) > 0 else 0.0
                state["vuLevel"] = min(1.0, float(rms) * 4.5)

                audio_int16 = (np.clip(audio_float, -1.0, 1.0) * 32767.0).astype(np.int16)
                wav_file.writeframes(audio_int16.tobytes())
            else:
                remainder = data

    except Exception as e:
        state["lastError"] = str(e)
    finally:
        wav_file.close()
        try:
            pipe.close()
        except Exception:
            pass
        state["vuLevel"] = 0.0

        # If pipe closed unexpectedly while still flagged as recording
        if state["isRecording"]:
            state["isRecording"] = False
            if csharp_process:
                time.sleep(0.3)
                poll = csharp_process.poll()
                if poll is not None:
                    err_msg = ""
                    try:
                        err_msg = csharp_process.stderr.read()
                    except Exception:
                        pass
                    state["lastError"] = f"Audio capture hook exited unexpectedly (Code {poll}): {err_msg.strip()}"
                    print(f"[DAEMON] {state['lastError']}")

def live_transcription_worker():
    global state
    try:
        import local_stt
    except Exception:
        return

    sample_rate = 48000
    channels = 2
    bytes_per_sample = 2
    bytes_per_sec = sample_rate * channels * bytes_per_sample
    slice_bytes = 6 * bytes_per_sec  # 6 second audio slice

    while state["isRecording"]:
        time.sleep(8.0)
        if not state["isRecording"] or not state.get("currentWav"):
            break
        wav_path = state["currentWav"]
        if os.path.exists(wav_path) and os.path.getsize(wav_path) > slice_bytes + 1000:
            scratch_wav = wav_path + ".live_slice.wav"
            try:
                # Read only the latest 6-second window to keep CPU under 1.5%
                with open(wav_path, 'rb') as f:
                    f.seek(0, os.SEEK_END)
                    total_size = f.tell()
                    read_start = max(44, total_size - slice_bytes)
                    f.seek(read_start)
                    raw_slice = f.read()

                with wave.open(scratch_wav, 'wb') as sf:
                    sf.setnchannels(channels)
                    sf.setsampwidth(bytes_per_sample)
                    sf.setframerate(sample_rate)
                    sf.writeframes(raw_slice)

                current_lang = state.get("language", "auto")
                res = local_stt.transcribe_audio_file(scratch_wav, model_size="tiny", prompt_mode=current_lang)
                text = res.get("text", "").strip()
                if text:
                    state["liveTranscript"] = text
            except Exception:
                pass
            finally:
                try:
                    if os.path.exists(scratch_wav):
                        os.remove(scratch_wav)
                except Exception:
                    pass

def start_capture(pid: int, app_name: str = "", language: str = "auto"):
    global state, csharp_process, recording_thread
    if state["isRecording"]:
        return False, "Already recording"

    state["isRecording"] = True
    state["lastError"] = None
    state["targetPid"] = pid
    state["targetName"] = app_name or f"PID {pid}"
    state["language"] = language or "auto"
    state["liveTranscript"] = ""

    storage_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../storage/recordings'))
    os.makedirs(storage_dir, exist_ok=True)
    ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    state["currentWav"] = os.path.join(storage_dir, f"recording_{ts}.wav")

    # Launch C# headless capture (Prioritize pre-compiled binary for instant 0% CPU startup)
    csharp_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../client-audio-hook'))
    publish_exe = os.path.join(csharp_dir, 'bin', 'Release', 'publish', 'client-audio-hook.exe')
    debug_exe = os.path.join(csharp_dir, 'bin', 'Debug', 'net8.0', 'client-audio-hook.exe')

    if os.path.exists(publish_exe):
        cmd = [publish_exe, str(pid)]
    elif os.path.exists(debug_exe):
        cmd = [debug_exe, str(pid)]
    else:
        cmd = ["dotnet", "run", "--", str(pid)]

    try:
        csharp_process = subprocess.Popen(
            cmd,
            cwd=csharp_dir,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.PIPE,
            text=True
        )
    except Exception as e:
        print(f"Note on C# launch: {e}")

    recording_thread = threading.Thread(target=recording_loop, daemon=True)
    recording_thread.start()

    # Launch live transcription worker (runs on low-impact 8s interval)
    threading.Thread(target=live_transcription_worker, daemon=True).start()

    return True, "Recording started"

def stop_capture():
    global state, csharp_process
    if not state["isRecording"]:
        return False, "Not recording"

    state["isRecording"] = False
    state["isProcessing"] = True
    state["vuLevel"] = 0.0

    if csharp_process:
        try:
            csharp_process.terminate()
            try:
                csharp_process.wait(timeout=2.0)
            except subprocess.TimeoutExpired:
                csharp_process.kill()
        except Exception:
            pass
        csharp_process = None

    # Run synthesis in background
    def run_synth():
        global state
        try:
            python_exe = sys.executable
            synth_script = os.path.join(os.path.dirname(__file__), "ai_synthesis.py")
            wav_arg = state.get("currentWav") or ""
            lang_arg = state.get("language") or "auto"
            args = [python_exe, synth_script]
            if wav_arg and os.path.exists(wav_arg):
                args.append(wav_arg)
                args.append(lang_arg)

            res = subprocess.run(args, capture_output=True, text=True)
            if res.returncode == 0:
                state["lastSavedSession"] = "Saved"
            else:
                state["lastError"] = f"AI processing error: {res.stderr}"
        except Exception as e:
            state["lastError"] = str(e)
        finally:
            state["isProcessing"] = False

    threading.Thread(target=run_synth, daemon=True).start()
    return True, "Recording stopped, synthesis in progress"

class DaemonHandler(BaseHTTPRequestHandler):
    def _send_json(self, data, status=200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        if self.path == '/processes':
            procs = get_audio_processes()
            self._send_json({"processes": procs})
        elif self.path == '/status':
            elapsed = 0
            if state["isRecording"] and state["startTime"]:
                elapsed = int(time.time() - state["startTime"])

            progress_info = None
            try:
                storage_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../storage'))
                prog_file = os.path.join(storage_dir, 'synthesis_progress.json')
                if os.path.exists(prog_file):
                    with open(prog_file, 'r', encoding='utf-8') as f:
                        progress_info = json.load(f)
            except Exception:
                pass

            self._send_json({
                "isRecording": state["isRecording"],
                "isProcessing": state["isProcessing"],
                "elapsed": elapsed,
                "vuLevel": state["vuLevel"],
                "targetPid": state["targetPid"],
                "targetName": state["targetName"],
                "lastError": state["lastError"],
                "lastSaved": state["lastSavedSession"],
                "liveTranscript": state.get("liveTranscript", ""),
                "language": state.get("language", "auto"),
                "progress": progress_info
            })
        else:
            self._send_json({"status": "Nexus Audio Daemon Online", "version": "2.0"})

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        body = {}
        if content_length > 0:
            try:
                body = json.loads(self.rfile.read(content_length).decode('utf-8'))
            except Exception:
                pass

        if self.path == '/record/start':
            pid = body.get('pid')
            app_name = body.get('name', '')
            language = body.get('language', 'auto')
            if pid is None:
                pid = 0
            ok, msg = start_capture(int(pid), app_name, language=language)
            self._send_json({"success": ok, "message": msg})

        elif self.path == '/record/stop':
            ok, msg = stop_capture()
            self._send_json({"success": ok, "message": msg})

        elif self.path == '/settings/language':
            lang = body.get('language', 'auto')
            state['language'] = lang
            self._send_json({"success": True, "language": lang})

        else:
            self._send_json({"error": "Endpoint not found"}, status=404)

def cleanup_stale_port(port):
    try:
        current_pid = os.getpid()
        for conn in psutil.net_connections(kind='inet'):
            if conn.laddr and conn.laddr.port == port and conn.pid and conn.pid != current_pid:
                try:
                    p = psutil.Process(conn.pid)
                    p.kill()
                    time.sleep(0.3)
                except Exception:
                    pass
    except Exception:
        pass

def warmup_whisper():
    try:
        import local_stt
        print("[DAEMON] Pre-warming Faster-Whisper multilingual models in background...")
        local_stt.get_whisper_model("tiny")
        local_stt.get_whisper_model("base")
        print("[DAEMON] Faster-Whisper multilingual models cached and ready.")
    except Exception as e:
        print(f"[DAEMON] Note on Whisper warmup: {e}")

def run():
    cleanup_stale_port(PORT)
    try:
        server = ThreadingHTTPServer(('127.0.0.1', PORT), DaemonHandler)
    except OSError:
        time.sleep(0.5)
        cleanup_stale_port(PORT)
        server = ThreadingHTTPServer(('127.0.0.1', PORT), DaemonHandler)

    threading.Thread(target=warmup_whisper, daemon=True).start()
    print(f"[DAEMON] Nexus Audio Controller Daemon active on http://127.0.0.1:{PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[DAEMON] Shutting down.")

if __name__ == "__main__":
    run()
