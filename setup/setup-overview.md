# TurnFix Windows Setup Package

## 📁 Setup Files Overview

### 🚀 Quick Start Files
- **`INSTALL.bat`** - Double-click installer (recommended for users)
- **`UNINSTALL.bat`** - Double-click uninstaller (complete removal)
- **`complete-setup.ps1`** - Complete automated setup (PowerShell)
- **`check-requirements.ps1`** - System requirements checker

### 🔧 Individual Setup Scripts
- **`install-prerequisites.ps1`** - Install Node.js, PostgreSQL, Git, VS Code
- **`setup-database.ps1`** - Create TurnFix database and user
- **`setup-turnfix.ps1`** - Download and configure TurnFix application
- **`uninstall-turnfix.ps1`** - Complete uninstaller with options

### ⚙️ Configuration
- **`config.ps1`** - Default configuration settings
- **`.env.template`** - Environment variables template (created during setup)

### 📚 Documentation
- **`README.md`** - Complete setup documentation
- **`setup-overview.md`** - This file

## 🎯 Installation Options

### Option 1: One-Click Install (Easiest)
```
1. Right-click INSTALL.bat
2. Select "Run as administrator"
3. Follow prompts
4. Done!
```

### Option 2: PowerShell Complete Setup
```powershell
# Run as Administrator
Set-ExecutionPolicy Bypass -Scope Process
.\complete-setup.ps1
```

### Option 3: Step-by-Step Installation
```powershell
# 1. Check system requirements
.\check-requirements.ps1

# 2. Install prerequisites
.\install-prerequisites.ps1

# 3. Setup database
.\setup-database.ps1

# 4. Setup application
.\setup-turnfix.ps1
```

### Option 4: Custom Installation
```powershell
# Modify config.ps1 first, then:
.\complete-setup.ps1 -InstallPath "D:\MyTurnFix" -PostgreSQLPassword "mypassword"
```

## 📋 What Gets Installed

### System Components
- **Chocolatey** - Package manager for Windows
- **Node.js LTS** - JavaScript runtime (latest stable)
- **PostgreSQL 15** - Database server
- **pgAdmin 4** - Database administration tool
- **Git for Windows** - Version control system
- **Visual Studio Code** - Code editor (optional)

### TurnFix Application
- **Source Code** - Complete TurnFix application from GitHub
- **Frontend** - React + TypeScript + Vite web interface
- **Backend** - Node.js + Express + Prisma API server
- **Database Schema** - Complete TurnFix database structure
- **Dependencies** - All required npm packages

### Configuration
- **Environment Files** - Database connections, API keys
- **Startup Scripts** - Easy application launching
- **Desktop Shortcuts** - Quick access (optional)

## 🗂️ Installation Structure

After installation, you'll have:

```
C:\TurnFix\                          # Main installation directory
├── newWebBased\
│   ├── server\                      # Backend API server
│   │   ├── .env                     # Environment configuration
│   │   ├── prisma\                  # Database schema
│   │   ├── src\                     # Server source code
│   │   └── package.json             # Server dependencies
│   └── client\                      # Frontend web application
│       ├── src\                     # Client source code
│       ├── public\                  # Static assets
│       └── package.json             # Client dependencies
├── setup\                           # Setup scripts (this folder)
├── start-turnfix.ps1               # Application startup script
└── README.md                       # Application documentation
```

## 🌐 Access Points

After installation and startup:

- **TurnFix Web Interface**: http://localhost:5173
- **TurnFix API**: http://localhost:3001
- **pgAdmin Database Tool**: http://localhost:5050
- **Application Files**: C:\TurnFix\

## 🔧 Customization Options

### Database Settings
```powershell
.\setup-database.ps1 -DatabasePassword "mypassword" -DatabaseName "my_turnfix"
```

### Installation Location
```powershell
.\setup-turnfix.ps1 -InstallPath "D:\TurnFix"
```

### Skip Components
```powershell
.\install-prerequisites.ps1 -SkipVSCode -SkipNodeJS
```

### Silent Installation
```powershell
.\complete-setup.ps1 -Interactive $false
```

## 📞 Support & Troubleshooting

### Log Files
Setup creates detailed logs:
- `setup-log-YYYYMMDD-HHMMSS.txt` - Installation progress
- Check console output during installation

### Common Issues
1. **PowerShell Execution Policy**: Run `Set-ExecutionPolicy Bypass -Scope Process`
2. **Administrator Rights**: Right-click PowerShell → "Run as administrator"
3. **Internet Connection**: Required for downloading components
4. **Port Conflicts**: Ensure ports 3001 and 5173 are available
5. **Antivirus**: May block installation - temporarily disable if needed

### Getting Help
- **GitHub Issues**: https://github.com/Igel18/turnfix/issues
- **Documentation**: Check README.md files
- **System Check**: Run `check-requirements.ps1`

## 🔄 Updates & Maintenance

### Updating TurnFix
```powershell
cd C:\TurnFix
git pull origin WebInterface
cd newWebBased\server && npm install
cd ..\client && npm install
```

### Backup Database
```powershell
pg_dump -U turnfix_user turnfix > backup.sql
```

### Uninstalling
```powershell
# Remove application
Remove-Item -Recurse -Force C:\TurnFix

# Remove database (optional)
psql -U postgres -c "DROP DATABASE turnfix; DROP USER turnfix_user;"

# Remove components (optional)
choco uninstall nodejs postgresql git vscode
```

## 🗑️ Uninstalling TurnFix

### Option 1: One-Click Uninstall (Easiest)
```
1. Right-click UNINSTALL.bat
2. Select "Run as administrator"  
3. Choose removal options
4. Done!
```

### Option 2: PowerShell Uninstall
```powershell
# Application only
.\uninstall-turnfix.ps1

# Application + database
.\uninstall-turnfix.ps1 -RemoveDatabase

# Everything
.\uninstall-turnfix.ps1 -RemoveAll
```

### Uninstall Options
| Parameter | Description |
|-----------|-------------|
| `-RemoveDatabase` | Remove TurnFix database |
| `-RemovePostgreSQL` | Remove PostgreSQL completely |
| `-RemoveNodeJS` | Remove Node.js |
| `-RemoveGit` | Remove Git for Windows |
| `-RemoveVSCode` | Remove Visual Studio Code |
| `-RemoveChocolatey` | Remove Chocolatey |
| `-RemoveAll` | Complete removal |
| `-KeepUserData` | Keep user settings/shortcuts |

## 🎯 Quick Reference

| Task | Command |
|------|---------|
| **Install Everything** | `INSTALL.bat` (as admin) |
| **Uninstall Everything** | `UNINSTALL.bat` (as admin) |
| **Check System** | `.\check-requirements.ps1` |
| **Start TurnFix** | `C:\TurnFix\start-turnfix.ps1` |
| **Access Web Interface** | http://localhost:5173 |
| **Database Admin** | http://localhost:5050 |
| **Update Application** | `cd C:\TurnFix && git pull` |

---

**Ready to install TurnFix? Start with `INSTALL.bat` or `check-requirements.ps1`!**  
**Need to remove TurnFix? Use `UNINSTALL.bat` for easy removal!**
