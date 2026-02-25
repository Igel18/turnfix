# ============================================================================
# TurnFix - Firewall Configuration Script
# ============================================================================
# Creates Windows Firewall rules for TurnFix network access
# Called by the Inno Setup installer during post-install
# ============================================================================

param(
    [string]$ServerPort = "3001",
    [string]$JuryPort = "3002"
)

$ErrorActionPreference = "SilentlyContinue"

Write-Host "  Configuring Windows Firewall..." -ForegroundColor Cyan

# Remove existing rules first (idempotent)
netsh advfirewall firewall delete rule name="TurnFix Server" 2>&1 | Out-Null
netsh advfirewall firewall delete rule name="TurnFix Jury Portal" 2>&1 | Out-Null

# Add TurnFix Server rule (TCP inbound)
netsh advfirewall firewall add rule `
    name="TurnFix Server" `
    dir=in `
    action=allow `
    protocol=TCP `
    localport=$ServerPort `
    enable=yes `
    profile=private `
    description="TurnFix Turnwettkampf Verwaltung - Haupt-Server"

if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ Firewall rule for TurnFix Server (Port $ServerPort) created" -ForegroundColor Green
} else {
    Write-Host "  ⚠ Could not create firewall rule for port $ServerPort" -ForegroundColor Yellow
}

# Add Jury Portal rule (TCP inbound)
netsh advfirewall firewall add rule `
    name="TurnFix Jury Portal" `
    dir=in `
    action=allow `
    protocol=TCP `
    localport=$JuryPort `
    enable=yes `
    profile=private `
    description="TurnFix Kampfrichter-Portal"

if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ Firewall rule for Jury Portal (Port $JuryPort) created" -ForegroundColor Green
} else {
    Write-Host "  ⚠ Could not create firewall rule for port $JuryPort" -ForegroundColor Yellow
}

Write-Host ""
