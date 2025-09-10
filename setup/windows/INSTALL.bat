@echo off
echo ======================================
echo        TurnFix Windows Setup
echo ======================================
echo.
echo This will install TurnFix and all required components.
echo Administrator privileges are recommended.
echo.
pause

powershell.exe -ExecutionPolicy Bypass -File "%~dp0complete-setup.ps1"

echo.
echo Setup completed. Check the window above for results.
pause
