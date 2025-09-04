# TurnFix Database Setup Script
# This script creates the TurnFix database and user

param(
    [string]$PostgreSQLPassword = "turnfix2024",
    [string]$DatabaseName = "turnfix",
    [string]$DatabaseUser = "turnfix_user",
    [string]$DatabasePassword = "turnfix_pass",
    [string]$PostgreSQLHost = "localhost",
    [int]$PostgreSQLPort = 5432
)

Write-Host "=== TurnFix Database Setup ===" -ForegroundColor Green
Write-Host "Creating TurnFix database and user..." -ForegroundColor Yellow
Write-Host ""

# Function to test PostgreSQL connection
function Test-PostgreSQLConnection {
    param($host, $port, $password)
    
    try {
        $env:PGPASSWORD = $password
        $result = & psql -h $host -p $port -U postgres -c "SELECT version();" 2>&1
        $env:PGPASSWORD = $null
        
        if ($LASTEXITCODE -eq 0) {
            return $true
        } else {
            return $false
        }
    } catch {
        return $false
    }
}

# Function to execute SQL command
function Invoke-PostgreSQLCommand {
    param($command, $database = "postgres")
    
    try {
        $env:PGPASSWORD = $PostgreSQLPassword
        $result = & psql -h $PostgreSQLHost -p $PostgreSQLPort -U postgres -d $database -c $command 2>&1
        $env:PGPASSWORD = $null
        
        if ($LASTEXITCODE -eq 0) {
            return $true
        } else {
            Write-Host "SQL Error: $result" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "Error executing SQL: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Check if PostgreSQL is running
Write-Host "Checking PostgreSQL connection..." -ForegroundColor Yellow
if (-not (Test-PostgreSQLConnection -host $PostgreSQLHost -port $PostgreSQLPort -password $PostgreSQLPassword)) {
    Write-Host "ERROR: Cannot connect to PostgreSQL!" -ForegroundColor Red
    Write-Host "Please ensure:" -ForegroundColor Yellow
    Write-Host "1. PostgreSQL is running" -ForegroundColor White
    Write-Host "2. The password '$PostgreSQLPassword' is correct" -ForegroundColor White
    Write-Host "3. PostgreSQL is listening on $PostgreSQLHost`:$PostgreSQLPort" -ForegroundColor White
    exit 1
}

Write-Host "PostgreSQL connection successful!" -ForegroundColor Green
Write-Host ""

# Create database user
Write-Host "Creating database user '$DatabaseUser'..." -ForegroundColor Yellow
$createUserSQL = "CREATE USER $DatabaseUser WITH PASSWORD '$DatabasePassword';"
if (Invoke-PostgreSQLCommand -command $createUserSQL) {
    Write-Host "Database user created successfully!" -ForegroundColor Green
} else {
    Write-Host "User may already exist, continuing..." -ForegroundColor Yellow
}

# Create database
Write-Host "Creating database '$DatabaseName'..." -ForegroundColor Yellow
$createDbSQL = "CREATE DATABASE $DatabaseName OWNER $DatabaseUser;"
if (Invoke-PostgreSQLCommand -command $createDbSQL) {
    Write-Host "Database created successfully!" -ForegroundColor Green
} else {
    Write-Host "Database may already exist, continuing..." -ForegroundColor Yellow
}

# Grant privileges
Write-Host "Granting privileges..." -ForegroundColor Yellow
$grantSQL = "GRANT ALL PRIVILEGES ON DATABASE $DatabaseName TO $DatabaseUser;"
if (Invoke-PostgreSQLCommand -command $grantSQL) {
    Write-Host "Privileges granted successfully!" -ForegroundColor Green
}

# Test connection to the new database
Write-Host "Testing connection to TurnFix database..." -ForegroundColor Yellow
$env:PGPASSWORD = $DatabasePassword
$testResult = & psql -h $PostgreSQLHost -p $PostgreSQLPort -U $DatabaseUser -d $DatabaseName -c "SELECT 'Connection successful!' as status;" 2>&1
$env:PGPASSWORD = $null

if ($LASTEXITCODE -eq 0) {
    Write-Host "Database connection test successful!" -ForegroundColor Green
} else {
    Write-Host "WARNING: Database connection test failed!" -ForegroundColor Yellow
    Write-Host "Error: $testResult" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Database Setup Complete ===" -ForegroundColor Green
Write-Host "Database Details:" -ForegroundColor Cyan
Write-Host "- Host: $PostgreSQLHost" -ForegroundColor White
Write-Host "- Port: $PostgreSQLPort" -ForegroundColor White
Write-Host "- Database: $DatabaseName" -ForegroundColor White
Write-Host "- User: $DatabaseUser" -ForegroundColor White
Write-Host "- Password: $DatabasePassword" -ForegroundColor White
Write-Host ""
Write-Host "Connection String for TurnFix:" -ForegroundColor Yellow
Write-Host "DATABASE_URL=postgresql://$DatabaseUser`:$DatabasePassword@$PostgreSQLHost`:$PostgreSQLPort/$DatabaseName" -ForegroundColor Cyan
Write-Host ""

# Create .env template
$envContent = @"
# TurnFix Environment Configuration
# Database Configuration
DATABASE_URL=postgresql://$DatabaseUser`:$DatabasePassword@$PostgreSQLHost`:$PostgreSQLPort/$DatabaseName
DB_HOST=$PostgreSQLHost
DB_PORT=$PostgreSQLPort
DB_NAME=$DatabaseName
DB_USER=$DatabaseUser
DB_PASSWORD=$DatabasePassword

# Application Configuration
PORT=3001
NODE_ENV=development

# JWT Configuration (change in production!)
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# CORS Configuration
CORS_ORIGIN=http://localhost:5173
"@

$envPath = Join-Path (Split-Path $PSScriptRoot -Parent) ".env.template"
$envContent | Out-File -FilePath $envPath -Encoding UTF8
Write-Host "Environment template created at: $envPath" -ForegroundColor Green

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Run 'setup-turnfix.ps1' to clone and configure the TurnFix application" -ForegroundColor White
Write-Host "2. The database schema will be created automatically by Prisma" -ForegroundColor White

Read-Host "Press Enter to continue"
