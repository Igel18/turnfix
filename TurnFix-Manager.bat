@echo off
REM TurnFix Manager - Einfacher Doppelklick-Start
REM Dieses Script startet das benutzerfreundliche TurnFix Management-Menü

REM Setze Code Page auf UTF-8 für korrekte Darstellung von Umlauten und Sonderzeichen
chcp 65001 >nul 2>&1

echo.
echo ========================================
echo    TurnFix Manager wird gestartet...
echo ========================================
echo.

REM Prüfe ob PowerShell verfügbar ist
where pwsh >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    REM PowerShell Core gefunden - mit UTF-8 Encoding
    pwsh.exe -NoProfile -ExecutionPolicy Bypass -OutputEncoding UTF8 -File "%~dp0turnfix-manager.ps1"
) else (
    REM Nutze Windows PowerShell - mit UTF-8 Encoding
    powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; & '%~dp0turnfix-manager.ps1'"
)

REM Falls PowerShell nicht funktioniert
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo FEHLER: PowerShell konnte nicht gestartet werden!
    echo.
    pause
)
