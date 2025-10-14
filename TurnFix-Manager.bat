@echo off
REM TurnFix Manager - Einfacher Doppelklick-Start
REM Dieses Script startet das benutzerfreundliche TurnFix Management-Menü

echo.
echo ========================================
echo    TurnFix Manager wird gestartet...
echo ========================================
echo.

REM Prüfe ob PowerShell verfügbar ist
where pwsh >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    REM PowerShell Core gefunden
    pwsh.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0turnfix-manager.ps1"
) else (
    REM Nutze Windows PowerShell
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0turnfix-manager.ps1"
)

REM Falls PowerShell nicht funktioniert
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo FEHLER: PowerShell konnte nicht gestartet werden!
    echo.
    pause
)
