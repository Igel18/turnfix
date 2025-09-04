@echo off
REM TurnFix Uninstaller - Easy Access
REM This batch file provides easy access to the TurnFix uninstaller

title TurnFix Uninstaller

echo.
echo ========================================
echo           TurnFix Uninstaller
echo ========================================
echo.
echo This will help you remove TurnFix from your system.
echo.
echo Available options:
echo   1. Remove TurnFix application only
echo   2. Remove TurnFix + database 
echo   3. Remove everything (complete uninstall)
echo   4. Custom removal options
echo   5. Exit
echo.

:menu
set /p choice="Please select an option (1-5): "

if "%choice%"=="1" goto remove_app
if "%choice%"=="2" goto remove_app_db
if "%choice%"=="3" goto remove_all
if "%choice%"=="4" goto custom
if "%choice%"=="5" goto exit

echo Invalid choice. Please select 1-5.
goto menu

:remove_app
echo.
echo Removing TurnFix application only...
powershell -ExecutionPolicy Bypass -File "%~dp0uninstall-turnfix.ps1"
goto done

:remove_app_db
echo.
echo Removing TurnFix application and database...
powershell -ExecutionPolicy Bypass -File "%~dp0uninstall-turnfix.ps1" -RemoveDatabase
goto done

:remove_all
echo.
echo ⚠️  WARNING: This will remove TurnFix and ALL related components!
echo This includes: TurnFix, Database, PostgreSQL, Node.js, Git, VS Code, Chocolatey
echo.
set /p confirm="Are you sure? This cannot be undone! (y/N): "
if /i not "%confirm%"=="y" goto menu

echo.
echo Performing complete uninstall...
powershell -ExecutionPolicy Bypass -File "%~dp0uninstall-turnfix.ps1" -RemoveAll
goto done

:custom
echo.
echo Starting custom uninstall options...
echo You will be able to select individual components to remove.
powershell -ExecutionPolicy Bypass -File "%~dp0uninstall-turnfix.ps1"
goto done

:done
echo.
echo ========================================
echo        Uninstall Process Complete
echo ========================================
pause
goto exit

:exit
echo.
echo Goodbye!
exit /b 0
