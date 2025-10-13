@echo off
setlocal enabledelayedexpansion
color 0C
title TurnFix Development Shutdown

echo ========================================
echo    TurnFix Application Shutdown
echo ========================================
echo.

echo [INFO] Stopping all TurnFix services...
echo.

REM Kill processes on specific ports
echo ========================================
echo    Stopping processes on ports
echo ========================================
echo.

set STOPPED_COUNT=0

for %%P in (3001 3002 5173 5174) do (
    echo [INFO] Checking port %%P...
    set FOUND=0
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%%P ^| findstr LISTENING 2^>nul') do (
        set PID=%%a
        if not "!PID!"=="0" (
            set FOUND=1
            echo [ACTION] Stopping process !PID! on port %%P
            taskkill /F /PID !PID! >nul 2>&1
            if !errorlevel! equ 0 (
                echo [SUCCESS] Process !PID! stopped
                set /a STOPPED_COUNT+=1
            ) else (
                echo [WARNING] Could not stop process !PID!
            )
        )
    )
    if !FOUND!==0 (
        echo [INFO] No process found on port %%P
    )
    echo.
)

REM Also try to kill by window title
echo ========================================
echo    Closing windows by title
echo ========================================
echo.

for %%T in ("TurnFix Backend" "TurnFix Frontend" "TurnFix Jury Portal") do (
    echo [INFO] Checking for window: %%~T
    taskkill /FI "WINDOWTITLE eq %%~T*" /F >nul 2>&1
    if !errorlevel! equ 0 (
        echo [SUCCESS] Closed window: %%~T
    )
)

echo.
echo ========================================
echo    Shutdown Complete
echo ========================================
echo.

if !STOPPED_COUNT! gtr 0 (
    echo [SUCCESS] Stopped !STOPPED_COUNT! process(es)
) else (
    echo [INFO] No TurnFix processes were running
)

echo.
echo [INFO] All TurnFix services have been stopped
echo.
echo Press any key to close this window...
pause >nul
