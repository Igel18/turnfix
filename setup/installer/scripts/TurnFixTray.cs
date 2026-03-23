// ============================================================================
// TurnFix Tray Icon - System Tray Status Monitor
// ============================================================================
// Compiled with: csc.exe /target:winexe /win32icon:..\..\..\resources\turnfix.ico
//                 /out:TurnFixTray.exe TurnFixTray.cs
// No external dependencies - uses .NET Framework built into Windows.
// Uses turnfix.ico as embedded resource for the tray icon.
//
// Shows TurnFix server status in the Windows system tray:
//   Green  = Both servers running
//   Yellow = Only one server running
//   Red    = All servers stopped
// ============================================================================

using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;
using System.Net.Sockets;
using System.ServiceProcess;
using System.Windows.Forms;
using System.Diagnostics;

namespace TurnFixTray
{
    static class Program
    {
        [STAThread]
        static void Main(string[] args)
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new TrayApplicationContext(args));
        }
    }

    class TrayApplicationContext : ApplicationContext
    {
        // ── Configuration ──────────────────────────────────────────────

        private string installDir;
        private string serviceName = "TurnFixServer";
        private string juryServiceName = "TurnFixJuryServer";
        private string pm2ServerName = "turnfix-server";
        private string pm2JuryName = "turnfix-jury-server";
        private int serverPort = 3001;
        private int juryPort = 3002;
        private int checkIntervalMs = 5000;
        private string nssmPath;
        private string logFile;

        // ── UI Elements ────────────────────────────────────────────────

        private NotifyIcon trayIcon;
        private Timer statusTimer;
        private Icon iconGreen, iconYellow, iconRed, iconGray;

        private ToolStripMenuItem miStatus;
        private ToolStripMenuItem miServerStatus;
        private ToolStripMenuItem miJuryStatus;
        private ToolStripMenuItem miStart;
        private ToolStripMenuItem miStop;
        private ToolStripMenuItem miRestart;
        private ToolStripMenuItem miOpenApp;
        private ToolStripMenuItem miOpenJury;

        // ── Constructor ────────────────────────────────────────────────

        public TrayApplicationContext(string[] args)
        {
            // Determine install directory
            if (args.Length > 0 && !string.IsNullOrEmpty(args[0]))
            {
                installDir = args[0];
            }
            else
            {
                string exeDir = Path.GetDirectoryName(
                    System.Reflection.Assembly.GetExecutingAssembly().Location);
                installDir = Path.GetDirectoryName(exeDir); // Go up from scripts/
            }

            nssmPath = Path.Combine(installDir, "nssm", "nssm.exe");

            // Setup logging
            string logDir = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "TurnFix");
            try { Directory.CreateDirectory(logDir); } catch { logDir = Path.GetTempPath(); }
            logFile = Path.Combine(logDir, "turnfix-tray.log");

            Log("=== TurnFix Tray starting ===");
            Log("InstallDir: " + installDir);
            Log("PID: " + Process.GetCurrentProcess().Id);

            // Read ports from config files
            ReadPortConfig();

            Log("Ports: Server=" + serverPort + ", Jury=" + juryPort);

            // Load base icon from turnfix.ico next to exe, or fallback to embedded
            string icoPath = Path.Combine(
                Path.GetDirectoryName(System.Reflection.Assembly.GetExecutingAssembly().Location),
                "turnfix.ico");
            LoadBaseIcon(icoPath);

            // Create status icons (base icon + colored status dot)
            iconGreen  = CreateStatusIcon(Color.FromArgb(34, 197, 94));
            iconYellow = CreateStatusIcon(Color.FromArgb(234, 179, 8));
            iconRed    = CreateStatusIcon(Color.FromArgb(220, 60, 60));
            iconGray   = CreateStatusIcon(Color.FromArgb(156, 163, 175));

            // Build context menu
            var menu = new ContextMenuStrip();

            miStatus = new ToolStripMenuItem("Status: Pruefe...");
            miStatus.Enabled = false;
            miStatus.Font = new Font(miStatus.Font, FontStyle.Bold);
            menu.Items.Add(miStatus);

            miServerStatus = new ToolStripMenuItem("  Server: -");
            miServerStatus.Enabled = false;
            menu.Items.Add(miServerStatus);

            miJuryStatus = new ToolStripMenuItem("  Jury:     -");
            miJuryStatus.Enabled = false;
            menu.Items.Add(miJuryStatus);

            menu.Items.Add(new ToolStripSeparator());

            miStart = new ToolStripMenuItem("Server starten", null, OnStartClick);
            menu.Items.Add(miStart);

            miStop = new ToolStripMenuItem("Server stoppen", null, OnStopClick);
            menu.Items.Add(miStop);

            miRestart = new ToolStripMenuItem("Server neustarten", null, OnRestartClick);
            menu.Items.Add(miRestart);

            menu.Items.Add(new ToolStripSeparator());

            miOpenApp = new ToolStripMenuItem("TurnFix oeffnen", null,
                (s, e) => OpenUrl("http://localhost:" + serverPort));
            menu.Items.Add(miOpenApp);

            miOpenJury = new ToolStripMenuItem("Jury-Portal oeffnen", null,
                (s, e) => OpenUrl("http://localhost:" + juryPort));
            menu.Items.Add(miOpenJury);

            menu.Items.Add(new ToolStripSeparator());

            var miLogs = new ToolStripMenuItem("Log-Ordner oeffnen", null, (s, e) =>
            {
                // Try server logs in install dir first, then standard install path, then tray log dir
                string[] candidates = new[] {
                    Path.Combine(installDir, "server", "logs"),
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "TurnFix", "server", "logs"),
                    Path.GetDirectoryName(logFile)
                };
                foreach (string dir in candidates)
                {
                    if (!string.IsNullOrEmpty(dir) && Directory.Exists(dir))
                    {
                        Process.Start("explorer.exe", dir);
                        return;
                    }
                }
                // Fallback: open tray log directory (create if needed)
                string fallback = Path.GetDirectoryName(logFile);
                try { Directory.CreateDirectory(fallback); } catch { }
                Process.Start("explorer.exe", fallback);
            });
            menu.Items.Add(miLogs);

            menu.Items.Add(new ToolStripSeparator());

            var miExit = new ToolStripMenuItem("Beenden", null, (s, e) =>
            {
                Log("Exit requested by user");
                ExitApplication();
            });
            menu.Items.Add(miExit);

            // Create tray icon (set visible AFTER icon + menu are assigned)
            trayIcon = new NotifyIcon();
            trayIcon.Icon = iconGray;
            trayIcon.Text = "TurnFix - Status wird geprueft...";
            trayIcon.ContextMenuStrip = menu;
            trayIcon.Visible = true;
            trayIcon.DoubleClick += (s, e) => OpenUrl("http://localhost:" + serverPort);

            Log("NotifyIcon created and visible");

            // Status check timer
            statusTimer = new Timer();
            statusTimer.Interval = checkIntervalMs;
            statusTimer.Tick += (s, e) => { try { UpdateStatus(); } catch (Exception ex) { Log("Timer tick error: " + ex.Message); } };
            statusTimer.Start();

            // Initial status check (deferred to avoid constructor crash)
            Log("Timer started - tray app running");
        }

        // ── Port Configuration ─────────────────────────────────────────

        private void ReadPortConfig()
        {
            try
            {
                string envFile = Path.Combine(installDir, "server", ".env");
                if (File.Exists(envFile))
                {
                    foreach (string line in File.ReadAllLines(envFile))
                    {
                        string trimmed = line.Trim();
                        if (trimmed.StartsWith("PORT=") || trimmed.StartsWith("PORT ="))
                        {
                            string val = trimmed.Substring(trimmed.IndexOf('=') + 1).Trim();
                            int port;
                            if (int.TryParse(val, out port))
                                serverPort = port;
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Log("WARNING: Could not read .env: " + ex.Message);
            }

            try
            {
                string ecoFile = Path.Combine(installDir, "server", "ecosystem.config.js");
                if (File.Exists(ecoFile))
                {
                    string content = File.ReadAllText(ecoFile);
                    // Simple extraction: find PORT values
                    var matches = System.Text.RegularExpressions.Regex.Matches(
                        content, @"PORT['""]?\s*[:=]\s*(\d+)");
                    if (matches.Count >= 2)
                    {
                        int port;
                        if (int.TryParse(matches[1].Groups[1].Value, out port))
                            juryPort = port;
                    }
                }
            }
            catch (Exception ex)
            {
                Log("WARNING: Could not read ecosystem.config.js: " + ex.Message);
            }
        }

        // ── Icon Creation ──────────────────────────────────────────────

        private Bitmap baseIconBitmap;  // 16x16 bitmap of turnfix.ico

        private void LoadBaseIcon(string icoPath)
        {
            try
            {
                if (File.Exists(icoPath))
                {
                    using (var ico = new Icon(icoPath, 16, 16))
                    {
                        baseIconBitmap = ico.ToBitmap();
                        Log("Loaded turnfix.ico from: " + icoPath);
                        return;
                    }
                }
            }
            catch (Exception ex)
            {
                Log("WARNING: Could not load turnfix.ico: " + ex.Message);
            }

            // Fallback: generate a simple "T" icon
            Log("Using fallback generated icon");
            baseIconBitmap = new Bitmap(16, 16);
            using (var g = Graphics.FromImage(baseIconBitmap))
            {
                g.SmoothingMode = SmoothingMode.AntiAlias;
                g.Clear(Color.FromArgb(59, 130, 246)); // TurnFix blue
                using (var font = new Font("Segoe UI", 9, FontStyle.Bold))
                using (var brush = new SolidBrush(Color.White))
                using (var sf = new StringFormat())
                {
                    sf.Alignment = StringAlignment.Center;
                    sf.LineAlignment = StringAlignment.Center;
                    g.DrawString("T", font, brush, new RectangleF(0, -0.5f, 16, 16), sf);
                }
            }
        }

        private Icon CreateStatusIcon(Color statusColor)
        {
            // Draw the base icon with a small colored status dot in bottom-right
            var bmp = new Bitmap(16, 16);
            using (var g = Graphics.FromImage(bmp))
            {
                g.SmoothingMode = SmoothingMode.AntiAlias;
                g.Clear(Color.Transparent);

                // Draw base TurnFix icon
                g.DrawImage(baseIconBitmap, 0, 0, 16, 16);

                // Draw status dot (bottom-right corner, 7x7 with 1px white border)
                // White border for visibility
                using (var whiteBrush = new SolidBrush(Color.White))
                    g.FillEllipse(whiteBrush, 8, 8, 8, 8);
                // Colored status dot
                using (var brush = new SolidBrush(statusColor))
                    g.FillEllipse(brush, 9, 9, 6, 6);
            }

            // Convert to ICO format via memory stream (stable icon ownership)
            using (var pngStream = new MemoryStream())
            {
                bmp.Save(pngStream, ImageFormat.Png);
                bmp.Dispose();
                byte[] pngBytes = pngStream.ToArray();

                var icoStream = new MemoryStream(); // Don't dispose - Icon needs it
                using (var writer = new BinaryWriter(icoStream, System.Text.Encoding.UTF8, true))
                {
                    // ICO header
                    writer.Write((ushort)0);            // reserved
                    writer.Write((ushort)1);            // type = icon
                    writer.Write((ushort)1);            // image count

                    // Directory entry
                    writer.Write((byte)16);             // width
                    writer.Write((byte)16);             // height
                    writer.Write((byte)0);              // color count
                    writer.Write((byte)0);              // reserved
                    writer.Write((ushort)1);            // planes
                    writer.Write((ushort)32);           // bits per pixel
                    writer.Write((uint)pngBytes.Length); // image size
                    writer.Write((uint)22);             // offset (6 header + 16 entry)

                    // PNG data
                    writer.Write(pngBytes);
                }

                icoStream.Position = 0;
                return new Icon(icoStream);
            }
        }

        // ── Status Check ───────────────────────────────────────────────

        private bool lastServerRunning = false;
        private bool lastJuryRunning = false;
        private bool firstCheck = true;

        private void UpdateStatus()
        {
            try
            {
                bool serverRunning = false;
                bool juryRunning = false;
                
                try { serverRunning = IsServiceRunning(serviceName); } catch { }
                try { juryRunning = IsServiceRunning(juryServiceName); } catch { }
                
                if (!serverRunning)
                {
                    try { serverRunning = IsPortListening(serverPort); } catch { }
                }
                if (!juryRunning)
                {
                    try { juryRunning = IsPortListening(juryPort); } catch { }
                }
                
                // Log only on status change
                if (firstCheck || serverRunning != lastServerRunning || juryRunning != lastJuryRunning)
                {
                    Log("Status: server=" + serverRunning + ", jury=" + juryRunning);
                    lastServerRunning = serverRunning;
                    lastJuryRunning = juryRunning;
                    firstCheck = false;
                }

                if (serverRunning && juryRunning)
                {
                    trayIcon.Icon = iconGreen;
                    trayIcon.Text = "TurnFix - Server & Jury laufen";
                    miStatus.Text = "Alles laeuft";
                }
                else if (serverRunning)
                {
                    trayIcon.Icon = iconYellow;
                    trayIcon.Text = "TurnFix - Jury gestoppt";
                    miStatus.Text = "Teilweise aktiv";
                }
                else if (juryRunning)
                {
                    trayIcon.Icon = iconYellow;
                    trayIcon.Text = "TurnFix - Server gestoppt";
                    miStatus.Text = "Teilweise aktiv";
                }
                else
                {
                    trayIcon.Icon = iconRed;
                    trayIcon.Text = "TurnFix - Server gestoppt";
                    miStatus.Text = "Gestoppt";
                }

                miServerStatus.Text = serverRunning
                    ? "  Server: laeuft (Port " + serverPort + ")"
                    : "  Server: gestoppt";
                miJuryStatus.Text = juryRunning
                    ? "  Jury: laeuft (Port " + juryPort + ")"
                    : "  Jury: gestoppt";

                miStart.Enabled = !serverRunning || !juryRunning;
                miStop.Enabled = serverRunning || juryRunning;
                miRestart.Enabled = serverRunning || juryRunning;
                miOpenApp.Enabled = serverRunning;
                miOpenJury.Enabled = juryRunning;
            }
            catch (Exception ex)
            {
                Log("UpdateStatus error: " + ex.ToString());
            }
        }

        private bool IsServiceRunning(string name)
        {
            try
            {
                using (var sc = new ServiceController(name))
                    return sc.Status == ServiceControllerStatus.Running;
            }
            catch { return false; }
        }

        private bool IsPortListening(int port)
        {
            try
            {
                using (var client = new TcpClient())
                {
                    // Use async connect with short timeout to avoid blocking
                    var result = client.BeginConnect("127.0.0.1", port, null, null);
                    bool connected = result.AsyncWaitHandle.WaitOne(500); // 500ms timeout
                    if (connected && client.Connected)
                    {
                        client.EndConnect(result);
                        return true;
                    }
                    return false;
                }
            }
            catch { return false; }
        }

        // ── Service Control ────────────────────────────────────────────

        private void OnStartClick(object sender, EventArgs e)
        {
            RunServiceCommand("start", serviceName);
            RunServiceCommand("start", juryServiceName);
            System.Threading.Thread.Sleep(2000);
            UpdateStatus();
        }

        private void OnStopClick(object sender, EventArgs e)
        {
            RunServiceCommand("stop", serviceName);
            RunServiceCommand("stop", juryServiceName);
            System.Threading.Thread.Sleep(2000);
            UpdateStatus();
        }

        private void OnRestartClick(object sender, EventArgs e)
        {
            RunServiceCommand("restart", serviceName);
            RunServiceCommand("restart", juryServiceName);
            System.Threading.Thread.Sleep(3000);
            UpdateStatus();
        }

        private void RunServiceCommand(string command, string svcName)
        {
            try
            {
                if (File.Exists(nssmPath))
                {
                    Log("Using NSSM: " + command + " " + svcName);
                    var psi = new ProcessStartInfo(nssmPath, command + " " + svcName)
                    {
                        WindowStyle = ProcessWindowStyle.Hidden,
                        CreateNoWindow = true
                    };
                    var p = Process.Start(psi);
                    if (p != null) p.WaitForExit(10000);
                }
                else if (IsWindowsServiceInstalled(svcName))
                {
                    Log("Using ServiceController: " + command + " " + svcName);
                    using (var sc = new ServiceController(svcName))
                    {
                        if (command == "start")
                            sc.Start();
                        else if (command == "stop")
                            sc.Stop();
                        else if (command == "restart")
                        {
                            sc.Stop();
                            sc.WaitForStatus(ServiceControllerStatus.Stopped, TimeSpan.FromSeconds(10));
                            sc.Start();
                        }
                    }
                }
                else
                {
                    // PM2 fallback (default for dev/production without Windows services)
                    string pm2Name = svcName == serviceName ? pm2ServerName : pm2JuryName;
                    Log("Using PM2: " + command + " " + pm2Name);
                    RunPm2Command(command, pm2Name);
                }
            }
            catch (Exception ex)
            {
                Log("Service command '" + command + " " + svcName + "' failed: " + ex.Message);
            }
        }

        private bool IsWindowsServiceInstalled(string name)
        {
            try
            {
                using (var sc = new ServiceController(name))
                {
                    var status = sc.Status; // throws InvalidOperationException if not installed
                    return true;
                }
            }
            catch { return false; }
        }

        private void RunPm2Command(string command, string pm2Name)
        {
            try
            {
                // Use 'cmd /c pm2 ...' so pm2 is found via PATH (pm2.cmd on Windows)
                var psi = new ProcessStartInfo("cmd.exe", "/c pm2 " + command + " " + pm2Name)
                {
                    WindowStyle = ProcessWindowStyle.Hidden,
                    CreateNoWindow = true,
                    WorkingDirectory = installDir
                };
                var p = Process.Start(psi);
                if (p != null) p.WaitForExit(30000);
                Log("PM2 " + command + " " + pm2Name + " done");
            }
            catch (Exception ex)
            {
                Log("RunPm2Command failed: " + ex.Message);
            }
        }

        // ── Helpers ────────────────────────────────────────────────────

        private void OpenUrl(string url)
        {
            try { Process.Start(url); }
            catch (Exception ex) { Log("OpenUrl failed: " + ex.Message); }
        }

        private void Log(string message)
        {
            try
            {
                string line = string.Format("[{0:yyyy-MM-dd HH:mm:ss}] {1}\r\n",
                    DateTime.Now, message);
                File.AppendAllText(logFile, line);
            }
            catch { }
        }

        private void ExitApplication()
        {
            statusTimer.Stop();
            statusTimer.Dispose();
            trayIcon.Visible = false;
            trayIcon.Dispose();
            iconGreen.Dispose();
            iconYellow.Dispose();
            iconRed.Dispose();
            iconGray.Dispose();
            if (baseIconBitmap != null) baseIconBitmap.Dispose();
            Log("=== TurnFix Tray stopped ===");
            ExitThread();
        }
    }
}
