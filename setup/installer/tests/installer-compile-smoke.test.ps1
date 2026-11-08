param([string]$Compiler = "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe")

$ErrorActionPreference = 'Stop'
if (-not (Test-Path $Compiler)) { throw "Inno Setup compiler not found: $Compiler" }
$installerDir = Split-Path $PSScriptRoot -Parent
$installerScript = Get-Content -LiteralPath (Join-Path $installerDir 'turnfix-setup.iss') -Raw
if ($installerScript -notmatch 'BackupPage\.Values\[0\] := True;' -or
    $installerScript -notmatch "CompareText\(ParamStr\(ParamIndex\), '/NOBACKUP'\)" -or
    $installerScript -notmatch "if not BackupPage\.Values\[0\] then\s+begin\s+Log\('Pre-upgrade backup skipped" -or
    $installerScript -notmatch "if not BackupPage\.Values\[0\] then\s+BackupArguments := ' -SkipBackup';") {
    throw 'Installer backup selection is not connected to both installation paths.'
}
$root = Join-Path ([System.IO.Path]::GetTempPath()) ('turnfix-installer-test-' + [guid]::NewGuid().ToString('N'))
$staging = Join-Path $root 'staging'
try {
    $files = @(
        'nodejs\node.exe', 'server\dist\index.js', 'server\dist\utils\backup.js',
        'server\prisma\schema.prisma', 'server\node_modules\placeholder',
        'server\package.json', 'server\.env.example', 'client\dist\index.html',
        'LICENSE'
    )
    foreach ($file in $files) {
        $target = Join-Path $staging $file
        New-Item -ItemType Directory -Force -Path (Split-Path $target -Parent) | Out-Null
        Set-Content -LiteralPath $target -Value 'test' -Encoding ASCII
    }
    New-Item -ItemType Directory -Force -Path (Join-Path $staging 'scripts') | Out-Null
    Copy-Item (Join-Path $installerDir 'scripts\pre-upgrade-backup.js') (Join-Path $staging 'scripts\pre-upgrade-backup.js')
    & $Compiler /Qp "/DMyStagingDir=$staging" "/O$root" (Join-Path $installerDir 'turnfix-setup.iss')
    if ($LASTEXITCODE -ne 0) { throw "Installer compilation failed: $LASTEXITCODE" }
    Write-Host 'Installer compilation smoke test passed'
} finally {
    Remove-Item -LiteralPath $root -Recurse -Force -ErrorAction SilentlyContinue
}