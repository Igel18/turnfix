@echo off
echo Starting TurnFix Web Application...

echo.
echo === Starting Backend Server ===
cd /d "C:\Users\prudlo\source\repos\turnfix\newWebBased\server"
start "TurnFix Backend" cmd /k "npm run dev"

echo.
echo === Starting Frontend Client ===
cd /d "C:\Users\prudlo\source\repos\turnfix\newWebBased\client"
start "TurnFix Frontend" cmd /k "npm run dev -- --host 0.0.0.0"

echo.
echo === Creating Test User ===
cd /d "C:\Users\prudlo\source\repos\turnfix\newWebBased\server"
node scripts/create-test-user.js

echo.
echo Application started!
echo Frontend: http://localhost:5173
echo Backend: http://localhost:3002
echo.
pause
