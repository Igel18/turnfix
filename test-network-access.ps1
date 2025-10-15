# TurnFix Network Access Test
# Testet alle wichtigen Endpoints

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   TurnFix Network Access Test" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get network IP
$networkIP = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "Ethernet*", "Wi-Fi*" | 
              Where-Object { $_.IPAddress -notlike "169.254.*" } | 
              Select-Object -First 1).IPAddress

Write-Host "🌐 Netzwerk-IP: $networkIP" -ForegroundColor Green
Write-Host ""

# Test endpoints
$tests = @(
    @{ Name = "Main Server (localhost)"; URL = "http://localhost:3001/health" }
    @{ Name = "Main Server (network)"; URL = "http://${networkIP}:3001/health" }
    @{ Name = "Jury Portal (localhost)"; URL = "http://localhost:3002/api/health" }
    @{ Name = "Jury Portal (network)"; URL = "http://${networkIP}:3002/api/health" }
    @{ Name = "Frontend (localhost)"; URL = "http://localhost:3001/" }
    @{ Name = "Frontend (network)"; URL = "http://${networkIP}:3001/" }
)

foreach ($test in $tests) {
    try {
        Write-Host "Testing: $($test.Name)..." -NoNewline
        $response = Invoke-WebRequest -Uri $test.URL -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
        Write-Host " ✅ OK (Status: $($response.StatusCode))" -ForegroundColor Green
    }
    catch {
        Write-Host " ❌ FAILED" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Access URLs" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Lokal:" -ForegroundColor Yellow
Write-Host "  Main App:     http://localhost:3001" -ForegroundColor White
Write-Host "  Jury Portal:  http://localhost:3002" -ForegroundColor White
Write-Host ""
Write-Host "Netzwerk (von anderen Geräten):" -ForegroundColor Yellow
Write-Host "  Main App:     http://${networkIP}:3001" -ForegroundColor White
Write-Host "  Jury Portal:  http://${networkIP}:3002" -ForegroundColor White
Write-Host ""

Write-Host "Drücken Sie eine beliebige Taste zum Beenden..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
