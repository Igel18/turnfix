# TurnFix Setup Configuration
# This file contains default settings for TurnFix installation
# You can modify these values before running the setup

# Installation Paths
$Global:TurnFixInstallPath = "C:\TurnFix"
$Global:TurnFixGitRepository = "https://github.com/Igel18/turnfix.git"
$Global:TurnFixGitBranch = "WebInterface"

# Database Configuration
$Global:PostgreSQLVersion = "15"
$Global:PostgreSQLHost = "localhost"
$Global:PostgreSQLPort = 5432
$Global:PostgreSQLAdminPassword = "turnfix2024"

# TurnFix Database Settings
$Global:TurnFixDatabaseName = "turnfix"
$Global:TurnFixDatabaseUser = "turnfix_user"
$Global:TurnFixDatabasePassword = "turnfix_pass"

# Application Configuration
$Global:TurnFixBackendPort = 3001
$Global:TurnFixFrontendPort = 5173
$Global:TurnFixEnvironment = "development"
$Global:TurnFixJWTSecret = "your-super-secret-jwt-key-change-in-production"

# Component Installation Flags
$Global:InstallNodeJS = $true
$Global:InstallPostgreSQL = $true
$Global:InstallGit = $true
$Global:InstallVSCode = $true
$Global:InstallPgAdmin = $true

# Setup Behavior
$Global:RequireAdminPrivileges = $false  # Set to $true to force admin mode
$Global:InteractiveMode = $true          # Set to $false for silent installation
$Global:CreateDesktopShortcuts = $true
$Global:CreateStartMenuShortcuts = $true

# Logging
$Global:EnableDetailedLogging = $true
$Global:LogRetentionDays = 30

# Export configuration for use in other scripts
Export-ModuleMember -Variable TurnFixInstallPath, TurnFixGitRepository, TurnFixGitBranch,
                              PostgreSQLVersion, PostgreSQLHost, PostgreSQLPort, PostgreSQLAdminPassword,
                              TurnFixDatabaseName, TurnFixDatabaseUser, TurnFixDatabasePassword,
                              TurnFixBackendPort, TurnFixFrontendPort, TurnFixEnvironment, TurnFixJWTSecret,
                              InstallNodeJS, InstallPostgreSQL, InstallGit, InstallVSCode, InstallPgAdmin,
                              RequireAdminPrivileges, InteractiveMode, CreateDesktopShortcuts, CreateStartMenuShortcuts,
                              EnableDetailedLogging, LogRetentionDays
