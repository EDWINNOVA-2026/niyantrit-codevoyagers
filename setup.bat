@echo off
REM Niyantrit Setup & Run Script for Windows (Batch)

setlocal enabledelayedexpansion

echo.
echo ============================================================
echo.
echo            ^<F7^> Niyantrit - Quick Setup
echo.
echo ============================================================
echo.

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found. Please install Python 3.8+
    pause
    exit /b 1
)
echo [✓] Python found

REM Backend setup
echo.
echo [1/3] Setting up Backend...
cd niyantrit-backend

REM Create venv if not exists
if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate venv
call venv\Scripts\activate.bat

REM Install dependencies
echo Installing dependencies...
pip install -r requirements.txt --quiet

REM Run seed script
echo.
echo [2/3] Seeding database...
python seed_database.py

REM Start backend
echo.
echo [3/3] Starting servers...
echo [✓] Backend will start in a new window on port 8000
start cmd /k "python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload"

cd ..
cd niyantrit-frontend
echo [✓] Frontend will start in a new window on port 3000
start cmd /k "python -m http.server 3000"

echo.
echo ============================================================
echo         ^<✓^> SETUP COMPLETE!
echo ============================================================
echo.
echo Access Niyantrit:
echo   Frontend:  http://localhost:3000/login.html
echo   API Docs:  http://localhost:8000/docs
echo.
echo Test Credentials:
echo   Email: citizen@test.com       ^| Password: password123
echo   Email: contractor@test.com    ^| Password: password123
echo   Email: official@test.com      ^| Password: password123
echo   Email: admin@test.com         ^| Password: password123
echo.
echo ============================================================
echo.

pause
