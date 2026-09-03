@echo off
title Nexus - AI Lecture & Meeting Studio
echo ===================================================
echo   Nexus - All-in-One Local AI Studio Launching...
echo ===================================================
echo.

cd /d "%~dp0"

echo [1/3] Launching Background Audio Controller Daemon...
start "Nexus Audio Daemon" /min "%~dp0local-transcriber-ai\venv\Scripts\python.exe" "%~dp0local-transcriber-ai\audio_daemon.py"

echo [2/3] Launching Next.js Studio Dashboard...
cd "%~dp0web-dashboard"
start "Nexus Dashboard Server" cmd /k "npm run dev"

echo [3/3] Opening Browser Studio in 3 seconds...
timeout /t 3 /nobreak >nul
start http://localhost:3000

echo.
echo ===================================================
echo   Nexus Studio is live at http://localhost:3000
echo   You can close this launcher window at any time.
echo ===================================================
timeout /t 5
