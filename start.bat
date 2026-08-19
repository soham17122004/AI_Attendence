@echo off
title SmartAttend AI Launcher
echo ===================================================
echo             SmartAttend AI Launcher
echo ===================================================
echo.

echo Starting Backend Server...
start "SmartAttend Backend" cmd /k "cd backend && .\venv\Scripts\python -m uvicorn app.main:app --host 0.0.0.0 --port 8000"

echo Starting Frontend Admin Panel...
start "SmartAttend Frontend" cmd /k "cd frontend && npm run dev"

echo Starting Mobile Phone Scanner...
start "SmartAttend Mobile" cmd /k "cd mobile && npm run dev"

echo Starting Cloudflare Tunnel...
start "SmartAttend Tunnel" cmd /k "cd backend && .\venv\Scripts\python -u .\scratch\start_cloudflare.py"

echo.
echo ===================================================
echo All services launched!
echo Check the "SmartAttend Tunnel" window for the URL.
echo ===================================================
pause
