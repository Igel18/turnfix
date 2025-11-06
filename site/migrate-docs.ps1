# TurnFix Documentation Migration Script
# Migriert alle MD-Dateien in GitBook-kompatible Struktur

Write-Host "🚀 TurnFix Documentation Migration" -ForegroundColor Cyan
Write-Host "====================================`n" -ForegroundColor Cyan

$sourceDir = "c:\Users\Dominik Prudlo\Documents\GitHub\turnfix\newWebBased"
$targetDir = "c:\Users\Dominik Prudlo\Documents\GitHub\turnfix\documentation\newWebbased"

# Migration Mapping
$migrations = @{
    # Getting Started
    "GETTING_STARTED.md" = "getting-started/quickstart.md"
    
    # Deployment
    "PRODUCTION_DEPLOYMENT.md" = "deployment/production.md"
    "NETWORK_SETUP.md" = "deployment/network.md"
    "NETWORK_ACCESS_FIXES.md" = "deployment/network-fixes.md"
    "FIREWALL_SETUP.md" = "deployment/firewall.md"
    
    # Developer Guide - Features
    "POINT_135_DOCUMENTATION.md" = "developer-guide/features/point-135-start-devices.md"
    "POINT-30-GENDER-UNIFICATION.md" = "developer-guide/features/gender-unification.md"
    "POINT-34-PDF-UNIFICATION.md" = "developer-guide/features/pdf-system.md"
    "POINT-38-IMPLEMENTATION-SUMMARY.md" = "developer-guide/features/gymnet-import.md"
    "POINT-11-IMPLEMENTATION.md" = "developer-guide/features/setup-automation.md"
    "POINT-31-LOCALIZATION.md" = "developer-guide/features/table-localization.md"
    "POINT-32-HORIZONTAL-SCROLLING.md" = "developer-guide/features/table-scrolling.md"
    "POINT-33-SORTABLE-TABLES.md" = "developer-guide/features/table-sorting.md"
    "POINT-40-DEFAULT-TABLE-VIEW.md" = "developer-guide/features/default-views.md"
    "POINT-46-JURY-PORTAL-ICONS.md" = "developer-guide/features/jury-icons.md"
    "POINT-47-GYMNET-IMPORT-LOCALIZATION.md" = "developer-guide/features/gymnet-localization.md"
    "POINT-49-EVENTS-LOCALIZATION.md" = "developer-guide/features/events-localization.md"
    "POINT-51-UNIFIED-HEADER-CLEANUP.md" = "developer-guide/features/header-unification.md"
    
    # Developer Guide - Architecture
    "DYNAMIC_FIELD_MAPPING.md" = "developer-guide/architecture/field-mapping.md"
    "JURY_PORTAL_CONCEPT.md" = "developer-guide/architecture/jury-portal.md"
    "JURY_PORTAL_COMPARISON.md" = "developer-guide/architecture/jury-comparison.md"
    "LIVE_UPDATE_INDICATOR.md" = "developer-guide/architecture/live-updates.md"
    
    # Developer Guide - Best Practices
    "TEMPLATE-UNIFICATION.md" = "developer-guide/best-practices/templates.md"
    "PRISMA_SINGLETON_FIX.md" = "developer-guide/best-practices/database.md"
    "TYPESCRIPT_BUILD_FIXES.md" = "developer-guide/best-practices/typescript.md"
    
    # Developer Guide - Testing
    "TESTING.md" = "developer-guide/testing/strategy.md"
    "TESTING_SETUP_SUMMARY.md" = "developer-guide/testing/setup.md"
    "POINT-38-TEST-CASES.md" = "developer-guide/testing/gymnet-test-cases.md"
    
    # Reference
    "PRIORITY_FIXES_LOG.md" = "reference/changelog.md"
    "DEVELOPMENT_SCRIPTS.md" = "reference/scripts.md"
    
    # Configuration Docs
    "CONFIGURATION_LOCALIZATION_STATUS.md" = "developer-guide/features/configuration-localization.md"
    "MANAGEMENT_CENTER_COMPLETE_LOCALIZATION.md" = "developer-guide/features/management-localization.md"
    "PARTICIPANTS_LOCALIZATION_STATUS.md" = "developer-guide/features/participants-localization.md"
    
    # Discipline Features
    "DISCIPLINE_ICONS_IMPLEMENTATION.md" = "developer-guide/features/discipline-icons.md"
    "JURY_SCORES_FEATURE.md" = "developer-guide/features/jury-scores.md"
    
    # Point-specific docs
    "POINT-38-HOTFIX.md" = "developer-guide/features/gymnet-hotfix.md"
    "POINT-46-PRODUCTION-SOLUTION.md" = "developer-guide/features/jury-production.md"
}

# Counter
$copied = 0
$skipped = 0
$errors = 0

Write-Host "📂 Migrating documentation files...`n" -ForegroundColor Yellow

foreach ($source in $migrations.Keys) {
    $sourcePath = Join-Path $sourceDir $source
    $targetPath = Join-Path $targetDir $migrations[$source]
    
    if (Test-Path $sourcePath) {
        try {
            # Create target directory if not exists
            $targetDirPath = Split-Path $targetPath -Parent
            if (!(Test-Path $targetDirPath)) {
                New-Item -ItemType Directory -Path $targetDirPath -Force | Out-Null
            }
            
            # Copy file
            Copy-Item -Path $sourcePath -Destination $targetPath -Force
            Write-Host "  ✅ $source → $($migrations[$source])" -ForegroundColor Green
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
    Write-Host "`n✨ Documentation successfully migrated to GitBook structure!" -ForegroundColor Green
    Write-Host "📍 Location: $targetDir" -ForegroundColor Cyan
    Write-Host "`n📖 Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Review migrated files in new locations" -ForegroundColor White
    Write-Host "  2. Update SUMMARY.md with actual content" -ForegroundColor White
    Write-Host "  3. Add missing sections (user-guide, etc.)" -ForegroundColor White
    Write-Host "  4. Test GitBook build: gitbook serve" -ForegroundColor White
    Write-Host "  5. Archive old MD files in newWebBased/" -ForegroundColor White
}
