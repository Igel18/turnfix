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

$fakePgIsReady = @'
Write-Output 'accepting connections'
exit 0
'@

$fakePsql = @'
param([Parameter(ValueFromRemainingArguments=$true)]$Args)
if ($Args -join ' ' -match 'SELECT 1 FROM pg_database') {
  Write-Output '1'
  exit 0
}
if ($Args -join ' ' -match 'CREATE DATABASE') {
  Write-Output 'CREATE DATABASE'
  exit 0
}
Write-Output '1'
exit 0
'@

$fakePrisma = @"
param([Parameter(ValueFromRemainingArguments=$true)]`$Args)
Set-Content -Path '$logFile' -Value (`$Args -join ' ')
exit 0
"@

Set-Content -Path (Join-Path $fakeBin 'pg_isready.ps1') -Value $fakePgIsReady -Encoding UTF8
Set-Content -Path (Join-Path $fakeBin 'psql.ps1') -Value $fakePsql -Encoding UTF8
Set-Content -Path (Join-Path $fakePrismaDir 'prisma.cmd') -Value $fakePrisma -Encoding UTF8

function New-CommandShim {
  param(
    [string]$Name,
    [string]$ScriptPath,
    [string]$DestinationDir
  )

  $shimPath = Join-Path $DestinationDir $Name
  @"
@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "$ScriptPath" %*
"@ | Set-Content -Path $shimPath -Encoding ASCII
}

New-CommandShim -Name 'pg_isready.cmd' -ScriptPath (Join-Path $fakeBin 'pg_isready.ps1') -DestinationDir $fakeBin
New-CommandShim -Name 'psql.cmd' -ScriptPath (Join-Path $fakeBin 'psql.ps1') -DestinationDir $fakeBin

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