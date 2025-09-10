# System Requirements Checker for TurnFix
# This script checks if the system meets requirements for TurnFix installation

Write-Host "=== TurnFix System Requirements Checker ===" -ForegroundColor Green
Write-Host ""

$requirements = @{
    "OS" = $true
    "RAM" = $true  
    "Storage" = $true
    "PowerShell" = $true
    "Internet" = $true
    "Permissions" = $true
}

$warnings = @()
$errors = @()

# Check Operating System
Write-Host "Checking Operating System..." -ForegroundColor Yellow
$os = Get-CimInstance -ClassName Win32_OperatingSystem
Write-Host "OS: $($os.Caption) $($os.Version)" -ForegroundColor White

if ($os.Caption -match "Windows 10|Windows 11|Windows Server") {
    Write-Host "✓ OS: Compatible" -ForegroundColor Green
} else {
    Write-Host "✗ OS: May not be compatible" -ForegroundColor Red
    $errors += "Operating System may not be compatible. Windows 10/11 recommended."
    $requirements["OS"] = $false
}

# Check Architecture
if ($os.OSArchitecture -eq "64-bit") {
    Write-Host "✓ Architecture: 64-bit" -ForegroundColor Green
} else {
    Write-Host "✗ Architecture: $($os.OSArchitecture)" -ForegroundColor Red
    $errors += "64-bit architecture required"
    $requirements["OS"] = $false
}

Write-Host ""

# Check RAM
Write-Host "Checking Memory (RAM)..." -ForegroundColor Yellow
$ram = Get-CimInstance -ClassName Win32_ComputerSystem
$ramGB = [math]::Round($ram.TotalPhysicalMemory / 1GB, 1)
Write-Host "Total RAM: $ramGB GB" -ForegroundColor White

if ($ramGB -ge 8) {
    Write-Host "✓ RAM: Excellent ($ramGB GB)" -ForegroundColor Green
} elseif ($ramGB -ge 4) {
    Write-Host "⚠ RAM: Sufficient ($ramGB GB)" -ForegroundColor Yellow
    $warnings += "RAM is at minimum requirement. 8GB recommended for better performance."
} else {
    Write-Host "✗ RAM: Insufficient ($ramGB GB)" -ForegroundColor Red
    $errors += "Minimum 4GB RAM required. Current: $ramGB GB"
    $requirements["RAM"] = $false
}

Write-Host ""

# Check Storage
Write-Host "Checking Storage Space..." -ForegroundColor Yellow
$systemDrive = Get-CimInstance -ClassName Win32_LogicalDisk | Where-Object { $_.DeviceID -eq "C:" }
$freeSpaceGB = [math]::Round($systemDrive.FreeSpace / 1GB, 1)
Write-Host "Free space on C: drive: $freeSpaceGB GB" -ForegroundColor White

if ($freeSpaceGB -ge 10) {
    Write-Host "✓ Storage: Excellent ($freeSpaceGB GB free)" -ForegroundColor Green
} elseif ($freeSpaceGB -ge 2) {
    Write-Host "⚠ Storage: Sufficient ($freeSpaceGB GB free)" -ForegroundColor Yellow
    $warnings += "Storage space is at minimum requirement. 10GB recommended."
} else {
    Write-Host "✗ Storage: Insufficient ($freeSpaceGB GB free)" -ForegroundColor Red
    $errors += "Minimum 2GB free storage required. Current: $freeSpaceGB GB"
    $requirements["Storage"] = $false
}

Write-Host ""

# Check PowerShell Version
Write-Host "Checking PowerShell..." -ForegroundColor Yellow
$psVersion = $PSVersionTable.PSVersion
Write-Host "PowerShell Version: $psVersion" -ForegroundColor White

if ($psVersion.Major -ge 5) {
    Write-Host "✓ PowerShell: Compatible (v$psVersion)" -ForegroundColor Green
} else {
    Write-Host "✗ PowerShell: Outdated (v$psVersion)" -ForegroundColor Red
    $errors += "PowerShell 5.0 or higher required. Current: v$psVersion"
    $requirements["PowerShell"] = $false
}

# Check Execution Policy
$executionPolicy = Get-ExecutionPolicy
Write-Host "Execution Policy: $executionPolicy" -ForegroundColor White

if ($executionPolicy -eq "Restricted") {
    Write-Host "⚠ Execution Policy: Restricted" -ForegroundColor Yellow
    $warnings += "PowerShell execution policy is restricted. Setup may require policy changes."
} else {
    Write-Host "✓ Execution Policy: Allows script execution" -ForegroundColor Green
}

Write-Host ""

# Check Administrator Privileges
Write-Host "Checking Permissions..." -ForegroundColor Yellow
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")

if ($isAdmin) {
    Write-Host "✓ Permissions: Running as Administrator" -ForegroundColor Green
} else {
    Write-Host "⚠ Permissions: Not running as Administrator" -ForegroundColor Yellow
    $warnings += "Administrator privileges recommended for complete installation."
}

Write-Host ""

# Check Internet Connection
Write-Host "Checking Internet Connection..." -ForegroundColor Yellow
try {
    $testConnection = Test-NetConnection -ComputerName "github.com" -Port 443 -InformationLevel Quiet -WarningAction SilentlyContinue
    if ($testConnection) {
        Write-Host "✓ Internet: Connected" -ForegroundColor Green
        
        # Test specific sites
        $sites = @("nodejs.org", "chocolatey.org", "postgresql.org")
        foreach ($site in $sites) {
            try {
                $test = Test-NetConnection -ComputerName $site -Port 443 -InformationLevel Quiet -WarningAction SilentlyContinue
                if ($test) {
                    Write-Host "  ✓ $site: Reachable" -ForegroundColor Green
                } else {
                    Write-Host "  ⚠ $site: Not reachable" -ForegroundColor Yellow
                    $warnings += "$site is not reachable. This may affect package downloads."
                }
            } catch {
                Write-Host "  ⚠ $site: Connection test failed" -ForegroundColor Yellow
            }
        }
    } else {
        Write-Host "✗ Internet: Not connected" -ForegroundColor Red
        $errors += "Internet connection required for downloading components."
        $requirements["Internet"] = $false
    }
} catch {
    Write-Host "⚠ Internet: Connection test failed" -ForegroundColor Yellow
    $warnings += "Could not verify internet connection. Installation may fail if offline."
}

Write-Host ""

# Check if components are already installed
Write-Host "Checking Existing Components..." -ForegroundColor Yellow

$components = @{
    "Node.js" = "node"
    "npm" = "npm"
    "Git" = "git"
    "PostgreSQL" = "psql"
    "Chocolatey" = "choco"
}

foreach ($component in $components.GetEnumerator()) {
    try {
        $null = Get-Command $component.Value -ErrorAction SilentlyContinue
        if ($?) {
            if ($component.Key -eq "Node.js") {
                $version = & node --version 2>$null
                Write-Host "  ✓ $($component.Key): Already installed ($version)" -ForegroundColor Green
            } elseif ($component.Key -eq "npm") {
                $version = & npm --version 2>$null
                Write-Host "  ✓ $($component.Key): Already installed (v$version)" -ForegroundColor Green
            } elseif ($component.Key -eq "Git") {
                $version = & git --version 2>$null
                Write-Host "  ✓ $($component.Key): Already installed ($version)" -ForegroundColor Green
            } else {
                Write-Host "  ✓ $($component.Key): Already installed" -ForegroundColor Green
            }
        } else {
            Write-Host "  ○ $($component.Key): Not installed" -ForegroundColor Gray
        }
    } catch {
        Write-Host "  ○ $($component.Key): Not installed" -ForegroundColor Gray
    }
}

# Check PostgreSQL Service
$pgService = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue
if ($pgService) {
    Write-Host "  ✓ PostgreSQL Service: $($pgService.Status)" -ForegroundColor Green
} else {
    Write-Host "  ○ PostgreSQL Service: Not found" -ForegroundColor Gray
}

Write-Host ""

# Summary
Write-Host "=== SYSTEM REQUIREMENTS SUMMARY ===" -ForegroundColor Cyan
Write-Host ""

$allRequirementsMet = $requirements.Values -notcontains $false

if ($allRequirementsMet -and $errors.Count -eq 0) {
    Write-Host "🎉 SYSTEM READY FOR TURNFIX INSTALLATION!" -ForegroundColor Green
    Write-Host "All requirements are met. You can proceed with installation." -ForegroundColor Green
} elseif ($errors.Count -eq 0) {
    Write-Host "⚠️  SYSTEM MOSTLY READY" -ForegroundColor Yellow
    Write-Host "Requirements are met but there are some warnings." -ForegroundColor Yellow
} else {
    Write-Host "❌ SYSTEM NOT READY" -ForegroundColor Red
    Write-Host "Some requirements are not met. Please address the issues below." -ForegroundColor Red
}

Write-Host ""

if ($errors.Count -gt 0) {
    Write-Host "❌ ERRORS (must be fixed):" -ForegroundColor Red
    foreach ($error in $errors) {
        Write-Host "  • $error" -ForegroundColor Red
    }
    Write-Host ""
}

if ($warnings.Count -gt 0) {
    Write-Host "⚠️  WARNINGS (recommended to address):" -ForegroundColor Yellow
    foreach ($warning in $warnings) {
        Write-Host "  • $warning" -ForegroundColor Yellow
    }
    Write-Host ""
}

Write-Host "Recommendations:" -ForegroundColor Cyan
if (-not $isAdmin) {
    Write-Host "• Run PowerShell as Administrator for best results" -ForegroundColor White
}
if ($executionPolicy -eq "Restricted") {
    Write-Host "• Set PowerShell execution policy: Set-ExecutionPolicy RemoteSigned" -ForegroundColor White
}
if ($ramGB -lt 8) {
    Write-Host "• Consider upgrading RAM to 8GB or more for better performance" -ForegroundColor White
}
if ($freeSpaceGB -lt 10) {
    Write-Host "• Free up additional disk space for better performance" -ForegroundColor White
}

Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
if ($allRequirementsMet -and $errors.Count -eq 0) {
    Write-Host "✓ Run INSTALL.bat or complete-setup.ps1 to begin installation" -ForegroundColor Green
} else {
    Write-Host "1. Address the errors listed above" -ForegroundColor White
    Write-Host "2. Run this checker again to verify fixes" -ForegroundColor White
    Write-Host "3. Proceed with installation once all errors are resolved" -ForegroundColor White
}

Write-Host ""
Read-Host "Press Enter to exit"
