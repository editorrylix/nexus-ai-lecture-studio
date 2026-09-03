"""
Nexus Desktop Studio - Professional Audio Recording & Lecture Intelligence Controller
Built with CustomTkinter and PyCaw for native Windows loopback capture.
"""

import os
import sys
import time
import datetime
import threading
import wave
import subprocess
import webbrowser
import numpy as np
import customtkinter as ctk
from tkinter import messagebox

# Attempt pycaw import for process enumeration
try:
    from pycaw.pycaw import AudioUtilities
    import psutil
    PYCAW_AVAILABLE = True
except Exception:
    PYCAW_AVAILABLE = False

# Set Theme & Appearance
ctk.set_appearance_mode("dark")
ctk.set_default_color_theme("blue")

PIPE_NAME = r'\\.\pipe\AudioCapturePipe'
SAMPLE_RATE = 48000
CHANNELS = 2

class NexusRecorderApp(ctk.CTk):
    def __init__(self):
        super().__init__()

        self.title("Nexus — Lecture Recording Studio")
        self.geometry("640x720")
        self.minsize(580, 680)

        # State Variables
        self.is_recording = False
        self.record_thread = None
        self.record_start_time = None
        self.current_wav_file = None
        self.csharp_process = None
        self.detected_processes = []
        self.active_volume_level = 0.0

        self.setup_ui()
        self.refresh_process_list()

    def setup_ui(self):
        # 1. Header Frame
        header_frame = ctk.CTkFrame(self, fg_color="#0F1117", corner_radius=12)
        header_frame.pack(fill="x", padx=16, pady=(16, 10))

        title_label = ctk.CTkLabel(
            header_frame, 
            text="Nexus Recording Studio", 
            font=ctk.CTkFont(size=20, weight="bold"),
            text_color="#FFFFFF"
        )
        title_label.pack(anchor="w", padx=16, pady=(12, 2))

        subtitle_label = ctk.CTkLabel(
            header_frame,
            text="High-Fidelity Process Loopback Capture • Powered by Gemini 3.6 Flash",
            font=ctk.CTkFont(size=12),
            text_color="#9CA3AF"
        )
        subtitle_label.pack(anchor="w", padx=16, pady=(0, 12))

        # 2. Process Selection Card
        proc_card = ctk.CTkFrame(self, fg_color="#161822", corner_radius=12)
        proc_card.pack(fill="x", padx=16, pady=8)

        card_title = ctk.CTkLabel(
            proc_card, 
            text="TARGET AUDIO SOURCE", 
            font=ctk.CTkFont(size=11, weight="bold"), 
            text_color="#60A5FA"
        )
        card_title.pack(anchor="w", padx=16, pady=(12, 6))

        proc_select_frame = ctk.CTkFrame(proc_card, fg_color="transparent")
        proc_select_frame.pack(fill="x", padx=16, pady=(0, 14))

        self.process_dropdown = ctk.CTkComboBox(
            proc_select_frame, 
            values=["Scanning active audio apps..."],
            height=38,
            font=ctk.CTkFont(size=13),
            dropdown_font=ctk.CTkFont(size=12)
        )
        self.process_dropdown.pack(side="left", fill="x", expand=True, padx=(0, 8))

        self.refresh_btn = ctk.CTkButton(
            proc_select_frame, 
            text="↻ Scan", 
            width=70, 
            height=38,
            fg_color="#2563EB",
            hover_color="#1D4ED8",
            font=ctk.CTkFont(size=12, weight="bold"),
            command=self.refresh_process_list
        )
        self.refresh_btn.pack(side="right")

        # 3. Live Recording Status & VU Meter Card
        status_card = ctk.CTkFrame(self, fg_color="#161822", corner_radius=12)
        status_card.pack(fill="x", padx=16, pady=8)

        # Status & Timer row
        stat_row = ctk.CTkFrame(status_card, fg_color="transparent")
        stat_row.pack(fill="x", padx=16, pady=(14, 6))

        self.status_badge = ctk.CTkLabel(
            stat_row,
            text="● STANDBY",
            font=ctk.CTkFont(size=13, weight="bold"),
            text_color="#10B981"
        )
        self.status_badge.pack(side="left")

        self.timer_label = ctk.CTkLabel(
            stat_row,
            text="00:00:00",
            font=ctk.CTkFont(size=18, weight="bold", family="Consolas"),
            text_color="#E5E7EB"
        )
        self.timer_label.pack(side="right")

        # VU Volume Meter
        vu_label = ctk.CTkLabel(
            status_card, 
            text="LIVE AUDIO ACTIVITY", 
            font=ctk.CTkFont(size=10, weight="bold"),
            text_color="#9CA3AF"
        )
        vu_label.pack(anchor="w", padx=16, pady=(4, 2))

        self.vu_meter = ctk.CTkProgressBar(status_card, height=10, progress_color="#10B981")
        self.vu_meter.pack(fill="x", padx=16, pady=(0, 14))
        self.vu_meter.set(0.0)

        # 4. Action Buttons Card
        btn_frame = ctk.CTkFrame(self, fg_color="transparent")
        btn_frame.pack(fill="x", padx=16, pady=6)

        self.record_btn = ctk.CTkButton(
            btn_frame,
            text="Start Recording",
            height=46,
            fg_color="#059669",
            hover_color="#047857",
            font=ctk.CTkFont(size=15, weight="bold"),
            command=self.toggle_recording
        )
        self.record_btn.pack(fill="x", pady=4)

        # Quick Utilities Row
        utils_row = ctk.CTkFrame(btn_frame, fg_color="transparent")
        utils_row.pack(fill="x", pady=4)

        self.open_dash_btn = ctk.CTkButton(
            utils_row,
            text="Open Web Dashboard",
            height=34,
            fg_color="#1E293B",
            hover_color="#334155",
            font=ctk.CTkFont(size=12),
            command=lambda: webbrowser.open("http://localhost:3000")
        )
        self.open_dash_btn.pack(side="left", fill="x", expand=True, padx=(0, 4))

        self.open_folder_btn = ctk.CTkButton(
            utils_row,
            text="Browse Recordings",
            height=34,
            fg_color="#1E293B",
            hover_color="#334155",
            font=ctk.CTkFont(size=12),
            command=self.open_recordings_folder
        )
        self.open_folder_btn.pack(side="right", fill="x", expand=True, padx=(4, 0))

        # 5. Live Console & Diagnostics Card
        log_card = ctk.CTkFrame(self, fg_color="#161822", corner_radius=12)
        log_card.pack(fill="both", expand=True, padx=16, pady=(8, 16))

        log_title_row = ctk.CTkFrame(log_card, fg_color="transparent")
        log_title_row.pack(fill="x", padx=14, pady=(10, 4))

        log_header = ctk.CTkLabel(
            log_title_row,
            text="SESSION DIAGNOSTICS & LOGS",
            font=ctk.CTkFont(size=10, weight="bold"),
            text_color="#9CA3AF"
        )
        log_header.pack(side="left")

        clear_btn = ctk.CTkButton(
            log_title_row,
            text="Clear",
            width=45,
            height=20,
            fg_color="transparent",
            text_color="#64748B",
            hover_color="#1E293B",
            font=ctk.CTkFont(size=10),
            command=self.clear_logs
        )
        clear_btn.pack(side="right")

        self.log_textbox = ctk.CTkTextbox(
            log_card,
            font=ctk.CTkFont(family="Consolas", size=11),
            fg_color="#0A0B10",
            text_color="#D1D5DB"
        )
        self.log_textbox.pack(fill="both", expand=True, padx=12, pady=(0, 12))

        self.log("INFO", "Nexus Studio initialized. Ready to capture.")

    def log(self, level: str, message: str):
        now = datetime.datetime.now().strftime("%H:%M:%S")
        tag = f"[{now}] [{level}] "
        self.log_textbox.configure(state="normal")
        self.log_textbox.insert("end", f"{tag}{message}\n")
        self.log_textbox.see("end")
        self.log_textbox.configure(state="disabled")

    def clear_logs(self):
        self.log_textbox.configure(state="normal")
        self.log_textbox.delete("1.0", "end")
        self.log_textbox.configure(state="disabled")

    def refresh_process_list(self):
        self.log("INFO", "Scanning for active audio sessions...")
        options = []
        self.detected_processes = []

        if PYCAW_AVAILABLE:
            try:
                sessions = AudioUtilities.GetAllSessions()
                seen_pids = set()
                for s in sessions:
                    if not s.Process or s.Process.pid in seen_pids:
                        continue
                    seen_pids.add(s.Process.pid)
                    pid = s.Process.pid
                    name = s.Process.name()
                    try:
                        title = psutil.Process(pid).name()
                    except Exception:
                        title = name
                    
                    label = f"{name} (PID: {pid})"
                    options.append(label)
                    self.detected_processes.append({"pid": pid, "name": name, "label": label})
            except Exception as e:
                self.log("WARNING", f"PyCaw scan encountered issue: {e}")

        # Fallback to common target processes if nothing found
        if not options:
            options = ["No active audio playing - Start video or meeting first!"]
            self.log("WARNING", "No active audio streams detected on Windows default render device.")
            self.process_dropdown.configure(values=options)
            self.process_dropdown.set(options[0])
        else:
            self.process_dropdown.configure(values=options)
            self.process_dropdown.set(options[0])
            self.log("SUCCESS", f"Found {len(options)} active audio application(s).")

    def get_selected_pid(self):
        selected_text = self.process_dropdown.get()
        for p in self.detected_processes:
            if p["label"] == selected_text:
                return p["pid"]
        return None

    def toggle_recording(self):
        if not self.is_recording:
            self.start_recording()
        else:
            self.stop_recording()

    def start_recording(self):
        selected_pid = self.get_selected_pid()
        if not selected_pid:
            messagebox.showwarning(
                "Select Audio Source", 
                "Please select an active audio application from the dropdown before recording."
            )
            return

        self.log("INFO", f"Initiating capture for PID: {selected_pid}")

        # Check if C# AudioCapture process is already running or launch it
        self.ensure_csharp_running(selected_pid)

        self.is_recording = True
        self.record_start_time = time.time()
        
        # UI Updates
        self.record_btn.configure(
            text="Stop & Process with Gemini AI", 
            fg_color="#DC2626", 
            hover_color="#B91C1C"
        )
        self.status_badge.configure(text="● RECORDING AUDIO", text_color="#EF4444")
        self.process_dropdown.configure(state="disabled")
        self.refresh_btn.configure(state="disabled")

        # Start background recording thread
        self.record_thread = threading.Thread(target=self._recording_worker, daemon=True)
        self.record_thread.start()

        # Start timer and VU meter animation
        self._update_timer()

    def ensure_csharp_running(self, pid):
        # We can launch client-audio-hook in headless mode with PID argument
        csharp_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../client-audio-hook'))
        try:
            self.log("INFO", f"Connecting C# WASAPI process-loopback hook to PID {pid}...")
            # Run dotnet run with PID argument in background
            self.csharp_process = subprocess.Popen(
                ["dotnet", "run", "--", str(pid)],
                cwd=csharp_dir,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            self.log("SUCCESS", "C# Audio Hook launched successfully.")
        except Exception as e:
            self.log("WARNING", f"Could not launch dotnet directly: {e}. Assuming C# hook is running in terminal.")

    def _recording_worker(self):
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        self.current_wav_file = f"recording_{timestamp}.wav"
        
        self.log("INFO", f"Awaiting audio pipe: {PIPE_NAME}")
        pipe = None
        for _ in range(30):
            if not self.is_recording:
                return
            try:
                pipe = open(PIPE_NAME, 'rb')
                break
            except Exception:
                time.sleep(1)

        if not pipe:
            self.log("ERROR", "Timed out connecting to AudioCapturePipe. Verify the target app is playing audio.")
            self.after(0, self.stop_recording)
            return

        self.log("SUCCESS", f"Connected to audio stream. Saving to {self.current_wav_file}")
        
        wav_file = wave.open(self.current_wav_file, 'wb')
        wav_file.setnchannels(CHANNELS)
        wav_file.setsampwidth(2)
        wav_file.setframerate(SAMPLE_RATE)

        remainder = b""
        total_frames = 0

        try:
            while self.is_recording:
                raw_bytes = pipe.read(8192)
                if not raw_bytes:
                    break

                data = remainder + raw_bytes
                valid_bytes = (len(data) // 4) * 4
                if valid_bytes > 0:
                    chunk = data[:valid_bytes]
                    remainder = data[valid_bytes:]

                    audio_float = np.frombuffer(chunk, dtype=np.float32)
                    
                    # Compute volume for VU meter
                    rms = np.sqrt(np.mean(audio_float**2)) if len(audio_float) > 0 else 0.0
                    self.active_volume_level = min(1.0, float(rms) * 5.0)

                    audio_int16 = (np.clip(audio_float, -1.0, 1.0) * 32767.0).astype(np.int16)
                    wav_file.writeframes(audio_int16.tobytes())
                    total_frames += len(audio_int16) // CHANNELS
                else:
                    remainder = data

        except Exception as e:
            self.log("ERROR", f"Audio stream error: {e}")
        finally:
            wav_file.close()
            try:
                pipe.close()
            except Exception:
                pass
            self.active_volume_level = 0.0

        self.log("INFO", f"Recording finalized. Total captured frames: {total_frames}")

    def stop_recording(self):
        if not self.is_recording:
            return

        self.is_recording = False
        self.status_badge.configure(text="● PROCESSING WITH AI", text_color="#3B82F6")
        self.record_btn.configure(text="Processing with Gemini...", state="disabled")
        self.vu_meter.set(0.0)

        # Terminate C# process if we spawned it
        if self.csharp_process:
            try:
                self.csharp_process.terminate()
            except Exception:
                pass
            self.csharp_process = None

        self.log("INFO", "Recording stopped. Starting Gemini 3.6 Flash synthesis in background...")
        threading.Thread(target=self._run_synthesis, daemon=True).start()

    def _run_synthesis(self):
        try:
            python_exe = sys.executable
            synthesis_script = os.path.join(os.path.dirname(__file__), "ai_synthesis.py")

            self.log("AI", "Uploading audio to Google Gemini servers...")
            proc = subprocess.Popen(
                [python_exe, synthesis_script],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )

            stdout, stderr = proc.communicate()

            if proc.returncode == 0:
                self.log("SUCCESS", "Gemini 3.6 Flash synthesis complete!")
                self.log("SUCCESS", "Notes, flashcards, and Anki deck saved to Supabase.")
                self.after(0, lambda: messagebox.showinfo(
                    "Synthesis Complete", 
                    "Your lecture notes, study outline, and flashcards have been generated and synced to the Web Dashboard!"
                ))
            else:
                self.log("ERROR", f"Synthesis failed: {stderr}")
                self.after(0, lambda: messagebox.showerror(
                    "Synthesis Error", 
                    f"AI processing failed. Details:\n{stderr or stdout}"
                ))

        except Exception as e:
            self.log("ERROR", f"Failed to trigger synthesis: {e}")
        finally:
            self.after(0, self._reset_ui_standby)

    def _reset_ui_standby(self):
        self.record_btn.configure(
            text="Start Recording", 
            fg_color="#059669", 
            hover_color="#047857",
            state="normal"
        )
        self.status_badge.configure(text="● STANDBY", text_color="#10B981")
        self.process_dropdown.configure(state="normal")
        self.refresh_btn.configure(state="normal")
        self.timer_label.configure(text="00:00:00")
        self.vu_meter.set(0.0)

    def _update_timer(self):
        if self.is_recording and self.record_start_time:
            elapsed = int(time.time() - self.record_start_time)
            mins, secs = divmod(elapsed, 60)
            hours, mins = divmod(mins, 60)
            self.timer_label.configure(text=f"{hours:02d}:{mins:02d}:{secs:02d}")
            
            # Animate VU meter
            self.vu_meter.set(self.active_volume_level)
            
            # Recurse every 100ms
            self.after(100, self._update_timer)
        else:
            self.vu_meter.set(0.0)

    def open_recordings_folder(self):
        folder = os.path.dirname(os.path.abspath(__file__))
        os.system(f'explorer "{folder}"')

if __name__ == "__main__":
    app = NexusRecorderApp()
    app.mainloop()
