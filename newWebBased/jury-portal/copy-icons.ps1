# Copy icons from Client to Jury Portal for Production Build
# This script ensures icons are available in the production build

$sourcePath = Join-Path $PSScriptRoot "..\client\public\assets\icons"
$destPath = Join-Path $PSScriptRoot "public\assets"

Write-Host "Copying icons for production build..." -ForegroundColor Cyan
Write-Host "   Source: $sourcePath" -ForegroundColor Gray
Write-Host "   Dest:   $destPath" -ForegroundColor Gray

# Create destination directory if it doesn't exist
if (-not (Test-Path $destPath)) {
    New-Item -ItemType Directory -Path $destPath -Force | Out-Null
    Write-Host "   [OK] Created destination directory" -ForegroundColor Green
}

# Copy icons directory
try {
    Copy-Item -Path $sourcePath -Destination $destPath -Recurse -Force
    
    # Count copied files
    $iconCount = (Get-ChildItem -Path (Join-Path $destPath "icons") -File).Count
    
    Write-Host "   [OK] Copied $iconCount icon files successfully" -ForegroundColor Green
    Write-Host ""
    Write-Host "[SUCCESS] Icons ready for production build!" -ForegroundColor Green
    exit 0
} catch {
    Write-Host "   [ERROR] Error copying icons: $_" -ForegroundColor Red
    exit 1
}
