@echo off
setlocal EnableDelayedExpansion
REM TurnFix Manager - Einfacher Doppelklick-Start
REM Dieses Script startet das benutzerfreundliche TurnFix Management-Menü

REM Setze Code Page auf UTF-8 für korrekte Darstellung von Umlauten und Sonderzeichen
chcp 65001 >nul 2>&1

echo.
echo ========================================
echo    TurnFix Manager wird gestartet...
echo ========================================
echo.

REM Ermittle Script-Verzeichnis
set "SCRIPT_DIR=%~dp0"

REM Suche PowerShell in dieser Reihenfolge:
REM 1. pwsh (PowerShell Core 7+)
REM 2. powershell.exe im PATH
REM 3. powershell.exe am bekannten Windows-Systempfad
set "PS_EXE="

REM 1. Prüfe PowerShell Core
where pwsh >nul 2>&1
if !ERRORLEVEL! EQU 0 (
    set "PS_EXE=pwsh.exe"
    echo PowerShell Core gefunden.
    goto :FOUND_PS
)

REM 2. Prüfe powershell im PATH
where powershell >nul 2>&1
if !ERRORLEVEL! EQU 0 (
    set "PS_EXE=powershell.exe"
    echo Windows PowerShell gefunden.
    goto :FOUND_PS
)

REM 3. Prüfe am bekannten Systempfad
if exist "%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" (
    set "PS_EXE=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
    echo Windows PowerShell gefunden (Systempfad).
    goto :FOUND_PS
)

REM Keine PowerShell gefunden
echo.
echo FEHLER: Keine PowerShell-Installation gefunden!
echo.
echo Bitte installieren Sie PowerShell:
echo https://github.com/PowerShell/PowerShell/releases
echo.
pause
exit /b 1

:FOUND_PS
echo Starte TurnFix Manager...
echo.

REM Prüfe ob turnfix-manager.ps1 existiert
if not exist "%SCRIPT_DIR%turnfix-manager.ps1" (
    echo FEHLER: turnfix-manager.ps1 nicht gefunden!
    echo Erwartet in: %SCRIPT_DIR%
    echo.
    pause
    exit /b 1
)

REM Starte PowerShell mit dem Manager-Script
"%PS_EXE%" -NoProfile -ExecutionPolicy Bypass -Command "$OutputEncoding = [Console]::OutputEncoding = [System.Text.Encoding]::UTF8; & '%SCRIPT_DIR%turnfix-manager.ps1'"

REM Falls PowerShell mit Fehler beendet
if !ERRORLEVEL! NEQ 0 (
    echo.
    echo FEHLER: TurnFix Manager wurde mit Fehlercode !ERRORLEVEL! beendet.
    echo.
    pause
)

endlocal
