# TurnFix Server Startup Script with Network Access
# This script starts both frontend and backend servers configured for network access

Write-Host "🚀 Starting TurnFix Servers with Network Access..." -ForegroundColor Green

# Get the script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$serverDir = Join-Path $scriptDir "newWebBased\server"
$clientDir = Join-Path $scriptDir "newWebBased\client"

# Get local IP address for display
$localIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike "*Loopback*" -and $_.IPAddress -notlike "169.254.*" } | Select-Object -First 1).IPAddress

Write-Host "📍 Your TurnFix will be accessible at:" -ForegroundColor Cyan
Write-Host "   Frontend: http://$localIP`:5173" -ForegroundColor White
Write-Host "   Backend:  http://$localIP`:3001/api" -ForegroundColor White

# Function to start servers in new windows
function Start-ServerInNewWindow {
    param(
        [string]$Title,
        [string]$WorkingDirectory,
        [string]$Command
    )
    
    Start-Process powershell -ArgumentList @(
        "-NoExit",
        "-Command", 
        "Write-Host '🔧 $Title' -ForegroundColor Green; cd '$WorkingDirectory'; $Command"
    ) -WindowStyle Normal
}

Write-Host "`n🔄 Starting servers..." -ForegroundColor Yellow

# Start backend server
Write-Host "Starting backend server..." -ForegroundColor White
Start-ServerInNewWindow -Title "TurnFix Backend Server" -WorkingDirectory $serverDir -Command "npm run dev"

# Wait a moment for backend to start
Start-Sleep -Seconds 3

# Start frontend server with network access
Write-Host "Starting frontend server with network access..." -ForegroundColor White
Start-ServerInNewWindow -Title "TurnFix Frontend Server" -WorkingDirectory $clientDir -Command "npm run dev"

Write-Host "`n✅ Servers are starting..." -ForegroundColor Green
Write-Host "📱 Other devices can now access TurnFix at: http://$localIP`:5173" -ForegroundColor Cyan
Write-Host "⏱️  Please wait a few moments for servers to fully start up." -ForegroundColor Yellow

# Keep the script window open
Write-Host "`nPress any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
