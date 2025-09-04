# TurnFix Windows Setup

Complete automated installation package for TurnFix gymnastics competition management software on Windows.

## 🚀 Quick Start

### Option 1: One-Click Install (Recommended)
1. **Download** this setup folder
2. **Right-click** on `INSTALL.bat` → **"Run as administrator"**
3. **Follow** the prompts
4. **Done!** TurnFix will be ready to use

### Option 2: PowerShell Install
```powershell
# Run as Administrator
Set-ExecutionPolicy Bypass -Scope Process
.\complete-setup.ps1
```

## 📋 What Gets Installed

### Prerequisites
- **Chocolatey** - Windows package manager
- **Node.js LTS** - JavaScript runtime
- **PostgreSQL 15** - Database server with pgAdmin
- **Git for Windows** - Version control
- **Visual Studio Code** - Development environment (optional)

### Database
- PostgreSQL database server
- `turnfix` database
- `turnfix_user` with appropriate permissions
- Prisma schema deployment

### Application
- TurnFix source code from GitHub
- Frontend (React + TypeScript + Vite)
- Backend (Node.js + Express + Prisma)
- All npm dependencies
- Environment configuration
- Startup scripts

## 🛠️ Manual Installation

If you prefer to run individual steps:

### 1. Install Prerequisites
```powershell
.\install-prerequisites.ps1
```

**Parameters:**
- `-PostgreSQLPassword` - Set PostgreSQL admin password (default: "turnfix2024")
- `-SkipNodeJS` - Skip Node.js installation
- `-SkipPostgreSQL` - Skip PostgreSQL installation
- `-SkipGit` - Skip Git installation
- `-SkipVSCode` - Skip Visual Studio Code installation

### 2. Setup Database
```powershell
.\setup-database.ps1
```

**Parameters:**
- `-PostgreSQLPassword` - PostgreSQL admin password (default: "turnfix2024")
- `-DatabaseName` - Database name (default: "turnfix")
- `-DatabaseUser` - Database user (default: "turnfix_user")
- `-DatabasePassword` - Database password (default: "turnfix_pass")
- `-PostgreSQLHost` - Database host (default: "localhost")
- `-PostgreSQLPort` - Database port (default: 5432)

### 3. Setup Application
```powershell
.\setup-turnfix.ps1
```

**Parameters:**
- `-InstallPath` - Installation directory (default: "C:\TurnFix")
- `-GitRepository` - Repository URL
- `-Branch` - Git branch (default: "WebInterface")
- `-SkipClone` - Skip repository cloning
- `-SkipDependencies` - Skip npm install
- `-SkipDatabase` - Skip Prisma setup

## 🚀 Starting TurnFix

After installation, you have several options:

### Option 1: Startup Script (Recommended)
```powershell
C:\TurnFix\start-turnfix.ps1
```

### Option 2: Manual Start
```powershell
# Terminal 1 - Backend
cd "C:\TurnFix\newWebBased\server"
npm run dev

# Terminal 2 - Frontend  
cd "C:\TurnFix\newWebBased\client"
npm run dev
```

### Option 3: Double-click
Double-click `C:\TurnFix\start-turnfix.ps1`

## 🌐 Access TurnFix

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **pgAdmin**: http://localhost:5050 (if installed)

## 📁 Installation Structure

```
C:\TurnFix\
├── newWebBased\
│   ├── server\          # Backend (Node.js + Express + Prisma)
│   │   ├── .env         # Environment configuration
│   │   └── ...
│   └── client\          # Frontend (React + TypeScript + Vite)
│       └── ...
├── setup\               # Setup scripts (this folder)
└── start-turnfix.ps1    # Startup script
```

## 🔧 Configuration

### Database Connection
Default configuration in `.env`:
```env
DATABASE_URL=postgresql://turnfix_user:turnfix_pass@localhost:5432/turnfix
```

### Application Settings
- **Backend Port**: 3001
- **Frontend Port**: 5173
- **Environment**: development

## 🛠️ Troubleshooting

### Common Issues

#### 1. PowerShell Execution Policy
```powershell
Set-ExecutionPolicy Bypass -Scope Process
```

#### 2. PostgreSQL Connection Failed
- Check if PostgreSQL service is running
- Verify password: default is "turnfix2024"
- Check Windows Firewall settings

#### 3. Node.js/npm Not Found
- Restart terminal/PowerShell after installation
- Check PATH environment variable
- Reinstall Node.js manually from nodejs.org

#### 4. Port Already in Use
- Stop other applications using ports 3001 or 5173
- Or modify ports in configuration files

#### 5. Permission Denied
- Run PowerShell as Administrator
- Check Windows Defender/Antivirus settings

### Log Files
Setup creates detailed log files:
- `setup-log-YYYYMMDD-HHMMSS.txt` - Installation log
- Check server/client console output for runtime issues

### Verification Steps
```powershell
# Check Node.js
node --version
npm --version

# Check PostgreSQL
psql -U postgres -c "SELECT version();"

# Check Git
git --version

# Test database connection
psql -U turnfix_user -d turnfix -c "SELECT 'OK' as status;"
```

## 🔄 Updating TurnFix

To update to the latest version:
```powershell
cd C:\TurnFix
git pull origin WebInterface
cd newWebBased\server
npm install
cd ..\client  
npm install
```

## 🗑️ Uninstalling TurnFix

### Option 1: One-Click Uninstall (Recommended)
1. **Navigate** to the setup folder
2. **Right-click** on `UNINSTALL.bat` → **"Run as administrator"**
3. **Choose** removal options:
   - Remove TurnFix application only
   - Remove TurnFix + database
   - Remove everything (complete uninstall)
   - Custom removal options
4. **Follow** the prompts

### Option 2: PowerShell Uninstall
```powershell
# Basic uninstall (application only)
.\uninstall-turnfix.ps1

# Remove application and database
.\uninstall-turnfix.ps1 -RemoveDatabase

# Complete removal (everything)
.\uninstall-turnfix.ps1 -RemoveAll

# Custom options
.\uninstall-turnfix.ps1 -RemoveDatabase -RemoveNodeJS -RemoveGit
```

### Uninstall Options

| Parameter | Description |
|-----------|-------------|
| `-RemoveDatabase` | Remove TurnFix database and user |
| `-RemovePostgreSQL` | Remove PostgreSQL completely |
| `-RemoveNodeJS` | Remove Node.js |
| `-RemoveGit` | Remove Git for Windows |
| `-RemoveVSCode` | Remove Visual Studio Code |
| `-RemoveChocolatey` | Remove Chocolatey package manager |
| `-RemoveAll` | Remove everything (complete uninstall) |
| `-KeepUserData` | Keep shortcuts, registry entries, temp files |
| `-Silent` | No confirmation prompts |

### Manual Removal
If automated uninstall fails:

```powershell
# Stop TurnFix processes
Get-Process -Name "node" | Where-Object {$_.Path -like "*TurnFix*"} | Stop-Process -Force

# Remove application
Remove-Item -Recurse -Force C:\TurnFix

# Remove database manually
psql -U postgres -c "DROP DATABASE IF EXISTS turnfix;"
psql -U postgres -c "DROP USER IF EXISTS turnfix_user;"

# Remove components via Chocolatey
choco uninstall nodejs postgresql15 git vscode chocolatey -y
```

## 📞 Support

- **GitHub Issues**: https://github.com/Igel18/turnfix/issues
- **Documentation**: https://github.com/Igel18/turnfix
- **License**: GNU GPL v3

## ⚙️ System Requirements

- **OS**: Windows 10/11 (64-bit)
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 2GB free space
- **Network**: Internet connection for downloads
- **Permissions**: Administrator access recommended

## 🔐 Security Notes

- Default passwords are used for development
- Change all passwords in production environments
- Review firewall settings for production use
- Keep all components updated

---

**Created with ❤️ for the gymnastics community**
