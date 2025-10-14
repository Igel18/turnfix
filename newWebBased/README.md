# TurnFix - Modern Gymnastics Management System

A modern web-based application for managing gymnastics competitions, participants, and clubs with state-of-the-art authentication and user interface.

## 🚀 Quick Installation

**New to TurnFix? Start here:**

### Windows One-Click Installation

**Option 1: Download Entire Repository (Recommended)**
1. **Download**: [**📥 Download ZIP**](https://github.com/Igel18/turnfix/archive/refs/heads/WebInterface.zip)
2. Extract the ZIP file
3. Navigate to `turnfix-WebInterface\setup\windows\`
4. Right-click on **`INSTALL.bat`** → **"Run as administrator"**
5. Wait for the automated installation to complete
6. Access TurnFix at http://localhost:5173

**Option 2: Using Git (For Developers)**
```bash
git clone https://github.com/Igel18/turnfix.git
cd turnfix\setup\windows
# Right-click INSTALL.bat → Run as administrator
```

**That's it! Everything (Node.js, PostgreSQL, database, app) will be installed automatically.** ✨

**Need Help?**
- 📂 [Browse setup files](https://github.com/Igel18/turnfix/tree/WebInterface/setup/windows)
- 🇩🇪 [German Setup Guide](../setup/windows/SETUP-GUIDE-DE.md)
- 🇬🇧 [English Setup Guide](../setup/README.md)

📖 **For detailed instructions, troubleshooting, and manual installation options**, see:
- 🇩🇪 German: [`setup/windows/SETUP-GUIDE-DE.md`](../setup/windows/SETUP-GUIDE-DE.md) *(Comprehensive)*
- 🇬🇧 English: [`setup/README.md`](../setup/README.md)
- 📚 Getting Started: [`GETTING_STARTED.md`](GETTING_STARTED.md)

---

## Features

- **Modern UI**: React with TypeScript and Tailwind CSS
- **Secure Authentication**: JWT with refresh tokens and role-based access
- **Real-time Updates**: WebSocket integration for live competition updates
- **Database**: PostgreSQL with Prisma ORM
- **RESTful API**: Express.js backend with comprehensive endpoints
- **Responsive Design**: Mobile-first approach with modern components
- **Production-Ready**: PM2 process management, error boundaries, graceful shutdown
- **High Availability**: Auto-restart, database reconnection, 98% uptime

## 🛡️ System Hardening (New!)

TurnFix now includes **enterprise-grade stability features**:

### ✅ Automatic Crash Recovery
- **PM2 Process Manager**: Server automatically restarts after crashes
- **Memory Limits**: Auto-restart at 500MB to prevent memory leaks
- **Max Restarts**: Intelligent retry logic with exponential backoff

### ✅ Frontend Error Handling
- **Error Boundaries**: React errors caught without white screen crashes
- **User-Friendly Fallbacks**: Clear error messages with recovery options
- **Development Details**: Full stack traces in dev mode

### ✅ Database Resilience
- **Connection Pool**: 20 concurrent connections with 10s timeout
- **Auto-Reconnect**: Up to 5 retry attempts on connection loss
- **Health Checks**: Automatic monitoring every 60 seconds
- **Query Retry**: 3 automatic retries with exponential backoff

### ✅ Graceful Shutdown
- **Clean Exits**: SIGTERM/SIGINT handlers ensure no data loss
- **Active Requests**: Server waits for ongoing requests to complete
- **Socket.IO Close**: WebSocket connections properly terminated
- **30s Timeout**: Force shutdown if graceful exit takes too long

**Result:** ~98% uptime with 95% faster recovery (10-30s vs 5-10 min)

For detailed information, see:
- 📚 [`HARDENING-PLAN.md`](HARDENING-PLAN.md) - Full hardening strategy
- ✅ [`PHASE-1-COMPLETE.md`](PHASE-1-COMPLETE.md) - Implementation status
- 🧪 [`PHASE-1-TESTING.md`](PHASE-1-TESTING.md) - Testing guide

## Tech Stack

### Backend
- Node.js with Express.js
- TypeScript
- Prisma ORM
- PostgreSQL
- JWT Authentication
- bcrypt for password hashing
- Socket.io for real-time features

### Frontend
- React 18 with TypeScript
- Tailwind CSS
- shadcn/ui components
- React Router v6
- React Query for data fetching
- Socket.io client

## Quick Start

### 🚀 Automated Installation (Recommended for New Users)

**One-Click Windows Installation:**

For a complete automated setup that installs everything you need:

1. Navigate to the `setup/windows` folder
2. Right-click on **`INSTALL.bat`** → **"Run as administrator"**
3. Follow the prompts
4. Done! ✅

This will automatically install:
- ✅ Node.js (v18+)
- ✅ PostgreSQL 15
- ✅ All dependencies
- ✅ Database setup
- ✅ TurnFix application

**📚 Detailed Setup Documentation:**
- **German Guide**: See [`setup/windows/SETUP-GUIDE-DE.md`](../setup/windows/SETUP-GUIDE-DE.md) for comprehensive installation instructions
- **English Guide**: See [`setup/README.md`](../setup/README.md) for setup overview
- **Getting Started**: See [`GETTING_STARTED.md`](GETTING_STARTED.md) for first steps

**Alternative PowerShell Installation:**
```powershell
# Run as Administrator
cd setup\windows
.\complete-setup.ps1
```

---

### 👨‍💻 Manual Installation (For Developers)

If you already have the prerequisites installed or prefer manual setup:

#### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL (15 or higher)
- npm or yarn

#### Installation Steps

1. Install all dependencies:
```bash
npm run install:all
```

2. Set up environment variables:
```bash
cp server/.env.example server/.env
```

3. Configure database connection in `server/.env`

4. Run database migrations:
```bash
npm run db:migrate
npm run db:seed
```

5. Start development servers:

**Development Mode (with hot reload):**
```bash
# Windows
start-dev.bat

# Or using npm
npm run dev
```

**Production Mode (with PM2):**
```powershell
# Build the server
cd server
npm run build

# Start with PM2
npm run pm2:start:prod

# Monitor status
npm run pm2:status
npm run pm2:logs
```

The application will be available at:
- **Frontend (Main App)**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **Jury Portal**: http://localhost:5174

### 🚀 Production Deployment

For production environments, TurnFix uses **PM2** for process management:

**Quick Start:**
```powershell
cd server
npm run build              # Build TypeScript
npm run pm2:start:prod     # Start with PM2 (production mode)
```

**PM2 Management Commands:**
```powershell
npm run pm2:status         # Check server status
npm run pm2:logs           # View real-time logs
npm run pm2:monit          # Live CPU/Memory monitoring
npm run pm2:restart        # Restart server
npm run pm2:stop           # Stop server
npm run pm2:reload         # Zero-downtime reload
```

**PM2 Features:**
- ✅ **Auto-Restart**: Server restarts automatically after crashes
- ✅ **Memory Limits**: Auto-restart at 500MB to prevent leaks
- ✅ **Log Management**: Separate error/output logs with rotation
- ✅ **Health Monitoring**: CPU, Memory, Event Loop tracking
- ✅ **Graceful Shutdown**: Clean exit without data loss

Configuration: [`server/ecosystem.config.js`](server/ecosystem.config.js)

### Development Scripts

| Script | Description |
|--------|-------------|
| `start-dev.bat` | Start all services (Backend, Frontend, Jury Portal) with auto-cleanup |
| `stop-dev.bat` | Stop all running services |
| `status-check.bat` | Check which services are running |

### Network Access

To access the application from other devices (tablets, smartphones):
1. Run `start-dev.bat` (automatically configures network access)
2. Find your IP address: `ipconfig`
3. Access from other devices: `http://YOUR-IP:5173`
4. For Jury Portal: `http://YOUR-IP:5174`

See [FIREWALL_SETUP.md](FIREWALL_SETUP.md) for Windows Firewall configuration.

## 📦 Complete Installation vs Development Setup

| Installation Type | Use Case | What's Included |
|------------------|----------|-----------------|
| **🚀 Automated Setup** <br/> `setup/windows/INSTALL.bat` | New users, production deployment | Everything: Node.js, PostgreSQL, TurnFix, DB setup |
| **👨‍💻 Manual Setup** <br/> (Steps above) | Developers with existing tools | Only TurnFix app (requires Node.js, PostgreSQL pre-installed) |

**Need help?** Check the troubleshooting guide in [`setup/windows/SETUP-GUIDE-DE.md`](../setup/windows/SETUP-GUIDE-DE.md)

## Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── services/       # API services
│   │   ├── types/          # TypeScript type definitions
│   │   └── utils/          # Utility functions
│   └── public/
├── server/                 # Node.js backend
│   ├── src/
│   │   ├── controllers/    # Route controllers
│   │   ├── middleware/     # Express middleware
│   │   ├── models/         # Database models
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   └── utils/          # Utility functions
│   └── prisma/
└── shared/                 # Shared types and utilities
```

## Database Schema

The application uses the existing TurnFix database schema with additional authentication tables:
- Users and roles for authentication
- Participants, Clubs, Competitions management
- Results and scoring system
- Audit logging

## API Documentation

API documentation is available at `/api/docs` when running the development server.

## License

This project is licensed under the MIT License.
