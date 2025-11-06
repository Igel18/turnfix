# Extended Documentation Migration Script
# Migriert ALLE MD-Dateien (Root + newWebBased) in GitBook-Struktur

Write-Host "🚀 TurnFix Extended Documentation Migration" -ForegroundColor Cyan
Write-Host "============================================`n" -ForegroundColor Cyan

$rootDir = "c:\Users\Dominik Prudlo\Documents\GitHub\turnfix"
$sourceDir = "$rootDir\newWebBased"
$targetDir = "$rootDir\documentation\newWebbased"

# Extended Migration Mapping (Root-Dateien)
$rootMigrations = @{
    # Critical Documentation (Root)
    "README.md" = "reference/project-readme.md"
    "SCHNELLSTART.md" = "getting-started/installation.md"
    "UPDATE_V2.0.md" = "reference/update-v2.md"
    
    # Network & Deployment (Root)
    "NETWORK_SETUP.md" = "deployment/network.md"
    "PRODUCTION_DEPLOYMENT.md" = "deployment/production.md"
    "FRONTEND_SERVING_IMPLEMENTATION.md" = "deployment/frontend-serving.md"
    
    # Firewall & Security (Root)
    "FIREWALL_PLATFORM_INFO.md" = "deployment/firewall-platform.md"
    "FIREWALL_GUI.md" = "deployment/firewall-gui.md"
    "ADMIN_RIGHTS_DETECTION.md" = "deployment/admin-rights.md"
    
    # Developer Features (Root)
    "API_ROUTE_MISMATCHES.md" = "developer-guide/features/api-route-fixes.md"
    "FIX_DISCIPLINE_VALIDATION.md" = "developer-guide/features/discipline-validation-fix.md"
    "FIX_START_NUMBERS_LOCALIZATION.md" = "developer-guide/features/start-numbers-fix.md"
    "FIX_NODE_MODULES_CORRUPTION.md" = "deployment/troubleshooting/node-modules-fix.md"
    "GENDER_HELPERS_CENTRALIZATION.md" = "developer-guide/architecture/gender-helpers.md"
    "GROUPS_AND_TEAMS_ANALYSIS.md" = "developer-guide/architecture/groups-teams.md"
    "HARD_REFRESH_NEEDED.md" = "deployment/troubleshooting/hard-refresh.md"
    "JURY_PORTAL_ACCESS.md" = "deployment/jury-portal-access.md"
    
    # Points Documentation (Root)
    "POINT_114B_DATE_SUPPORT.md" = "developer-guide/features/point-114b-date-support.md"
    "POINT_131_MODAL_INTEGRATION.md" = "developer-guide/features/point-131-modal.md"
    
    # Priority & Status (Root)
    "PRIORITY_FIXES_LOG.md" = "reference/changelog.md"
}

# Counter
$copied = 0
$skipped = 0
$errors = 0

Write-Host "📂 Phase 1: Migrating ROOT directory files...`n" -ForegroundColor Yellow

foreach ($source in $rootMigrations.Keys) {
    $sourcePath = Join-Path $rootDir $source
    $targetPath = Join-Path $targetDir $rootMigrations[$source]
    
    if (Test-Path $sourcePath) {
        try {
            # Create target directory if not exists
            $targetDirPath = Split-Path $targetPath -Parent
            if (!(Test-Path $targetDirPath)) {
                New-Item -ItemType Directory -Path $targetDirPath -Force | Out-Null
            }
            
            # Copy file
            Copy-Item -Path $sourcePath -Destination $targetPath -Force
            Write-Host "  ✅ ROOT/$source → $($rootMigrations[$source])" -ForegroundColor Green
            $copied++
        }
        catch {
            Write-Host "  ❌ ERROR: $source - $($_.Exception.Message)" -ForegroundColor Red
            $errors++
        }
    }
    else {
        Write-Host "  ⚠️  SKIP: $source (not found)" -ForegroundColor DarkGray
        $skipped++
    }
}

Write-Host "`n====================================`n" -ForegroundColor Cyan
Write-Host "📊 Migration Summary:" -ForegroundColor Cyan
Write-Host "  ✅ Copied:  $copied files" -ForegroundColor Green
Write-Host "  ⚠️  Skipped: $skipped files" -ForegroundColor Yellow
Write-Host "  ❌ Errors:  $errors files" -ForegroundColor Red

if ($copied -gt 0) {
    Write-Host "`n✨ Extended documentation successfully migrated!" -ForegroundColor Green
    Write-Host "📍 Location: $targetDir" -ForegroundColor Cyan
    Write-Host "`n📖 Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Review migrated ROOT files" -ForegroundColor White
    Write-Host "  2. Update SUMMARY.md with new entries" -ForegroundColor White
    Write-Host "  3. Check for duplicate content" -ForegroundColor White
    Write-Host "  4. Test GitBook build" -ForegroundColor White
}
