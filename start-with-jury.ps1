# TurnFix with Jury Portal Startup Script
Write-Host "🏆 Starting TurnFix with Jury Portal..." -ForegroundColor Green

# Get the network IP address
$networkIP = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "Wi-Fi" | Where-Object { $_.IPAddress -notlike "169.254.*" }).IPAddress
if (-not $networkIP) {
    $networkIP = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "Ethernet" | Where-Object { $_.IPAddress -notlike "169.254.*" }).IPAddress
}
if (-not $networkIP) {
    $networkIP = "localhost"
}

Write-Host "📡 Network IP detected: $networkIP" -ForegroundColor Yellow

# Set environment variable for API URL
$env:VITE_API_URL = "http://${networkIP}:3001/api"

Write-Host ""
Write-Host "🚀 Starting services..." -ForegroundColor Cyan
Write-Host "  📊 Main Server (API): http://localhost:3001" -ForegroundColor White
Write-Host "  🖥️  Main Dashboard: http://localhost:5173" -ForegroundColor White
Write-Host "  ⚖️  Jury Portal: http://localhost:5174" -ForegroundColor Yellow
Write-Host "  🌐 Main Client: http://localhost:5173" -ForegroundColor White
Write-Host "  🏆 Jury Portal: http://localhost:5174" -ForegroundColor Yellow
Write-Host "  📱 Network Jury Portal: http://${networkIP}:5174" -ForegroundColor Green

Write-Host ""
Write-Host "📋 Access URLs for Jury:" -ForegroundColor Magenta
Write-Host "  🖥️  Desktop: http://localhost:5174" -ForegroundColor White
Write-Host "  📱 Mobile: http://${networkIP}:5174" -ForegroundColor White
Write-Host "  🌐 QR Code: Generate QR for http://${networkIP}:5174" -ForegroundColor Gray

Write-Host ""
Write-Host "⚡ Starting servers concurrently..." -ForegroundColor Green

# Start main server
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'c:\Users\Dominik Prudlo\Documents\GitHub\turnfix\newWebBased\server'; Write-Host '📊 Starting Main Server...' -ForegroundColor Blue; npm run dev"

# Wait a moment for server to start
Start-Sleep -Seconds 3

# Start main client  
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'c:\Users\Dominik Prudlo\Documents\GitHub\turnfix\newWebBased\client'; Write-Host '🌐 Starting Main Client...' -ForegroundColor Blue; npm run dev"

# Wait a moment
Start-Sleep -Seconds 2

# Start jury portal (separate app)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'c:\Users\Dominik Prudlo\Documents\GitHub\turnfix\newWebBased\jury-portal'; Write-Host '⚖️  Starting Jury Portal (Separate)...' -ForegroundColor Yellow; npm run dev"

Write-Host ""
Write-Host "✅ All services are starting!" -ForegroundColor Green
Write-Host ""
Write-Host "🎯 Jury Portal Features:" -ForegroundColor Cyan
Write-Host "  ✓ Dedicated port (5174) - no dashboard confusion" -ForegroundColor White
Write-Host "  ✓ Real data from database" -ForegroundColor White  
Write-Host "  ✓ Actual participants per squad/device" -ForegroundColor White
Write-Host "  ✓ Mobile-friendly interface" -ForegroundColor White
Write-Host "  ✓ Network accessible for tablets/phones" -ForegroundColor White

Write-Host ""
Write-Host "⏰ Please wait 10-15 seconds for all services to be ready..." -ForegroundColor Yellow

# Optional: Open browsers
Write-Host ""
$openBrowser = Read-Host "Open browsers automatically? (y/n)"
if ($openBrowser -eq "y") {
    Start-Sleep -Seconds 5
    Start-Process "http://localhost:5173"  # Main app
    Start-Process "http://localhost:5174"  # Jury portal
}

Write-Host ""
Write-Host "🏁 Setup complete! All services should be running." -ForegroundColor Green
