# ============================================================================
# TurnFix Tray Icon - System Tray Status Monitor
# ============================================================================
# Shows TurnFix server status in the Windows system tray.
# - Green icon: Both servers running
# - Yellow icon: Only one server running
# - Red icon: All servers stopped
#
# Right-click context menu:
#   Start / Stop / Restart servers
#   Open TurnFix / Jury Portal in browser
#   Open logs folder
#   Exit
#
# Double-click: Opens TurnFix in browser
# ============================================================================

param(
    [string]$InstallDir = ""
)

# Determine install directory
if (-not $InstallDir) {
    $InstallDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
}

# ── Configuration ──────────────────────────────────────────────────────────

$ServiceName      = "TurnFixServer"
$JuryServiceName  = "TurnFixJuryServer"
$ServerPort       = 3001
$JuryPort         = 3002
$CheckIntervalMs  = 5000
$NssmPath         = Join-Path $InstallDir "nssm\nssm.exe"

# Read ports from .env if available
$envFile = Join-Path $InstallDir "server\.env"
if (Test-Path $envFile) {
    foreach ($line in (Get-Content $envFile)) {
        if ($line -match '^\s*PORT\s*=\s*(\d+)') {
            $ServerPort = [int]$Matches[1]
        }
    }
}

# Read jury port from ecosystem.config.js if available
$ecosystemFile = Join-Path $InstallDir "server\ecosystem.config.js"
if (Test-Path $ecosystemFile) {
    $content = Get-Content $ecosystemFile -Raw
    if ($content -match "JURY_MODE.*?PORT:\s*(\d+)") {
        $JuryPort = [int]$Matches[1]
    } elseif ($content -match "PORT:\s*(\d+).*?PORT:\s*(\d+)") {
        $JuryPort = [int]$Matches[2]
    }
}

# ── Load Assemblies ────────────────────────────────────────────────────────

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Hide PowerShell console window
Add-Type -Name Win32 -Namespace Native -MemberDefinition @"
    [DllImport("kernel32.dll")]
    public static extern IntPtr GetConsoleWindow();
    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
"@
$consoleWindow = [Native.Win32]::GetConsoleWindow()
if ($consoleWindow -ne [IntPtr]::Zero) {
    [Native.Win32]::ShowWindow($consoleWindow, 0) | Out-Null  # SW_HIDE = 0
}

# ── Create Icons ───────────────────────────────────────────────────────────

function New-TrayIcon {
    param(
        [System.Drawing.Color]$CircleColor,
        [System.Drawing.Color]$TextColor = [System.Drawing.Color]::White
    )
    $bmp = New-Object System.Drawing.Bitmap(16, 16)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.Clear([System.Drawing.Color]::Transparent)

    # Filled circle
    $brush = New-Object System.Drawing.SolidBrush($CircleColor)
    $g.FillEllipse($brush, 1, 1, 13, 13)
    $brush.Dispose()

    # "T" letter
    $font = New-Object System.Drawing.Font("Segoe UI", 7, [System.Drawing.FontStyle]::Bold)
    $textBrush = New-Object System.Drawing.SolidBrush($TextColor)
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
    $rect = New-Object System.Drawing.RectangleF(0, -0.5, 16, 16)
    $g.DrawString("T", $font, $textBrush, $rect, $sf)

    $font.Dispose()
    $textBrush.Dispose()
    $sf.Dispose()
    $g.Dispose()

    $hIcon = $bmp.GetHicon()
    $icon = [System.Drawing.Icon]::FromHandle($hIcon)
    return $icon
}

$iconGreen  = New-TrayIcon ([System.Drawing.Color]::FromArgb(34, 197, 94))
$iconYellow = New-TrayIcon ([System.Drawing.Color]::FromArgb(234, 179, 8))
$iconRed    = New-TrayIcon ([System.Drawing.Color]::FromArgb(220, 60, 60))
$iconGray   = New-TrayIcon ([System.Drawing.Color]::FromArgb(156, 163, 175))

# ── NotifyIcon ─────────────────────────────────────────────────────────────

$trayIcon = New-Object System.Windows.Forms.NotifyIcon
$trayIcon.Icon = $iconGray
$trayIcon.Text = "TurnFix – Prüfe Status…"
$trayIcon.Visible = $true

# ── Context Menu ───────────────────────────────────────────────────────────

$menu = New-Object System.Windows.Forms.ContextMenuStrip

# -- Status (display only) --
$miStatus = New-Object System.Windows.Forms.ToolStripMenuItem
$miStatus.Text = "Status: Prüfe…"
$miStatus.Enabled = $false
$miStatus.Font = New-Object System.Drawing.Font($miStatus.Font, [System.Drawing.FontStyle]::Bold)
[void]$menu.Items.Add($miStatus)

$miServerStatus = New-Object System.Windows.Forms.ToolStripMenuItem
$miServerStatus.Text = "  Server: –"
$miServerStatus.Enabled = $false
[void]$menu.Items.Add($miServerStatus)

$miJuryStatus = New-Object System.Windows.Forms.ToolStripMenuItem
$miJuryStatus.Text = "  Jury:     –"
$miJuryStatus.Enabled = $false
[void]$menu.Items.Add($miJuryStatus)

[void]$menu.Items.Add((New-Object System.Windows.Forms.ToolStripSeparator))

# -- Service controls --
$miStart = New-Object System.Windows.Forms.ToolStripMenuItem
$miStart.Text = "Server starten"
$miStart.Image = $null
$miStart.Add_Click({
    try {
        if (Test-Path $NssmPath) {
            Start-Process $NssmPath -ArgumentList "start $ServiceName" -WindowStyle Hidden -Wait -ErrorAction SilentlyContinue
            Start-Process $NssmPath -ArgumentList "start $JuryServiceName" -WindowStyle Hidden -Wait -ErrorAction SilentlyContinue
        } else {
            Start-Service -Name $ServiceName -ErrorAction SilentlyContinue
            Start-Service -Name $JuryServiceName -ErrorAction SilentlyContinue
        }
    } catch {}
    Start-Sleep -Seconds 2
    Update-ServiceStatus
})
[void]$menu.Items.Add($miStart)

$miStop = New-Object System.Windows.Forms.ToolStripMenuItem
$miStop.Text = "Server stoppen"
$miStop.Add_Click({
    try {
        if (Test-Path $NssmPath) {
            Start-Process $NssmPath -ArgumentList "stop $ServiceName" -WindowStyle Hidden -Wait -ErrorAction SilentlyContinue
            Start-Process $NssmPath -ArgumentList "stop $JuryServiceName" -WindowStyle Hidden -Wait -ErrorAction SilentlyContinue
        } else {
            Stop-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
            Stop-Service -Name $JuryServiceName -Force -ErrorAction SilentlyContinue
        }
    } catch {}
    Start-Sleep -Seconds 2
    Update-ServiceStatus
})
[void]$menu.Items.Add($miStop)

$miRestart = New-Object System.Windows.Forms.ToolStripMenuItem
$miRestart.Text = "Server neustarten"
$miRestart.Add_Click({
    try {
        if (Test-Path $NssmPath) {
            Start-Process $NssmPath -ArgumentList "restart $ServiceName" -WindowStyle Hidden -Wait -ErrorAction SilentlyContinue
            Start-Process $NssmPath -ArgumentList "restart $JuryServiceName" -WindowStyle Hidden -Wait -ErrorAction SilentlyContinue
        } else {
            Restart-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
            Restart-Service -Name $JuryServiceName -Force -ErrorAction SilentlyContinue
        }
    } catch {}
    Start-Sleep -Seconds 3
    Update-ServiceStatus
})
[void]$menu.Items.Add($miRestart)

[void]$menu.Items.Add((New-Object System.Windows.Forms.ToolStripSeparator))

# -- Browser links --
$miOpenApp = New-Object System.Windows.Forms.ToolStripMenuItem
$miOpenApp.Text = "TurnFix öffnen"
$miOpenApp.Add_Click({ Start-Process "http://localhost:$ServerPort" })
[void]$menu.Items.Add($miOpenApp)

$miOpenJury = New-Object System.Windows.Forms.ToolStripMenuItem
$miOpenJury.Text = "Jury-Portal öffnen"
$miOpenJury.Add_Click({ Start-Process "http://localhost:$JuryPort" })
[void]$menu.Items.Add($miOpenJury)

[void]$menu.Items.Add((New-Object System.Windows.Forms.ToolStripSeparator))

# -- Logs --
$miLogs = New-Object System.Windows.Forms.ToolStripMenuItem
$miLogs.Text = "Log-Ordner öffnen"
$miLogs.Add_Click({
    $logsDir = Join-Path $InstallDir "server\logs"
    if (Test-Path $logsDir) {
        Start-Process "explorer.exe" -ArgumentList $logsDir
    } else {
        [System.Windows.Forms.MessageBox]::Show(
            "Log-Ordner nicht gefunden:`n$logsDir",
            "TurnFix", "OK", "Warning"
        ) | Out-Null
    }
})
[void]$menu.Items.Add($miLogs)

[void]$menu.Items.Add((New-Object System.Windows.Forms.ToolStripSeparator))

# -- Exit --
$miExit = New-Object System.Windows.Forms.ToolStripMenuItem
$miExit.Text = "Beenden"
$miExit.Add_Click({
    $trayIcon.Visible = $false
    $trayIcon.Dispose()
    [System.Windows.Forms.Application]::Exit()
})
[void]$menu.Items.Add($miExit)

$trayIcon.ContextMenuStrip = $menu

# Double-click opens browser
$trayIcon.Add_DoubleClick({
    Start-Process "http://localhost:$ServerPort"
})

# ── Status Check ───────────────────────────────────────────────────────────

function Update-ServiceStatus {
    $serverRunning = $false
    $juryRunning   = $false

    # Check Windows services
    try {
        $svc = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
        if ($svc -and $svc.Status -eq 'Running') { $serverRunning = $true }
    } catch {}

    try {
        $svc = Get-Service -Name $JuryServiceName -ErrorAction SilentlyContinue
        if ($svc -and $svc.Status -eq 'Running') { $juryRunning = $true }
    } catch {}

    # Fallback: check TCP ports if service not found
    if (-not $serverRunning) {
        try {
            $conn = Get-NetTCPConnection -LocalPort $ServerPort -State Listen -ErrorAction SilentlyContinue
            if ($conn) { $serverRunning = $true }
        } catch {}
    }
    if (-not $juryRunning) {
        try {
            $conn = Get-NetTCPConnection -LocalPort $JuryPort -State Listen -ErrorAction SilentlyContinue
            if ($conn) { $juryRunning = $true }
        } catch {}
    }

    # Update icon & tooltip
    if ($serverRunning -and $juryRunning) {
        $trayIcon.Icon = $iconGreen
        $trayIcon.Text = "TurnFix – Server & Jury laufen"
        $miStatus.Text  = "Alles läuft"
    }
    elseif ($serverRunning) {
        $trayIcon.Icon = $iconYellow
        $trayIcon.Text = "TurnFix – Server läuft (Jury gestoppt)"
        $miStatus.Text  = "Teilweise aktiv"
    }
    elseif ($juryRunning) {
        $trayIcon.Icon = $iconYellow
        $trayIcon.Text = "TurnFix – Jury läuft (Server gestoppt)"
        $miStatus.Text  = "Teilweise aktiv"
    }
    else {
        $trayIcon.Icon = $iconRed
        $trayIcon.Text = "TurnFix – Server gestoppt"
        $miStatus.Text  = "Gestoppt"
    }

    # Detail lines
    $miServerStatus.Text = if ($serverRunning) { "  Server: läuft (Port $ServerPort)" } else { "  Server: gestoppt" }
    $miJuryStatus.Text   = if ($juryRunning)   { "  Jury:     läuft (Port $JuryPort)" } else { "  Jury:     gestoppt" }

    # Enable/disable buttons
    $miStart.Enabled   = (-not $serverRunning) -or (-not $juryRunning)
    $miStop.Enabled    = $serverRunning -or $juryRunning
    $miRestart.Enabled = $serverRunning -or $juryRunning
    $miOpenApp.Enabled = $serverRunning
    $miOpenJury.Enabled = $juryRunning
}

# ── Timer ──────────────────────────────────────────────────────────────────

$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = $CheckIntervalMs
$timer.Add_Tick({ Update-ServiceStatus })
$timer.Start()

# Initial check
Update-ServiceStatus

# ── Run ────────────────────────────────────────────────────────────────────

[System.Windows.Forms.Application]::Run()
