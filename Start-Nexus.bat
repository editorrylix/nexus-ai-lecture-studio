@echo off
:: Nexus Studio Background Launcher (Zero Console Window)
start "" "%~dp0local-transcriber-ai\venv\Scripts\pythonw.exe" "%~dp0local-transcriber-ai\tray_app.py"
exit
