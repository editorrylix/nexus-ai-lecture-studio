@echo off
title Nexus AI Lecture Studio
cd /d "%~dp0"

:: Clean up any orphaned process on port 5005
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 5005 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }" 2>nul

:: Launch Native Tray Orchestrator in Background
start "" "%~dp0local-transcriber-ai\venv\Scripts\pythonw.exe" "%~dp0local-transcriber-ai\tray_app.py"

:: Wait briefly and open Web Studio in default browser
timeout /t 2 /nobreak >nul
start "" "http://localhost:3000"
exit
