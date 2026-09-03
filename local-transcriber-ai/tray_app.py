"""
Nexus Windows System Tray Orchestrator
Runs silently in the Windows Taskbar Notification Area with dynamic status,
background daemon management, and zero visible command prompt windows.
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
from pystray import MenuItem as item

# Add current directory to path
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

# Global Process Handles
next_process = None
tray_icon = None

def make_tray_icon(state_type="idle"):
    """Creates a high-resolution 64x64 RGBA system tray icon with dynamic status beacon."""
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
    """Check if local HTTP server is already up."""
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

    # Launch npm run dev headless
    try:
        # CREATE_NO_WINDOW = 0x08000000 ensures NO CMD WINDOW is created
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

def get_dynamic_status_label(item=None):
    """Returns dynamic status for the right-click menu."""
    state = audio_daemon.state
    if state.get("isRecording"):
        elapsed = int(time.time() - (state.get("startTime") or time.time()))
        mins = elapsed // 60
        secs = elapsed % 60
        target = state.get("targetName") or "Audio"
        return f"🔴 Recording: {target} ({mins:02d}:{secs:02d})"
    elif state.get("isProcessing"):
        return "⚡ Synthesizing Lecture Notes..."
    else:
        return "🟢 Nexus Studio: Active (localhost:3000)"

def get_record_action_label(item=None):
    state = audio_daemon.state
    if state.get("isRecording"):
        return "⏹️ Stop Recording & Synthesize"
    else:
        # Check active processes
        procs = audio_daemon.get_audio_processes()
        target = procs[0]["name"] if procs else "System Audio"
        return f"🎙️ Quick Record ({target})"

def toggle_recording(icon=None, item=None):
    state = audio_daemon.state
    if state.get("isRecording"):
        audio_daemon.stop_capture()
    else:
        procs = audio_daemon.get_audio_processes()
        if procs:
            audio_daemon.start_capture(procs[0]["pid"], procs[0]["name"])
        else:
            if tray_icon:
                tray_icon.notify("No active audio playing. Start Teams, Chrome, or Zoom.", "Nexus Studio")

def restart_services(icon=None, item=None):
    global next_process
    if next_process:
        try:
            subprocess.run(["taskkill", "/F", "/T", "/PID", str(next_process.pid)], capture_output=True)
        except Exception:
            pass
        next_process = None
    ensure_nextjs_running()
    if tray_icon:
        tray_icon.notify("Web Studio restarted on http://localhost:3000", "Nexus Studio")

def exit_application(icon=None, item=None):
    """Clean exit: stop recording, kill background server, exit tray."""
    global next_process
    state = audio_daemon.state
    if state.get("isRecording"):
        audio_daemon.stop_capture()
        
    if next_process:
        try:
            subprocess.run(["taskkill", "/F", "/T", "/PID", str(next_process.pid)], capture_output=True)
        except Exception:
            pass

    if icon:
        icon.stop()
    os._exit(0)

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

def build_menu():
    """Builds the dynamic right-click menu for the Windows notification tray."""
    vault_menu = pystray.Menu(
        item("📂 Open Local Vault", lambda icon, it: open_folder(STORAGE_DIR)),
        item("📝 Open Markdown Notes", lambda icon, it: open_folder(STORAGE_DIR / "markdown")),
        item("🗂️ Open Anki Decks", lambda icon, it: open_folder(STORAGE_DIR / "exports")),
        item("🎵 Open Audio Recordings", lambda icon, it: open_folder(STORAGE_DIR / "recordings")),
    )

    return pystray.Menu(
        item(get_dynamic_status_label, lambda icon, it: None, enabled=False),
        pystray.Menu.SEPARATOR,
        item("🌐 Open Web Studio", lambda icon, it: open_web_studio(), default=True),
        item(get_record_action_label, lambda icon, it: toggle_recording(icon, it)),
        item("📁 Storage Vault", vault_menu),
        pystray.Menu.SEPARATOR,
        item("🔄 Restart Web Studio", lambda icon, it: restart_services(icon, it)),
        item("❌ Exit Nexus", lambda icon, it: exit_application(icon, it))
    )

def main():
    global tray_icon

    # 1. Start Audio Daemon in background daemon thread
    daemon_thread = threading.Thread(target=audio_daemon.run, daemon=True)
    daemon_thread.start()

    # 2. Start Next.js in background headless process
    threading.Thread(target=ensure_nextjs_running, daemon=True).start()

    # 3. Create Tray Icon
    initial_icon = make_tray_icon("idle")
    tray_icon = pystray.Icon(
        name="NexusStudio",
        icon=initial_icon,
        title="Nexus AI Lecture Studio",
        menu=build_menu()
    )

    # 4. Start background icon updater
    updater_thread = threading.Thread(target=status_icon_updater, args=(tray_icon,), daemon=True)
    updater_thread.start()

    # 5. Open browser automatically once on launch
    def delayed_open():
        time.sleep(2.0)
        open_web_studio()
        try:
            tray_icon.notify("Nexus Studio is running in the background. Right-click this icon for quick actions.", "Nexus Studio Active")
        except Exception:
            pass

    threading.Thread(target=delayed_open, daemon=True).start()

    # 6. Run tray icon main loop (blocks until exit)
    tray_icon.run()

if __name__ == "__main__":
    main()
