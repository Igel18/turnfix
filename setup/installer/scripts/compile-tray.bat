@echo off
REM ============================================================================
REM Compile TurnFixTray.exe from TurnFixTray.cs
REM Uses csc.exe from .NET Framework (already installed on every Windows PC)
REM ============================================================================

setlocal

REM Find csc.exe from .NET Framework 4.x
set "CSC="
for /d %%d in (%WINDIR%\Microsoft.NET\Framework64\v4.0.*) do set "CSC=%%d\csc.exe"
if not exist "%CSC%" (
    for /d %%d in (%WINDIR%\Microsoft.NET\Framework\v4.0.*) do set "CSC=%%d\csc.exe"
)

if not exist "%CSC%" (
    echo ERROR: csc.exe not found. .NET Framework 4.x required.
    exit /b 1
)

echo Using: %CSC%

REM Locate turnfix.ico
set "ICO=%~dp0..\..\..\resources\turnfix.ico"
if not exist "%ICO%" (
    echo WARNING: turnfix.ico not found at %ICO%
    echo Compiling without icon...
    set "ICO_FLAG="
) else (
    echo Icon: %ICO%
    set "ICO_FLAG=/win32icon:"%ICO%""
)

REM Compile
"%CSC%" /nologo /target:winexe /optimize /out:"%~dp0TurnFixTray.exe" ^
    %ICO_FLAG% ^
    /reference:System.dll ^
    /reference:System.Drawing.dll ^
    /reference:System.Windows.Forms.dll ^
    /reference:System.ServiceProcess.dll ^
    "%~dp0TurnFixTray.cs"

if %ERRORLEVEL% equ 0 (
    echo.
    REM Copy turnfix.ico next to exe so it can be loaded at runtime
    if exist "%ICO%" (
        copy /Y "%ICO%" "%~dp0turnfix.ico" >nul
        echo SUCCESS: TurnFixTray.exe + turnfix.ico created.
    ) else (
        echo SUCCESS: TurnFixTray.exe created ^(without icon^).
    )
    echo.
) else (
    echo.
    echo FAILED: Compilation errors occurred.
    exit /b 1
)
