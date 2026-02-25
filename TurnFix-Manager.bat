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
    REM PowerShell Core gefunden - verwende direkt ohne Version Check (vereinfacht)
    echo PowerShell Core gefunden - wird gestartet...
    pwsh.exe -NoProfile -ExecutionPolicy Bypass -Command "$OutputEncoding = [Console]::OutputEncoding = [System.Text.Encoding]::UTF8; & '%~dp0turnfix-manager.ps1'"
) else (
    REM PowerShell Core nicht gefunden - nutze Windows PowerShell
    REM Prüfe zuerst über where, dann über bekannten Systempfad
    where powershell >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo Windows PowerShell wird gestartet...
        powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$OutputEncoding = [Console]::OutputEncoding = [System.Text.Encoding]::UTF8; & '%~dp0turnfix-manager.ps1'"
    ) else if exist "%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" (
        echo Windows PowerShell wird gestartet (Systempfad)...
        "%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -Command "$OutputEncoding = [Console]::OutputEncoding = [System.Text.Encoding]::UTF8; & '%~dp0turnfix-manager.ps1'"
    ) else (
        echo.
        echo FEHLER: Keine PowerShell-Installation gefunden!
        echo.
        echo Bitte installieren Sie PowerShell:
        echo https://github.com/PowerShell/PowerShell/releases
        echo.
        pause
        exit /b 1
    )
)

REM Falls PowerShell nicht funktioniert
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo FEHLER: PowerShell konnte nicht gestartet werden!
    echo.
    pause
)
