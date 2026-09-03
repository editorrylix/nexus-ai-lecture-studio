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
from http.server import HTTPServer, BaseHTTPRequestHandler

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
    "lastSavedSession": None
}

csharp_process = None
recording_thread = None

def get_audio_processes():
    results = []
    if not PYCAW_AVAILABLE:
        return results

    try:
        sessions = AudioUtilities.GetAllSessions()
        seen = set()
        for s in sessions:
            if not s.Process or s.Process.pid in seen:
                continue
            seen.add(s.Process.pid)
            pid = s.Process.pid
            name = s.Process.name()
            
            # Determine recognized app tag for icons
            low_name = name.lower()
            app_type = "generic"
            if "chrome" in low_name:
                app_type = "chrome"
            elif "teams" in low_name:
                app_type = "teams"
            elif "discord" in low_name:
                app_type = "discord"
            elif "zoom" in low_name:
                app_type = "zoom"
            elif "spotify" in low_name:
                app_type = "spotify"
            elif "edge" in low_name or "msedge" in low_name:
                app_type = "edge"
            elif "firefox" in low_name:
                app_type = "firefox"
            elif "code" in low_name or "antigravity" in low_name:
                app_type = "ide"

            try:
                title = psutil.Process(pid).name()
            except Exception:
                title = name

            results.append({
                "pid": pid,
                "name": name,
                "title": title,
                "appType": app_type
            })
    except Exception as e:
        print(f"Process enumeration error: {e}")
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

def start_capture(pid: int, app_name: str = ""):
    global state, csharp_process, recording_thread
    if state["isRecording"]:
        return False, "Already recording"

    state["isRecording"] = True
    state["lastError"] = None
    state["targetPid"] = pid
    state["targetName"] = app_name or f"PID {pid}"

    storage_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../storage/recordings'))
    os.makedirs(storage_dir, exist_ok=True)
    ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    state["currentWav"] = os.path.join(storage_dir, f"recording_{ts}.wav")

    # Launch C# headless capture
    csharp_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../client-audio-hook'))
    try:
        csharp_process = subprocess.Popen(
            ["dotnet", "run", "--", str(pid)],
            cwd=csharp_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
    except Exception as e:
        print(f"Note on C# launch: {e}")

    recording_thread = threading.Thread(target=recording_loop, daemon=True)
    recording_thread.start()
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
        except Exception:
            pass
        csharp_process = None

    # Run synthesis in background
    def run_synth():
        global state
        try:
            python_exe = sys.executable
            synth_script = os.path.join(os.path.dirname(__file__), "ai_synthesis.py")
            res = subprocess.run([python_exe, synth_script], capture_output=True, text=True)
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
            self._send_json({
                "isRecording": state["isRecording"],
                "isProcessing": state["isProcessing"],
                "elapsed": elapsed,
                "vuLevel": state["vuLevel"],
                "targetPid": state["targetPid"],
                "targetName": state["targetName"],
                "lastError": state["lastError"],
                "lastSaved": state["lastSavedSession"]
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
            if not pid:
                self._send_json({"error": "Missing pid"}, status=400)
                return
            ok, msg = start_capture(int(pid), app_name)
            self._send_json({"success": ok, "message": msg})

        elif self.path == '/record/stop':
            ok, msg = stop_capture()
            self._send_json({"success": ok, "message": msg})

        else:
            self._send_json({"error": "Endpoint not found"}, status=404)

def run():
    server = HTTPServer(('127.0.0.1', PORT), DaemonHandler)
    print(f"[DAEMON] Nexus Audio Controller Daemon active on http://127.0.0.1:{PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[DAEMON] Shutting down.")

if __name__ == "__main__":
    run()
