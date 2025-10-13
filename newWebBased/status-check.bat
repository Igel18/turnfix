@echo off
setlocal enabledelayedexpansion
color 0B
title TurnFix Service Status

echo ========================================
echo    TurnFix Service Status Check
echo ========================================
echo.
echo [INFO] Checking all TurnFix services...
echo.

REM Check ports
echo ========================================
echo    Port Status
echo ========================================
echo.

set RUNNING_COUNT=0

REM Backend (Port 3001)
echo [CHECK] Backend Server (Port 3001)...
netstat -ano | findstr :3001 | findstr LISTENING >nul 2>&1
if !errorlevel! equ 0 (
    echo [RUNNING] Backend is running on port 3001
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001 ^| findstr LISTENING') do (
        echo [INFO] Process ID: %%a
    )
    set /a RUNNING_COUNT+=1
) else (
    echo [STOPPED] Backend is not running
)
echo.

REM Frontend (Port 5173)
echo [CHECK] Frontend Client (Port 5173)...
netstat -ano | findstr :5173 | findstr LISTENING >nul 2>&1
if !errorlevel! equ 0 (
    echo [RUNNING] Frontend is running on port 5173
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173 ^| findstr LISTENING') do (
        echo [INFO] Process ID: %%a
    )
    set /a RUNNING_COUNT+=1
) else (
    echo [STOPPED] Frontend is not running
)
echo.

REM Jury Portal (Port 5174)
echo [CHECK] Jury Portal (Port 5174)...
netstat -ano | findstr :5174 | findstr LISTENING >nul 2>&1
if !errorlevel! equ 0 (
    echo [RUNNING] Jury Portal is running on port 5174
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5174 ^| findstr LISTENING') do (
        echo [INFO] Process ID: %%a
    )
    set /a RUNNING_COUNT+=1
) else (
    echo [STOPPED] Jury Portal is not running
)
echo.

echo ========================================
echo    Summary
echo ========================================
echo.
echo Services running: !RUNNING_COUNT! / 3
echo.

if !RUNNING_COUNT! equ 3 (
    echo [SUCCESS] All services are running!
    echo.
    echo ----------------------------------------
    echo    Access URLs:
    echo ----------------------------------------
    echo.
    echo   Frontend:    http://localhost:5173
    echo   Backend API: http://localhost:3001/api
    echo   Jury Portal: http://localhost:5174
    echo.
) else if !RUNNING_COUNT! equ 0 (
    echo [INFO] No services are running
    echo [ACTION] Run start-dev.bat to start all services
    echo.
) else (
    echo [WARNING] Some services are not running
    echo [ACTION] Run stop-dev.bat and then start-dev.bat to restart
    echo.
)

echo ========================================
echo    Node Processes
echo ========================================
echo.

tasklist /FI "IMAGENAME eq node.exe" /FO TABLE 2>nul | findstr /I "node.exe" >nul
if !errorlevel! equ 0 (
    echo [INFO] Active Node.js processes:
    echo.
    tasklist /FI "IMAGENAME eq node.exe" /FO TABLE
    echo.
) else (
    echo [INFO] No Node.js processes running
    echo.
)

echo Press any key to close...
pause >nul
