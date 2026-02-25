# ============================================================================
# TurnFix - Service Uninstall Script
# ============================================================================
# Removes TurnFix Windows Services (called during uninstall)
# ============================================================================

param(
    [Parameter(Mandatory=$true)]
    [string]$InstallDir
)

$ErrorActionPreference = "SilentlyContinue"

Write-Host "Removing TurnFix services..." -ForegroundColor Yellow

$NssmPath = Join-Path $InstallDir "nssm\nssm.exe"

$services = @("TurnFixServer", "TurnFixJuryServer")

foreach ($svc in $services) {
    $service = Get-Service -Name $svc -ErrorAction SilentlyContinue
    if ($service) {
        Write-Host "  Stopping service: $svc..." -ForegroundColor Cyan
        
        if (Test-Path $NssmPath) {
            & $NssmPath stop $svc 2>&1 | Out-Null
            Start-Sleep -Seconds 2
            & $NssmPath remove $svc confirm 2>&1 | Out-Null
        } else {
            # Fallback: use sc.exe
            sc.exe stop $svc 2>&1 | Out-Null
            Start-Sleep -Seconds 2
            sc.exe delete $svc 2>&1 | Out-Null
        }
        
        Write-Host "  ✓ Service $svc removed" -ForegroundColor Green
    } else {
        Write-Host "  Service $svc not found (already removed)" -ForegroundColor DarkGray
    }
}

# Remove firewall rules
Write-Host "  Removing firewall rules..." -ForegroundColor Cyan
netsh advfirewall firewall delete rule name="TurnFix Server" 2>&1 | Out-Null
netsh advfirewall firewall delete rule name="TurnFix Jury Portal" 2>&1 | Out-Null
Write-Host "  ✓ Firewall rules removed" -ForegroundColor Green

Write-Host ""
Write-Host "✓ TurnFix services removed" -ForegroundColor Green
