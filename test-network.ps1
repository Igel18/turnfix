# TurnFix Network Test Script
# This script helps test if TurnFix is properly configured for network access

Write-Host "🔍 TurnFix Network Configuration Test" -ForegroundColor Green

# Get IP addresses
Write-Host "`n📍 Network Information:" -ForegroundColor Cyan
$ipAddresses = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { 
    $_.InterfaceAlias -notlike "*Loopback*" -and 
    $_.IPAddress -notlike "169.254.*" -and
    $_.PrefixOrigin -eq "Dhcp" -or $_.PrefixOrigin -eq "Manual"
}

foreach ($ip in $ipAddresses) {
    Write-Host "   Interface: $($ip.InterfaceAlias)" -ForegroundColor White
    Write-Host "   IP Address: $($ip.IPAddress)" -ForegroundColor Yellow
    Write-Host "   Network: $($ip.IPAddress)/$(ip.PrefixLength)" -ForegroundColor Gray
    Write-Host ""
}

# Check if ports are listening
Write-Host "🔌 Port Status Check:" -ForegroundColor Cyan

$frontendPort = 5173
$backendPort = 3001

# Check if processes are listening on the ports
$frontendListener = Get-NetTCPConnection -LocalPort $frontendPort -ErrorAction SilentlyContinue
$backendListener = Get-NetTCPConnection -LocalPort $backendPort -ErrorAction SilentlyContinue

if ($frontendListener) {
    Write-Host "   ✅ Frontend (Port $frontendPort): LISTENING" -ForegroundColor Green
    $frontendAddress = $frontendListener | Where-Object { $_.LocalAddress -eq "0.0.0.0" }
    if ($frontendAddress) {
        Write-Host "      📡 Accepting network connections" -ForegroundColor Green
    } else {
        Write-Host "      ⚠️  Only accepting localhost connections" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ❌ Frontend (Port $frontendPort): NOT RUNNING" -ForegroundColor Red
}

if ($backendListener) {
    Write-Host "   ✅ Backend (Port $backendPort): LISTENING" -ForegroundColor Green
    $backendAddress = $backendListener | Where-Object { $_.LocalAddress -eq "0.0.0.0" }
    if ($backendAddress) {
        Write-Host "      📡 Accepting network connections" -ForegroundColor Green
    } else {
        Write-Host "      ⚠️  Only accepting localhost connections" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ❌ Backend (Port $backendPort): NOT RUNNING" -ForegroundColor Red
}

# Check firewall rules
Write-Host "`n🛡️  Firewall Rules Check:" -ForegroundColor Cyan

$frontendRule = Get-NetFirewallRule -DisplayName "*TurnFix Frontend*" -ErrorAction SilentlyContinue
$backendRule = Get-NetFirewallRule -DisplayName "*TurnFix Backend*" -ErrorAction SilentlyContinue

if ($frontendRule) {
    Write-Host "   ✅ Frontend firewall rule: EXISTS" -ForegroundColor Green
} else {
    Write-Host "   ❌ Frontend firewall rule: MISSING" -ForegroundColor Red
    Write-Host "      Run setup-network.ps1 as Administrator to create firewall rules" -ForegroundColor Yellow
}

if ($backendRule) {
    Write-Host "   ✅ Backend firewall rule: EXISTS" -ForegroundColor Green
} else {
    Write-Host "   ❌ Backend firewall rule: MISSING" -ForegroundColor Red
    Write-Host "      Run setup-network.ps1 as Administrator to create firewall rules" -ForegroundColor Yellow
}

# Generate access URLs
Write-Host "`n🌐 Access URLs for Other Devices:" -ForegroundColor Cyan
$primaryIP = ($ipAddresses | Select-Object -First 1).IPAddress
if ($primaryIP) {
    Write-Host "   Frontend: http://$primaryIP`:$frontendPort" -ForegroundColor White
    Write-Host "   Backend:  http://$primaryIP`:$backendPort/api" -ForegroundColor White
} else {
    Write-Host "   ❌ No suitable IP address found" -ForegroundColor Red
}

# Summary
Write-Host "`n📋 Summary:" -ForegroundColor Yellow
if ($frontendListener -and $backendListener -and $frontendRule -and $backendRule) {
    Write-Host "   ✅ TurnFix is properly configured for network access!" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  TurnFix network configuration needs attention:" -ForegroundColor Yellow
    if (-not $frontendListener) { Write-Host "      - Start the frontend server" -ForegroundColor White }
    if (-not $backendListener) { Write-Host "      - Start the backend server" -ForegroundColor White }
    if (-not $frontendRule -or -not $backendRule) { Write-Host "      - Run setup-network.ps1 as Administrator" -ForegroundColor White }
}

Write-Host "`nPress any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
