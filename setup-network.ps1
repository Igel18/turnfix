# TurnFix Network Setup Script
# Run as Administrator

Write-Host "🔧 Configuring Windows Firewall for TurnFix..." -ForegroundColor Green

# Create firewall rules for TurnFix
try {
    New-NetFirewallRule -DisplayName "TurnFix Frontend (Port 5173)" -Direction Inbound -Port 5173 -Protocol TCP -Action Allow -ErrorAction Stop
    Write-Host "✅ Frontend firewall rule created (Port 5173)" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Frontend firewall rule may already exist" -ForegroundColor Yellow
}

try {
    New-NetFirewallRule -DisplayName "TurnFix Backend (Port 3001)" -Direction Inbound -Port 3001 -Protocol TCP -Action Allow -ErrorAction Stop
    Write-Host "✅ Backend firewall rule created (Port 3001)" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Backend firewall rule may already exist" -ForegroundColor Yellow
}

# Get IP address
Write-Host "`n🌐 Your IP Address Information:" -ForegroundColor Cyan
$ipInfo = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike "*Loopback*" -and $_.IPAddress -notlike "169.254.*" }
foreach ($ip in $ipInfo) {
    Write-Host "   Network: $($ip.InterfaceAlias) - IP: $($ip.IPAddress)" -ForegroundColor White
}

Write-Host "`n📋 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Start TurnFix servers using the start-servers.ps1 script" -ForegroundColor White
Write-Host "2. Other PCs can access TurnFix at: http://YOUR_IP:5173" -ForegroundColor White
Write-Host "3. Replace YOUR_IP with one of the IP addresses shown above" -ForegroundColor White

Write-Host "`n🚀 Firewall configuration complete!" -ForegroundColor Green
