$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent) -Parent
$scriptUnderTest = Join-Path $repoRoot 'setup\installer\scripts\setup-database.ps1'

$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ('turnfix-setup-db-test-' + [guid]::NewGuid().ToString('N'))
$fakeBin = Join-Path $tempRoot 'bin'
$installDir = Join-Path $tempRoot 'install'
$serverDir = Join-Path $installDir 'server'
$fakePrismaDir = Join-Path $serverDir 'node_modules\prisma\build'
$fakePrismaCmdDir = Join-Path $serverDir 'node_modules\.bin'
$nodeLogFile = Join-Path $tempRoot 'node-invocation.txt'
$prismaCmdLogFile = Join-Path $tempRoot 'prisma-cmd-invocation.txt'

New-Item -ItemType Directory -Force -Path $fakeBin, $fakePrismaDir, $fakePrismaCmdDir | Out-Null

@'
@echo accepting connections
exit /b 0
'@ | Set-Content -Path (Join-Path $fakeBin 'pg_isready.cmd') -Encoding ASCII

@'
@echo 1
exit /b 0
'@ | Set-Content -Path (Join-Path $fakeBin 'psql.cmd') -Encoding ASCII

@"
@echo off
echo `%* > "$nodeLogFile"
exit /b 0
"@ | Set-Content -Path (Join-Path $fakeBin 'node.cmd') -Encoding ASCII

@"
@echo off
echo `%* > "$prismaCmdLogFile"
exit /b 0
"@ | Set-Content -Path (Join-Path $fakePrismaCmdDir 'prisma.cmd') -Encoding ASCII

@'
// fake prisma cli entrypoint for smoke test
'@ | Set-Content -Path (Join-Path $fakePrismaDir 'index.js') -Encoding ASCII

New-Item -ItemType Directory -Force -Path (Join-Path $serverDir 'prisma') | Out-Null
@'
// fake schema for smoke test
'@ | Set-Content -Path (Join-Path $serverDir 'prisma\schema.prisma') -Encoding ASCII

$oldPath = $env:PATH
try {
  $env:PATH = "$fakeBin;$env:PATH"

  & $scriptUnderTest -InstallDir $installDir -NodePath (Join-Path $fakeBin 'node.cmd') -DbName 'turnfix_test' -DbPassword 'secret' -DbHost 'localhost' -DbPort 5432

  if (-not (Test-Path $nodeLogFile)) {
    throw 'Node-based Prisma invocation was not executed.'
  }

  $invocation = Get-Content $nodeLogFile -Raw
  if ($invocation -notmatch 'node_modules\\prisma\\build\\index.js') {
    throw "Node invocation does not include Prisma JS CLI path: $invocation"
  }
  if ($invocation -notmatch 'db push') {
    throw "Unexpected Node invocation (db push missing): $invocation"
  }
  if ($invocation -notmatch '--accept-data-loss') {
    throw "Node invocation missing --accept-data-loss: $invocation"
  }
  if (Test-Path $prismaCmdLogFile) {
    throw 'setup-database.ps1 used prisma.cmd, expected node + prisma build/index.js'
  }

  # Regression for Point 151b: when NodePath is invalid, setup must fail
  # explicitly (instead of silently continuing with a broken schema state).
  & pwsh -NoProfile -ExecutionPolicy Bypass -File $scriptUnderTest `
    -InstallDir $installDir `
    -NodePath (Join-Path $fakeBin 'node-missing.exe') `
    -DbName 'turnfix_test' `
    -DbPassword 'secret' `
    -DbHost 'localhost' `
    -DbPort 5432

  if ($LASTEXITCODE -eq 0) {
    throw 'Expected setup-database.ps1 to fail when NodePath is missing, but it succeeded.'
  }

  Write-Host 'setup-database smoke test passed' -ForegroundColor Green
}
finally {
  $env:PATH = $oldPath
  if (Test-Path $tempRoot) {
    Remove-Item $tempRoot -Recurse -Force
  }
}