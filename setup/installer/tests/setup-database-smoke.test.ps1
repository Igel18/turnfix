$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent) -Parent
$scriptUnderTest = Join-Path $repoRoot 'setup\installer\scripts\setup-database.ps1'

$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ('turnfix-setup-db-test-' + [guid]::NewGuid().ToString('N'))
$fakeBin = Join-Path $tempRoot 'bin'
$installDir = Join-Path $tempRoot 'install'
$serverDir = Join-Path $installDir 'server'
$fakePrismaDir = Join-Path $serverDir 'node_modules\.bin'
$logFile = Join-Path $tempRoot 'prisma-invocation.txt'

New-Item -ItemType Directory -Force -Path $fakeBin, $fakePrismaDir | Out-Null

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
echo `%* > "$logFile"
exit /b 0
"@ | Set-Content -Path (Join-Path $fakePrismaDir 'prisma.cmd') -Encoding ASCII

$oldPath = $env:PATH
try {
  $env:PATH = "$fakeBin;$env:PATH"

  & $scriptUnderTest -InstallDir $installDir -NodePath (Join-Path $fakeBin 'node.exe') -DbName 'turnfix_test' -DbPassword 'secret' -DbHost 'localhost' -DbPort 5432

  if (-not (Test-Path $logFile)) {
    throw 'Prisma was not invoked.'
  }

  $invocation = Get-Content $logFile -Raw
  if ($invocation -notmatch 'db push') {
    throw "Unexpected Prisma invocation: $invocation"
  }
  if ($invocation -notmatch '--accept-data-loss') {
    throw "Prisma invocation missing --accept-data-loss: $invocation"
  }

  Write-Host 'setup-database smoke test passed' -ForegroundColor Green
}
finally {
  $env:PATH = $oldPath
  if (Test-Path $tempRoot) {
    Remove-Item $tempRoot -Recurse -Force
  }
}