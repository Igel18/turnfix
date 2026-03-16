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

# ── Logging ────────────────────────────────────────────────────────────────

# Log file in user-writable %LOCALAPPDATA%\TurnFix (Program Files is read-only for normal users)
$LogDir = Join-Path $env:LOCALAPPDATA "TurnFix"
try {
    if (-not (Test-Path $LogDir)) { New-Item -Path $LogDir -ItemType Directory -Force | Out-Null }
} catch {
    $LogDir = $env:TEMP
}
$LogFile = Join-Path $LogDir "turnfix-tray.log"

function Write-TrayLog {
    param([string]$Message)
    try {
        $ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
        "[$ts] $Message" | Out-File -FilePath $LogFile -Append -Encoding utf8 -ErrorAction SilentlyContinue
    } catch {}
}

Write-TrayLog "=== TurnFix Tray starting ==="
Write-TrayLog "InstallDir: $InstallDir"
Write-TrayLog "PowerShell: $($PSVersionTable.PSVersion) | PID: $PID"

# ── Load Assemblies ────────────────────────────────────────────────────────

try {
    Add-Type -AssemblyName System.Windows.Forms
    Add-Type -AssemblyName System.Drawing
    Write-TrayLog "Assemblies loaded"
} catch {
    Write-TrayLog "FATAL: Failed to load assemblies: $_"
    exit 1
}

# MUST be called BEFORE any WinForms control is created
try {
    [System.Windows.Forms.Application]::EnableVisualStyles()
    [System.Windows.Forms.Application]::SetCompatibleTextRenderingDefault($false)
    [System.Windows.Forms.Application]::SetUnhandledExceptionMode(
        [System.Windows.Forms.UnhandledExceptionMode]::CatchException
    )
    Write-TrayLog "WinForms application mode configured"
} catch {
    Write-TrayLog "WARNING: SetUnhandledExceptionMode failed: $_"
}

# Handle thread exceptions silently (prevents crash dialog on Win11)
[System.Windows.Forms.Application]::add_ThreadException({
    param($sender, $e)
    try { Write-TrayLog "ThreadException caught: $($e.Exception.Message)" } catch {}
})

# Hide PowerShell console window
try {
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
    Write-TrayLog "Console window hidden"
} catch {
    Write-TrayLog "WARNING: Could not hide console: $_"
}

# ── Create Icons ───────────────────────────────────────────────────────────

# We need DestroyIcon to properly manage icon handles
Add-Type -Name IconHelper -Namespace TurnFix -MemberDefinition @"
    [System.Runtime.InteropServices.DllImport("user32.dll", CharSet = System.Runtime.InteropServices.CharSet.Auto)]
    public extern static bool DestroyIcon(IntPtr handle);
"@

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

    # Convert Bitmap to Icon via MemoryStream to get an independent, stable Icon object.
    # Icon.FromHandle() does NOT own the handle and GC can invalidate it (Win11 issue).
    $ms = New-Object System.IO.MemoryStream
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()

    # Build .ico format in memory: ICO header + directory entry + PNG data
    $pngBytes = $ms.ToArray()
    $ms.Dispose()

    $icoStream = New-Object System.IO.MemoryStream
    $writer = New-Object System.IO.BinaryWriter($icoStream)
    # ICO header: reserved(2) + type=1(2) + count=1(2)
    $writer.Write([uint16]0)
    $writer.Write([uint16]1)
    $writer.Write([uint16]1)
    # Directory entry: width, height, colors, reserved, planes, bpp, size, offset
    $writer.Write([byte]16)          # width
    $writer.Write([byte]16)          # height
    $writer.Write([byte]0)           # color count
    $writer.Write([byte]0)           # reserved
    $writer.Write([uint16]1)         # planes
    $writer.Write([uint16]32)        # bits per pixel
    $writer.Write([uint32]$pngBytes.Length)  # image size
    $writer.Write([uint32]22)        # offset to image data (6 header + 16 directory)
    # PNG data
    $writer.Write($pngBytes)
    $writer.Flush()

    $icoStream.Position = 0
    $icon = New-Object System.Drawing.Icon($icoStream)
    # Don't dispose icoStream - the Icon needs it alive
    return $icon
}

try {
    $iconGreen  = New-TrayIcon ([System.Drawing.Color]::FromArgb(34, 197, 94))
    $iconYellow = New-TrayIcon ([System.Drawing.Color]::FromArgb(234, 179, 8))
    $iconRed    = New-TrayIcon ([System.Drawing.Color]::FromArgb(220, 60, 60))
    $iconGray   = New-TrayIcon ([System.Drawing.Color]::FromArgb(156, 163, 175))
    Write-TrayLog "Icons created"
} catch {
    Write-TrayLog "FATAL: Failed to create icons: $_"
    exit 1
}

# ── NotifyIcon ─────────────────────────────────────────────────────────────

# Create ApplicationContext to keep the message loop alive (required on Win11)
$script:appContext = New-Object System.Windows.Forms.ApplicationContext
Write-TrayLog "ApplicationContext created"

$trayIcon = New-Object System.Windows.Forms.NotifyIcon
$trayIcon.Icon = $iconGray
$trayIcon.Text = "TurnFix - Pruefe Status..."
$trayIcon.Visible = $false  # Set visible AFTER menu is assigned (Win11 fix)
Write-TrayLog "NotifyIcon created"

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
    Write-TrayLog "Exit requested by user"
    $timer.Stop()
    $trayIcon.Visible = $false
    $trayIcon.Dispose()
    $script:appContext.ExitThread()
})
[void]$menu.Items.Add($miExit)

$trayIcon.ContextMenuStrip = $menu

# NOW make visible (after icon + menu are fully set up — Win11 requires this order)
$trayIcon.Visible = $true
Write-TrayLog "NotifyIcon now visible"

# Double-click opens browser
$trayIcon.Add_DoubleClick({
    Start-Process "http://localhost:$ServerPort"
})

# ── Status Check ───────────────────────────────────────────────────────────

function Test-PortListening {
    param([int]$Port)
    try {
        $listener = New-Object System.Net.Sockets.TcpClient
        $listener.Connect("127.0.0.1", $Port)
        $listener.Close()
        return $true
    } catch {
        return $false
    }
}

function Update-ServiceStatus {
  try {
    $serverRunning = $false
    $juryRunning   = $false

    # Check Windows services
    try {
        $svc = Get-Service -Name $ServiceName -ErrorAction Stop
        if ($svc -and $svc.Status -eq 'Running') { $serverRunning = $true }
    } catch {}

    try {
        $svc = Get-Service -Name $JuryServiceName -ErrorAction Stop
        if ($svc -and $svc.Status -eq 'Running') { $juryRunning = $true }
    } catch {}

    # Fallback: check TCP ports via .NET (avoids Get-NetTCPConnection PipelineStoppedException on Win11)
    if (-not $serverRunning) {
        $serverRunning = Test-PortListening -Port $ServerPort
    }
    if (-not $juryRunning) {
        $juryRunning = Test-PortListening -Port $JuryPort
    }

    # Update icon & tooltip
    if ($serverRunning -and $juryRunning) {
        $trayIcon.Icon = $iconGreen
        $trayIcon.Text = "TurnFix - Server & Jury laufen"
        $miStatus.Text  = "Alles laeuft"
    }
    elseif ($serverRunning) {
        $trayIcon.Icon = $iconYellow
        $trayIcon.Text = "TurnFix - Server laeuft (Jury gestoppt)"
        $miStatus.Text  = "Teilweise aktiv"
    }
    elseif ($juryRunning) {
        $trayIcon.Icon = $iconYellow
        $trayIcon.Text = "TurnFix - Jury laeuft (Server gestoppt)"
        $miStatus.Text  = "Teilweise aktiv"
    }
    else {
        $trayIcon.Icon = $iconRed
        $trayIcon.Text = "TurnFix - Server gestoppt"
        $miStatus.Text  = "Gestoppt"
    }

    # Detail lines
    $miServerStatus.Text = if ($serverRunning) { "  Server: laeuft (Port $ServerPort)" } else { "  Server: gestoppt" }
    $miJuryStatus.Text   = if ($juryRunning)   { "  Jury:     laeuft (Port $JuryPort)" } else { "  Jury:     gestoppt" }

    # Enable/disable buttons
    $miStart.Enabled   = (-not $serverRunning) -or (-not $juryRunning)
    $miStop.Enabled    = $serverRunning -or $juryRunning
    $miRestart.Enabled = $serverRunning -or $juryRunning
    $miOpenApp.Enabled = $serverRunning
    $miOpenJury.Enabled = $juryRunning
  } catch {
    # Silently handle any unexpected errors to prevent WinForms crash
  }
}

# ── Timer ──────────────────────────────────────────────────────────────────

$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = $CheckIntervalMs
$timer.Add_Tick({
    try { Update-ServiceStatus } catch {}
})
$timer.Start()

# Initial check
try { Update-ServiceStatus } catch {}

Write-TrayLog "Starting Application.Run with ApplicationContext"

# ── Run ────────────────────────────────────────────────────────────────────

try {
    [System.Windows.Forms.Application]::Run($script:appContext)
} catch {
    Write-TrayLog "Application.Run exception: $_"
} finally {
    Write-TrayLog "Application.Run ended - cleaning up"
    try { $timer.Stop(); $timer.Dispose() } catch {}
    try { $trayIcon.Visible = $false; $trayIcon.Dispose() } catch {}
    try { $iconGreen.Dispose(); $iconYellow.Dispose(); $iconRed.Dispose(); $iconGray.Dispose() } catch {}
    Write-TrayLog "=== TurnFix Tray stopped ==="
}
