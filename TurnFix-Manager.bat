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
    REM PowerShell Core gefunden - prüfe Version
    for /f "tokens=*" %%i in ('pwsh.exe -NoProfile -Command "$PSVersionTable.PSVersion.Major"') do set PS_VERSION=%%i
    
    if %PS_VERSION% LSS 7 (
        echo.
        echo WARNUNG: PowerShell Core Version %PS_VERSION% gefunden
        echo Empfohlen: PowerShell 7.0 oder neuer
        echo Download: https://github.com/PowerShell/PowerShell/releases
        echo.
        echo Verwende trotzdem diese Version...
        timeout /t 3 >nul
    )
    
    REM PowerShell Core - verwende -Command für UTF-8 Encoding
    pwsh.exe -NoProfile -ExecutionPolicy Bypass -Command "$OutputEncoding = [Console]::OutputEncoding = [System.Text.Encoding]::UTF8; & '%~dp0turnfix-manager.ps1'"
) else (
    REM PowerShell Core nicht gefunden - prüfe Windows PowerShell
    where powershell >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        REM Windows PowerShell gefunden - prüfe Version
        for /f "tokens=*" %%i in ('powershell.exe -NoProfile -Command "$PSVersionTable.PSVersion.Major"') do set PS_VERSION=%%i
        
        if %PS_VERSION% LSS 5 (
            echo.
            echo FEHLER: PowerShell Version %PS_VERSION% ist zu alt!
            echo Mindestanforderung: PowerShell 5.1 oder neuer
            echo.
            echo Bitte installieren Sie:
            echo - PowerShell Core 7.x: https://github.com/PowerShell/PowerShell/releases
            echo ODER
            echo - Windows Management Framework 5.1 für Windows PowerShell
            echo.
            pause
            exit /b 1
        )
        
        REM Windows PowerShell - verwende -Command für UTF-8 Encoding
        powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$OutputEncoding = [Console]::OutputEncoding = [System.Text.Encoding]::UTF8; & '%~dp0turnfix-manager.ps1'"
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
