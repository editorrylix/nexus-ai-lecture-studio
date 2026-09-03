"""
Nexus Windows System Tray & Modern Flyout Orchestrator
Runs silently in the Windows Notification Area with a sleek, modern dark
flyout widget (replacing legacy 80s Win32 menus) and background headless process management.
"""

import os
import sys
import time
import threading
import subprocess
import webbrowser
import urllib.request
from pathlib import Path
from PIL import Image, ImageDraw
import pystray
import customtkinter as ctk

# Paths
CURRENT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = CURRENT_DIR.parent
STORAGE_DIR = PROJECT_ROOT / "storage"
WEB_DIR = PROJECT_ROOT / "web-dashboard"

# Import Audio Daemon
try:
    import audio_daemon
except ImportError:
    sys.path.append(str(CURRENT_DIR))
    import audio_daemon

# Global Handles
next_process = None
tray_icon = None
flyout_window = None

def make_tray_icon(state_type="idle"):
    """Generates a high-resolution 64x64 RGBA system tray icon with dynamic status beacon."""
    img = Image.new('RGBA', (64, 64), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    
    # Dark rounded plate
    d.rounded_rectangle((2, 2, 62, 62), radius=15, fill=(10, 12, 18, 255), outline=(50, 60, 80, 255), width=2)
    
    # Cyan Vector 'N' glyph
    cyan = (0, 230, 255, 255)
    d.polygon([
        (16, 48), (16, 16), (24, 16), 
        (40, 42), (40, 16), (48, 16), 
        (48, 48), (40, 48), (24, 22), (24, 48)
    ], fill=cyan)
    
    # Status dot badge (top right)
    if state_type == "recording":
        d.ellipse((45, 5, 59, 19), fill=(255, 50, 50, 255), outline=(255, 255, 255, 255), width=1)
    elif state_type == "processing":
        d.ellipse((45, 5, 59, 19), fill=(255, 190, 40, 255), outline=(255, 255, 255, 255), width=1)
    else:
        d.ellipse((45, 5, 59, 19), fill=(50, 220, 100, 255), outline=(255, 255, 255, 255), width=1)
        
    return img

def is_url_responding(url, timeout=1.5):
    """Check if local HTTP server is responding."""
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=timeout) as response:
            return response.status in (200, 304)
    except Exception:
        return False

def ensure_nextjs_running():
    """Starts Next.js dev server in the background with zero visible console window."""
    global next_process
    if is_url_responding("http://localhost:3000"):
        return

    try:
        CREATE_NO_WINDOW = 0x08000000
        next_process = subprocess.Popen(
            ["npm.cmd", "run", "dev"],
            cwd=str(WEB_DIR),
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            creationflags=CREATE_NO_WINDOW
        )
    except Exception as e:
        print(f"[TRAY] Error starting Next.js: {e}")

def open_web_studio():
    webbrowser.open("http://localhost:3000")

def open_folder(path):
    try:
        target = Path(path)
        target.mkdir(parents=True, exist_ok=True)
        os.startfile(str(target))
    except Exception as e:
        print(f"[TRAY] Could not open folder {path}: {e}")

def exit_application():
    """Clean exit: stop recording, kill background server, exit tray."""
    global next_process, tray_icon
    state = audio_daemon.state
    if state.get("isRecording"):
        audio_daemon.stop_capture()
        
    if next_process:
        try:
            subprocess.run(["taskkill", "/F", "/T", "/PID", str(next_process.pid)], capture_output=True)
        except Exception:
            pass

    if tray_icon:
        tray_icon.stop()
    os._exit(0)

# ==========================================
# MODERN WINDOWS 11 DARK FLYOUT WIDGET
# ==========================================
class ModernTrayFlyout(ctk.CTk):
    def __init__(self):
        super().__init__()

        ctk.set_appearance_mode("dark")
        self.title("Nexus Studio")
        self.overrideredirect(True)
        self.attributes('-topmost', True)
        self.configure(fg_color="#0A0D14")

        # Dimensions & Position above Taskbar
        self.width = 330
        self.height = 420
        screen_w = self.winfo_screenwidth()
        screen_h = self.winfo_screenheight()
        x = screen_w - self.width - 16
        y = screen_h - self.height - 58
        self.geometry(f"{self.width}x{self.height}+{x}+{y}")

        # Bind dismiss on click away
        self.bind("<FocusOut>", lambda e: self.hide_flyout())

        self._build_ui()
        self.withdraw()  # Start hidden

    def _build_ui(self):
        # Outer Card Frame
        card = ctk.CTkFrame(
            self,
            fg_color="#0D1018",
            corner_radius=20,
            border_width=1,
            border_color="#242B3B"
        )
        card.pack(fill="both", expand=True, padx=2, pady=2)

        # Header
        header = ctk.CTkFrame(card, fg_color="transparent")
        header.pack(fill="x", padx=18, pady=(16, 12))

        title_label = ctk.CTkLabel(
            header,
            text="⚡ NEXUS STUDIO",
            font=ctk.CTkFont(size=14, weight="bold"),
            text_color="#FFFFFF"
        )
        title_label.pack(side="left")

        version_badge = ctk.CTkLabel(
            header,
            text="v2.4 PRO",
            font=ctk.CTkFont(size=10, weight="bold"),
            text_color="#00E6FF",
            fg_color="#003B46",
            corner_radius=6,
            padx=6,
            pady=2
        )
        version_badge.pack(side="right")

        # Status Bar
        self.status_frame = ctk.CTkFrame(card, fg_color="#131722", corner_radius=12, border_width=1, border_color="#1E2536")
        self.status_frame.pack(fill="x", padx=18, pady=4)

        self.status_indicator = ctk.CTkLabel(
            self.status_frame,
            text="●",
            font=ctk.CTkFont(size=16),
            text_color="#10B981"
        )
        self.status_indicator.pack(side="left", padx=(12, 6), pady=8)

        self.status_text = ctk.CTkLabel(
            self.status_frame,
            text="Active (localhost:3000)",
            font=ctk.CTkFont(size=12),
            text_color="#D1D5DB"
        )
        self.status_text.pack(side="left", pady=8)

        # Main Action: Open Web Studio
        self.open_btn = ctk.CTkButton(
            card,
            text="🌐 Open Web Dashboard",
            font=ctk.CTkFont(size=13, weight="bold"),
            fg_color="#FFFFFF",
            hover_color="#E5E7EB",
            text_color="#000000",
            corner_radius=12,
            height=38,
            command=self._on_open_dashboard
        )
        self.open_btn.pack(fill="x", padx=18, pady=(12, 6))

        # Action: Quick Record
        self.record_btn = ctk.CTkButton(
            card,
            text="🎙️ Quick Record Audio",
            font=ctk.CTkFont(size=12, weight="bold"),
            fg_color="#161B26",
            hover_color="#222A3A",
            border_width=1,
            border_color="#263147",
            text_color="#E5E7EB",
            corner_radius=12,
            height=36,
            command=self._on_toggle_record
        )
        self.record_btn.pack(fill="x", padx=18, pady=4)

        # Section Label
        vault_lbl = ctk.CTkLabel(
            card,
            text="LOCAL VAULT DIRECT ACCESS",
            font=ctk.CTkFont(size=10, weight="bold"),
            text_color="#6B7280"
        )
        vault_lbl.pack(anchor="w", padx=20, pady=(12, 4))

        # Vault Shortcuts Grid
        vault_row = ctk.CTkFrame(card, fg_color="transparent")
        vault_row.pack(fill="x", padx=18, pady=2)

        b_obsidian = ctk.CTkButton(
            vault_row,
            text="📝 Obsidian",
            font=ctk.CTkFont(size=11),
            fg_color="#131722",
            hover_color="#1E2435",
            corner_radius=10,
            height=32,
            command=lambda: open_folder(STORAGE_DIR / "markdown")
        )
        b_obsidian.pack(side="left", fill="x", expand=True, padx=(0, 4))

        b_anki = ctk.CTkButton(
            vault_row,
            text="🗂️ Anki",
            font=ctk.CTkFont(size=11),
            fg_color="#131722",
            hover_color="#1E2435",
            corner_radius=10,
            height=32,
            command=lambda: open_folder(STORAGE_DIR / "exports")
        )
        b_anki.pack(side="left", fill="x", expand=True, padx=4)

        b_vault = ctk.CTkButton(
            vault_row,
            text="📂 Vault",
            font=ctk.CTkFont(size=11),
            fg_color="#131722",
            hover_color="#1E2435",
            corner_radius=10,
            height=32,
            command=lambda: open_folder(STORAGE_DIR)
        )
        b_vault.pack(side="left", fill="x", expand=True, padx=(4, 0))

        # Bottom Controls
        footer = ctk.CTkFrame(card, fg_color="transparent")
        footer.pack(fill="x", padx=18, pady=(16, 12))

        b_restart = ctk.CTkButton(
            footer,
            text="🔄 Restart",
            font=ctk.CTkFont(size=11),
            fg_color="transparent",
            hover_color="#1A202C",
            text_color="#9CA3AF",
            corner_radius=8,
            height=28,
            command=self._on_restart
        )
        b_restart.pack(side="left")

        b_exit = ctk.CTkButton(
            footer,
            text="❌ Quit Nexus",
            font=ctk.CTkFont(size=11),
            fg_color="transparent",
            hover_color="#3B1219",
            text_color="#F87171",
            corner_radius=8,
            height=28,
            command=exit_application
        )
        b_exit.pack(side="right")

    def update_dynamic_state(self):
        state = audio_daemon.state
        if state.get("isRecording"):
            elapsed = int(time.time() - (state.get("startTime") or time.time()))
            mins = elapsed // 60
            secs = elapsed % 60
            target = state.get("targetName") or "Audio"
            self.status_indicator.configure(text_color="#EF4444")
            self.status_text.configure(text=f"Recording {target} ({mins:02d}:{secs:02d})")
            self.record_btn.configure(
                text="⏹️ Stop Recording & Synthesize",
                fg_color="#7F1D1D",
                hover_color="#991B1B"
            )
        elif state.get("isProcessing"):
            self.status_indicator.configure(text_color="#F59E0B")
            self.status_text.configure(text="Synthesizing Notes...")
            self.record_btn.configure(
                text="⚡ Synthesizing...",
                fg_color="#161B26",
                hover_color="#222A3A"
            )
        else:
            self.status_indicator.configure(text_color="#10B981")
            self.status_text.configure(text="Active (localhost:3000)")
            procs = audio_daemon.get_audio_processes()
            target = procs[0]["name"] if procs else "Audio"
            self.record_btn.configure(
                text=f"🎙️ Quick Record ({target})",
                fg_color="#161B26",
                hover_color="#222A3A"
            )

    def show_flyout(self):
        self.update_dynamic_state()
        self.deiconify()
        self.focus_force()

    def hide_flyout(self):
        self.withdraw()

    def _on_open_dashboard(self):
        open_web_studio()
        self.hide_flyout()

    def _on_toggle_record(self):
        state = audio_daemon.state
        if state.get("isRecording"):
            audio_daemon.stop_capture()
        else:
            procs = audio_daemon.get_audio_processes()
            if procs:
                audio_daemon.start_capture(procs[0]["pid"], procs[0]["name"])
        self.hide_flyout()

    def _on_restart(self):
        global next_process
        if next_process:
            try:
                subprocess.run(["taskkill", "/F", "/T", "/PID", str(next_process.pid)], capture_output=True)
            except Exception:
                pass
            next_process = None
        ensure_nextjs_running()
        self.hide_flyout()

def on_tray_action(icon, item=None):
    """Triggered on clicking or right-clicking tray icon: toggles modern flyout."""
    global flyout_window
    if flyout_window:
        if flyout_window.state() == "normal":
            flyout_window.after(0, flyout_window.hide_flyout)
        else:
            flyout_window.after(0, flyout_window.show_flyout)

def status_icon_updater(icon):
    """Periodically checks recording state to swap tray icon (green dot vs red pulsing)."""
    last_state = "idle"
    while True:
        try:
            time.sleep(1.5)
            state = audio_daemon.state
            current_state = "idle"
            if state.get("isRecording"):
                current_state = "recording"
            elif state.get("isProcessing"):
                current_state = "processing"

            if current_state != last_state:
                last_state = current_state
                icon.icon = make_tray_icon(current_state)
        except Exception:
            pass

def main():
    global tray_icon, flyout_window

    # 1. Start Audio Daemon in background daemon thread
    daemon_thread = threading.Thread(target=audio_daemon.run, daemon=True)
    daemon_thread.start()

    # 2. Start Next.js in background headless process
    threading.Thread(target=ensure_nextjs_running, daemon=True).start()

    # 3. Create Modern Dark Flyout Window (Runs on Tkinter Main Thread)
    flyout_window = ModernTrayFlyout()

    # 4. Create Tray Icon
    # Single click or right-click directly opens the sleek modern flyout
    initial_icon = make_tray_icon("idle")
    tray_icon = pystray.Icon(
        name="NexusStudio",
        icon=initial_icon,
        title="Nexus AI Lecture Studio",
        menu=pystray.Menu(
            pystray.MenuItem("⚡ Open Nexus Studio", on_tray_action, default=True),
            pystray.MenuItem("❌ Exit Nexus", lambda icon, it: exit_application())
        )
    )

    # 5. Start background icon updater
    threading.Thread(target=status_icon_updater, args=(tray_icon,), daemon=True).start()

    # 6. Run tray icon in secondary thread so Tkinter mainloop can own main thread
    threading.Thread(target=tray_icon.run, daemon=True).start()

    # 7. Open browser once on initial launch
    def delayed_open():
        time.sleep(2.0)
        open_web_studio()

    threading.Thread(target=delayed_open, daemon=True).start()

    # 8. Start CustomTkinter Event Loop on main thread
    flyout_window.mainloop()

if __name__ == "__main__":
    main()
