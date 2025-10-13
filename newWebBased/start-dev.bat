@echo off
setlocal enabledelayedexpansion
color 0A
title TurnFix Development Startup

echo ========================================
echo    TurnFix Web Application Startup
echo ========================================
echo.

REM Change to correct directory
cd /d "%~dp0"

REM Check if we're in the right directory
if not exist "server" (
    echo [ERROR] Server directory not found!
    echo Current directory: %CD%
    echo Please run this script from: newWebBased directory
    pause
    exit /b 1
)

echo [INFO] Current directory: %CD%
echo.

echo ========================================
echo    Step 1: Stopping existing processes
echo ========================================
echo.

REM Kill processes on specific ports
echo [INFO] Checking for processes on ports 3001, 3002, 5173, 5174...
for %%P in (3001 3002 5173 5174) do (
    echo [INFO] Checking port %%P...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%%P ^| findstr LISTENING') do (
        set PID=%%a
        if not "!PID!"=="0" (
            echo [ACTION] Stopping process !PID! on port %%P
            taskkill /F /PID !PID! >nul 2>&1
            if !errorlevel! equ 0 (
                echo [SUCCESS] Process !PID! stopped
            ) else (
                echo [WARNING] Could not stop process !PID!
            )
        )
    )
)

echo.
echo [INFO] Waiting 2 seconds for ports to be released...
timeout /t 2 /nobreak >nul
echo.

echo ========================================
echo    Step 2: Starting Backend Server
echo ========================================
echo.
echo [INFO] Port: 3001
echo [INFO] Directory: %CD%\server
echo [INFO] Command: npm run dev
echo.

if not exist "server\package.json" (
    echo [ERROR] Server package.json not found!
    pause
    exit /b 1
)

cd /d "%CD%\server"
start "TurnFix Backend (Port 3001)" cmd /k "title TurnFix Backend ^& color 0B ^& echo ======================================== ^& echo    TurnFix Backend Server ^& echo    Port: 3001 ^& echo ======================================== ^& echo. ^& npm run dev"
cd ..

echo [SUCCESS] Backend server starting...
timeout /t 3 /nobreak >nul
echo.

echo ========================================
echo    Step 3: Starting Frontend Client
echo ========================================
echo.
echo [INFO] Port: 5173
echo [INFO] Directory: %CD%\client
echo [INFO] Command: npm run dev -- --host 0.0.0.0
echo.

if not exist "client\package.json" (
    echo [ERROR] Client package.json not found!
    pause
    exit /b 1
)

cd /d "%CD%\client"
start "TurnFix Frontend (Port 5173)" cmd /k "title TurnFix Frontend ^& color 0E ^& echo ======================================== ^& echo    TurnFix Frontend Client ^& echo    Port: 5173 ^& echo    Network: 0.0.0.0 ^& echo ======================================== ^& echo. ^& npm run dev -- --host 0.0.0.0"
cd ..

echo [SUCCESS] Frontend client starting...
timeout /t 3 /nobreak >nul
echo.

echo ========================================
echo    Step 4: Starting Jury Portal
echo ========================================
echo.
echo [INFO] Port: 5174
echo [INFO] Directory: %CD%\jury-portal
echo [INFO] Command: npm run dev
echo.

if not exist "jury-portal\package.json" (
    echo [WARNING] Jury Portal package.json not found!
    echo [INFO] Skipping Jury Portal startup
    set JURY_PORTAL_STARTED=0
) else (
    cd /d "%CD%\jury-portal"
    start "TurnFix Jury Portal (Port 5174)" cmd /k "title TurnFix Jury Portal ^& color 0D ^& echo ======================================== ^& echo    TurnFix Jury Portal ^& echo    Port: 5174 ^& echo    Network: 0.0.0.0 ^& echo ======================================== ^& echo. ^& npm run dev"
    cd ..
    echo [SUCCESS] Jury Portal starting...
    set JURY_PORTAL_STARTED=1
    timeout /t 3 /nobreak >nul
)

echo.

echo ========================================
echo    Step 5: Creating Test User
echo ========================================
echo.
echo [INFO] Running test user creation script...
echo.

if exist "server\scripts\create-test-user.js" (
    cd /d "%CD%\server"
    node scripts\create-test-user.js
    cd ..
    echo.
) else (
    echo [WARNING] Test user script not found: server\scripts\create-test-user.js
    echo [INFO] Skipping test user creation
    echo.
)

echo ========================================
echo    TurnFix Application Started!
echo ========================================
echo.
echo [SUCCESS] All services are starting up...
echo.
echo ----------------------------------------
echo    Access URLs:
echo ----------------------------------------
echo.
echo   Frontend (Main App):
echo   ^> http://localhost:5173
echo   ^> http://127.0.0.1:5173
echo.
echo   Backend API:
echo   ^> http://localhost:3001/api
echo   ^> http://127.0.0.1:3001/api
echo.
if "!JURY_PORTAL_STARTED!"=="1" (
    echo   Jury Portal:
    echo   ^> http://localhost:5174
    echo   ^> http://127.0.0.1:5174
    echo.
)
echo ----------------------------------------
echo    Network Access:
echo ----------------------------------------
echo.
echo   To access from other devices, use:
echo   ^> http://YOUR-IP:5173  (Frontend)
if "!JURY_PORTAL_STARTED!"=="1" (
    echo   ^> http://YOUR-IP:5174  (Jury Portal)
)
echo.
echo   Find your IP address with: ipconfig
echo   See FIREWALL_SETUP.md for network configuration
echo.
echo ----------------------------------------
echo    Logs:
echo ----------------------------------------
echo.
echo   Each service runs in its own window
echo   Check the titled windows for live logs:
echo   - TurnFix Backend (Blue)
echo   - TurnFix Frontend (Yellow)
if "!JURY_PORTAL_STARTED!"=="1" (
    echo   - TurnFix Jury Portal (Purple)
)
echo.
echo ----------------------------------------
echo.
echo [INFO] Press any key to close this window
echo [INFO] The services will continue running
echo.
pause >nul
