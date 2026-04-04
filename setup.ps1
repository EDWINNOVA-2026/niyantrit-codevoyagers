#!/bin/bash
# Niyantrit Setup & Run Script for Windows (PowerShell)

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗"
Write-Host "║         🏗️  Niyantrit - Quick Setup & Launch              ║"
Write-Host "╚════════════════════════════════════════════════════════════╝"
Write-Host ""

# Colors
$Yellow = "`e[33m"
$Green = "`e[32m"
$Red = "`e[31m"
$Reset = "`e[0m"

# Configuration
$BACKEND_DIR = "$PSScriptRoot\niyantrit-backend"
$FRONTEND_DIR = "$PSScriptRoot\niyantrit-frontend"
$BACKEND_PORT = 8000
$FRONTEND_PORT = 3000

# Function to check if port is in use
function Test-PortInUse {
    param([int]$Port)
    $netstat = netstat -ano 2>$null | Select-String ":$Port"
    return $null -ne $netstat
}

Write-Host "${Yellow}[1/4]${Reset} Checking prerequisites..."
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "${Red}❌ Python not found. Please install Python 3.8+${Reset}"
    exit 1
}
Write-Host "${Green}✓${Reset} Python found"

# Check backend
Write-Host ""
Write-Host "${Yellow}[2/4]${Reset} Starting Backend (Port $BACKEND_PORT)..."

if (Test-PortInUse -Port $BACKEND_PORT) {
    Write-Host "${Red}⚠️  Port $BACKEND_PORT is already in use${Reset}"
    Write-Host "Attempting to kill existing process..."
    Get-NetTCPConnection -LocalPort $BACKEND_PORT -ErrorAction SilentlyContinue | 
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
    Start-Sleep -Seconds 2
}

# Start backend in new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$BACKEND_DIR'; python -m uvicorn main:app --host 127.0.0.1 --port $BACKEND_PORT --reload" -PassThru | Out-Null
Write-Host "${Green}✓${Reset} Backend started on http://localhost:$BACKEND_PORT"

# Wait for backend to be ready
Write-Host "Waiting for backend to initialize..."
$maxAttempts = 30
$attempt = 0
while ($attempt -lt $maxAttempts) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$BACKEND_PORT/health" -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            Write-Host "${Green}✓${Reset} Backend is ready!"
            break
        }
    }
    catch {
        Write-Host -NoNewline "."
        Start-Sleep -Milliseconds 500
        $attempt++
    }
}

# Check frontend
Write-Host ""
Write-Host "${Yellow}[3/4]${Reset} Starting Frontend (Port $FRONTEND_PORT)..."

if (Test-PortInUse -Port $FRONTEND_PORT) {
    Write-Host "${Red}⚠️  Port $FRONTEND_PORT is already in use${Reset}"
    Write-Host "Attempting to kill existing process..."
    Get-NetTCPConnection -LocalPort $FRONTEND_PORT -ErrorAction SilentlyContinue | 
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
    Start-Sleep -Seconds 2
}

# Start frontend in new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$FRONTEND_DIR'; python -m http.server $FRONTEND_PORT" -PassThru | Out-Null
Write-Host "${Green}✓${Reset} Frontend started on http://localhost:$FRONTEND_PORT"

Write-Host ""
Write-Host "${Yellow}[4/4]${Reset} Database Setup..."

# Check if database needs seeding
$DB_EXISTS = Test-Path "$BACKEND_DIR\niyantrit.db"
if ($DB_EXISTS) {
    Write-Host "Database found. Skipping seed."
    Write-Host "${Green}✓${Reset} Database already populated"
} else {
    Write-Host "Running database seed script..."
    Push-Location $BACKEND_DIR
    try {
        python seed_database.py
        Write-Host "${Green}✓${Reset} Database seeded successfully"
    }
    catch {
        Write-Host "${Red}❌ Seed script failed: $_${Reset}"
    }
    finally {
        Pop-Location
    }
}

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗"
Write-Host "║                    ✅ SETUP COMPLETE!                     ║"
Write-Host "╚════════════════════════════════════════════════════════════╝"
Write-Host ""
Write-Host "${Green}🌐 Access Niyantrit:${Reset}"
Write-Host "   Frontend:  ${Yellow}http://localhost:$FRONTEND_PORT/login.html${Reset}"
Write-Host "   API Docs:  ${Yellow}http://localhost:$BACKEND_PORT/docs${Reset}"
Write-Host ""
Write-Host "${Green}👤 Test Credentials:${Reset}"
Write-Host "   Email: ${Yellow}citizen@test.com${Reset}      | Password: ${Yellow}password123${Reset}"
Write-Host "   Email: ${Yellow}contractor@test.com${Reset}  | Password: ${Yellow}password123${Reset}"
Write-Host "   Email: ${Yellow}official@test.com${Reset}    | Password: ${Yellow}password123${Reset}"
Write-Host "   Email: ${Yellow}admin@test.com${Reset}        | Password: ${Yellow}password123${Reset}"
Write-Host ""
Write-Host "${Green}📊 Database Stats:${Reset}"
Write-Host "   • 200 test projects populated"
Write-Host "   • 4 test user accounts created"
Write-Host "   • 5 sample complaints for testing"
Write-Host "   • Risk scores calculated for all projects"
Write-Host ""
Write-Host "⏸️  Press Ctrl+C to stop servers"
Write-Host ""

# Keep script running
while ($true) { Start-Sleep -Seconds 60 }
