# TurnFix - Gymnastics Competition Management System

[![Build and Release](https://github.com/Igel18/turnfix/actions/workflows/build-and-release.yml/badge.svg)](https://github.com/Igel18/turnfix/actions/workflows/build-and-release.yml)
[![CI](https://github.com/Igel18/turnfix/actions/workflows/ci.yml/badge.svg)](https://github.com/Igel18/turnfix/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)

TurnFix is a comprehensive gymnastics competition management system designed for organizing, managing, and conducting gymnastics competitions. Originally developed for German gymnastics competitions, it now offers both a traditional Qt desktop application and a modern web-based interface.

## 🎯 **Quick Start for New Users**

**Want to install TurnFix quickly?**

➡️ **[Download ZIP](https://github.com/Igel18/turnfix/archive/refs/heads/WebInterface.zip)** → Extract → Run `setup\windows\INSTALL.bat` as Administrator → Done! ✨

*Everything (Node.js, PostgreSQL, database) is installed automatically. See [detailed setup instructions](#-quick-start) below.*

---

## ⚡ **Einfachste Bedienung für Anwender**

**Nach der Installation:**

1️⃣ **Doppelklick** auf `TurnFix-Manager.bat`  
2️⃣ **Drücke [1]** zum Starten  
3️⃣ **Drücke [7]** um Browser zu öffnen  

✨ **Fertig!** TurnFix läuft! 

📖 **[Vollständige Anleitung → SCHNELLSTART.md](SCHNELLSTART.md)**

---

---

## 🚀 **Two Versions Available**

### 🌐 **NEW: Modern Web Application** (Recommended)
- **Modern UI**: React with TypeScript and Tailwind CSS
- **Cross-Platform**: Works on any device with a web browser
- **Real-time Updates**: Live competition data synchronization
- **Cloud-Ready**: Easy deployment and scaling
- **Mobile-Friendly**: Responsive design for tablets and phones
- **Multi-Language**: German and English support
- **Role-Based Access**: Secure user management

### 🖥️ **Legacy: Qt Desktop Application**
- **Native Performance**: Optimized for Windows desktop
- **Offline Capability**: No internet connection required
- **Complete Feature Set**: All traditional TurnFix functionality
- **Database Integration**: Direct PostgreSQL connectivity

## 📋 **Features Overview**

### **Core Competition Management**
- ✅ **Event Management**: Create and configure gymnastics events with multiple competitions
- ✅ **Competition Categories**: Support for all gymnastics disciplines (Men's & Women's artistic gymnastics)
- ✅ **Age Groups**: Flexible age group configuration (1-6, 7-8, 9-10, 11-12, 13-14, 15-16, 17-18 years)
- ✅ **Disciplines**: Floor, Vault, Uneven Bars, Balance Beam, Pommel Horse, Rings, Parallel Bars, High Bar
- ✅ **Competition Formats**: Individual All-Around, Team competitions, Apparatus finals
- ✅ **Timeline Management**: Automatic schedule generation and manual adjustments
- ✅ **Starting Order**: Automated starting number assignment with customizable rules

### **Participant & Club Management**
- ✅ **Athlete Registration**: Complete athlete profiles with personal data, club affiliation, age groups
- ✅ **Club Administration**: Manage gymnastics clubs, associations, and regional organizations
- ✅ **Squad Management**: Assign athletes to squads (Riegen) with visual squad overview
- ✅ **Filter & Search**: Advanced filtering by gender, age, club, region, competition
- ✅ **Barcode Generation**: Print participant labels with barcodes for quick identification
- ✅ **GymNet XML Import/Export**: Import competition data from external systems
- ✅ **Bulk Operations**: Mass updates, assignments, and data management

### **Competition Execution & Scoring**
- ✅ **Jury Portal**: Dedicated interface for judges to enter scores (Standalone on Port 5174)
- ✅ **Score Entry**: Real-time score capture with validation and error checking
- ✅ **Device Icons**: Visual discipline indicators with custom icons from database
- ✅ **Squad-based Scoring**: Score entry organized by squads and rotation schedules
- ✅ **Live Results**: Real-time result calculations and leaderboard updates
- ✅ **Score Validation**: Automatic checks for score ranges and completeness
- ✅ **Multi-attempt Support**: Track multiple attempts per athlete per discipline

### **Results & Reporting**
- ✅ **Results Display**: Comprehensive result views by competition, discipline, squad
- ✅ **Medal Standings**: Club-based medal count (Gold, Silver, Bronze)
- ✅ **PDF Export**: Generate certificates, result sheets, participation labels
- ✅ **Print Templates**: Customizable PDF templates for certificates and reports
- ✅ **Participant Labels**: Print labels with barcode, sorted by gender, squad, club
- ✅ **Rankings**: Individual and team rankings with tie-breaking rules
- ✅ **Statistics**: Competition statistics, participation rates, performance analysis

### **System Administration**
- ✅ **Master Data Management**: Regions, Associations, Clubs, Venues, Disciplines
- ✅ **Configuration**: System settings, competition formulas, scoring rules
- ✅ **Database Management**: PostgreSQL database with Prisma ORM
- ✅ **User Management**: Role-based access control (Admin, Organizer, Judge)
- ✅ **Audit Logging**: Track all changes and user actions
- ✅ **Backup & Restore**: Database backup and migration tools

### **Modern Web Features (New)**
- ✅ **Responsive UI**: Works on desktop, tablet, and mobile devices
- ✅ **Localization**: Full German and English translations (i18next)
- ✅ **Network Access**: Configure for LAN access from multiple devices
- ✅ **Jury Portal**: Standalone scoring interface accessible via separate port
- ✅ **Real-time Updates**: Live data synchronization across clients
- ✅ **Dark/Light Theme**: User preference support
- ✅ **Unified Components**: Consistent UI patterns across all pages

## 🔧 **Quick Start**

### **Web Application (Recommended)**

#### **🚀 Automated One-Click Installation (Windows)**

**Easiest way for new users:**

1. **Download**: [**📥 Download TurnFix ZIP**](https://github.com/Igel18/turnfix/archive/refs/heads/WebInterface.zip)
2. **Extract** the ZIP file
3. **Navigate** to `turnfix-WebInterface\setup\windows\`
4. **Right-click** on `INSTALL.bat` → **"Run as administrator"**
5. **Wait** for automatic installation (Node.js, PostgreSQL, database, app)
6. **Done!** Access at http://localhost:5173

**Everything is installed automatically:** Node.js, PostgreSQL, all dependencies, database setup, and TurnFix! ✨

**For detailed setup instructions:**
- 🇩🇪 **German**: See [`setup/windows/SETUP-GUIDE-DE.md`](setup/windows/SETUP-GUIDE-DE.md) *(Comprehensive guide)*
- 🇬🇧 **English**: See [`setup/README.md`](setup/README.md)
- 📚 **Getting Started**: See [`newWebBased/GETTING_STARTED.md`](newWebBased/GETTING_STARTED.md)
- 🚀 **Production**: See [`newWebBased/DEPLOYMENT.md`](newWebBased/DEPLOYMENT.md) *(PM2, monitoring, troubleshooting)*

---

#### **👨‍💻 Manual Installation (For Developers)**

**If you already have Node.js and PostgreSQL installed:**

#### **Prerequisites**
- Node.js 18.x or higher
- PostgreSQL 12.x or higher
- 2GB RAM minimum

#### **Installation Steps**
```bash
# Clone the repository
git clone https://github.com/Igel18/turnfix.git
cd turnfix/newWebBased

# Install dependencies
npm run install:all

# Configure database
cp server/.env.example server/.env
# Edit server/.env with your database credentials

# Setup database
cd server
npx prisma generate
npx prisma migrate deploy
npm run db:seed

# Start development servers
cd ..
npm run dev
```

**Access URLs:**
- Main Application: http://localhost:5173
- API Documentation: http://localhost:3001/api/docs
- Jury Portal: http://localhost:5174

#### **Production Deployment**
```bash
# Build the application
cd newWebBased/server
npm run build

# Start with PM2 (production mode with auto-restart)
npm run pm2:start:prod

# Monitor server status
npm run pm2:status    # Check if server is online
npm run pm2:logs      # View real-time logs
npm run pm2:monit     # Live CPU/Memory monitoring

# Server management
npm run pm2:restart   # Restart server
npm run pm2:stop      # Stop server
npm run pm2:reload    # Zero-downtime reload
```

**PM2 Production Features:**
- ✅ **Automatic Restart**: Server restarts automatically on crash
- ✅ **Memory Monitoring**: Auto-restart at 500MB memory limit
- ✅ **Health Checks**: Database connection monitored every 60 seconds
- ✅ **Graceful Shutdown**: Active requests complete before shutdown
- ✅ **Error Boundaries**: Frontend errors caught without white screen
- ✅ **Database Resilience**: Auto-reconnect with 5 retry attempts
- ✅ **Log Management**: Separate error/output logs in `server/logs/`

**Result:** ~98% uptime with 10-30 second automatic recovery

For detailed production deployment, see:
- 📚 [`newWebBased/DEPLOYMENT.md`](newWebBased/DEPLOYMENT.md) - Complete production guide
- 🛡️ [`newWebBased/HARDENING-PLAN.md`](newWebBased/HARDENING-PLAN.md) - System hardening strategy
- ✅ [`newWebBased/PHASE-1-COMPLETE.md`](newWebBased/PHASE-1-COMPLETE.md) - Implementation status

### **Legacy Qt Application**

#### **Prerequisites**
- Qt 5.13+ with MinGW (Windows)
- PostgreSQL 11+
- [QtPropertyBrowser](https://github.com/abhijitkundu/QtPropertyBrowser.git) in libs folder

#### **Build Instructions**
```bash
# Clone QtPropertyBrowser dependency
cd libs
git clone https://github.com/abhijitkundu/QtPropertyBrowser.git

# Build with Qt Creator or command line
qmake TurnFix.pro
make
```

## 🗄️ **Database Compatibility**

Both applications share the same PostgreSQL database schema, ensuring:
- ✅ **Full Compatibility**: Switch between Web and Desktop versions
- ✅ **Data Migration**: Seamless upgrade path from legacy to web
- ✅ **Backup Compatibility**: Shared database backup/restore procedures
- ✅ **Legacy Support**: Existing installations continue to work

### **Database Migration**
```sql
-- Your existing TurnFix database works with both versions
-- No migration required for basic functionality
-- Web UI provides additional features with backward compatibility
```

## 🏗️ **System Architecture**

### **Overall System Architecture**

TurnFix consists of two parallel implementations sharing the same PostgreSQL database:

```
┌─────────────────────────────────────────────────────────────────────┐
│                         TurnFix System                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────────────┐      ┌──────────────────────────┐    │
│  │   Modern Web Stack       │      │   Legacy Qt Desktop App  │    │
│  │   (Recommended)          │      │   (Windows Native)       │    │
│  └──────────────────────────┘      └──────────────────────────┘    │
│              │                                    │                  │
│              └────────────────┬───────────────────┘                  │
│                               │                                      │
│                    ┌──────────▼──────────┐                          │
│                    │   PostgreSQL DB     │                          │
│                    │   (Port 5432)       │                          │
│                    │  - Shared Schema    │                          │
│                    │  - Full Compat.     │                          │
│                    └─────────────────────┘                          │
└─────────────────────────────────────────────────────────────────────┘
```

### **Modern Web Application Stack**

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Client Side (Browser)                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌────────────────────────┐         ┌──────────────────────┐        │
│  │  Main Application      │         │   Jury Portal        │        │
│  │  (React + TypeScript)  │         │   (React Standalone) │        │
│  │  - Management Center   │         │   - Score Entry      │        │
│  │  - Participants        │         │   - Squad Selection  │        │
│  │  - Competitions        │         │   - Device Icons     │        │
│  │  - Results             │         │   - Touch Optimized  │        │
│  │  - Configuration       │         └──────────────────────┘        │
│  │  - Error Boundaries    │                Port: 5174               │
│  │  Port: 5173            │                                         │
│  └────────────────────────┘                                         │
│              │                                   │                   │
└──────────────┼───────────────────────────────────┼───────────────────┘
               │                                   │
               │         HTTP/REST API             │
               └───────────────┬───────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────────┐
│                     Server Side (Node.js)                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              Express.js Backend API                           │  │
│  │              (TypeScript + Prisma ORM)                        │  │
│  │                                                                │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │  │
│  │  │   Routes     │  │ Controllers  │  │  Services    │       │  │
│  │  │  /api/*      │─►│  Business    │─►│  Logic       │       │  │
│  │  └──────────────┘  │  Logic       │  └──────────────┘       │  │
│  │                    └──────────────┘                           │  │
│  │                           │                                   │  │
│  │                    ┌──────▼──────┐                            │  │
│  │                    │   Prisma    │                            │  │
│  │                    │   ORM       │                            │  │
│  │                    └──────────────┘                           │  │
│  │                                                                │  │
│  │  🛡️ Production Hardening (NEW):                              │  │
│  │  - PM2 Process Management (Auto-restart)                     │  │
│  │  - Memory Monitoring (500MB limit)                           │  │
│  │  - Graceful Shutdown (SIGTERM/SIGINT)                        │  │
│  │  - Database Auto-Reconnect (5 retries)                       │  │
│  │  - Health Checks (60s interval)                              │  │
│  │  - Error Boundaries (Frontend)                               │  │
│  │                                                                │  │
│  │  Core Features:                                               │  │
│  │  - JWT Authentication                                         │  │
│  │  - Role-based Access Control                                 │  │
│  │  - RESTful API Endpoints                                     │  │
│  │  - Request Validation                                         │  │
│  │  - Error Handling                                             │  │
│  │  - CORS Configuration                                         │  │
│  │                                                                │  │
│  │  Port: 3001                                                   │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                               │                                      │
└───────────────────────────────┼──────────────────────────────────────┘
                                │
                                │ SQL Queries (Connection Pool: 20)
                                │
┌───────────────────────────────▼──────────────────────────────────────┐
│                    Database Layer                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │              PostgreSQL Database                          │      │
│  │                                                            │      │
│  │  Tables:                                                  │      │
│  │  - tfx_veranstaltungen (Events)                          │      │
│  │  - tfx_wettkampf (Competitions)                           │      │
│  │  - tfx_teilnehmer (Participants)                          │      │
│  │  - tfx_vereine (Clubs)                                    │      │
│  │  - tfx_geraete (Disciplines)                              │      │
│  │  - tfx_wertung (Scores)                                   │      │
│  │  - tfx_ergebnis (Results)                                 │      │
│  │  + 40+ more tables                                        │      │
│  │                                                            │      │
│  │  🛡️ Resilience:                                          │      │
│  │  - Connection Pool: 20 connections                        │      │
│  │  - Health Checks: Every 60s                               │      │
│  │  - Auto-Reconnect: Up to 5 retries                        │      │
│  │                                                            │      │
│  │  Port: 5432                                               │      │
│  └──────────────────────────────────────────────────────────┘      │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

### **Legacy Qt Desktop Application**

```
┌─────────────────────────────────────────────────────────────────────┐
│                Qt/C++ Desktop Application (Windows)                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │                    Qt Widgets UI                          │      │
│  │                                                            │      │
│  │  - Main Window with Navigation                            │      │
│  │  - Competition Management Dialogs                         │      │
│  │  - Participant Management Views                           │      │
│  │  - Squad Management Interface                             │      │
│  │  - Score Input Forms                                      │      │
│  │  - Result Display Windows                                 │      │
│  │  - Print Preview & Export                                 │      │
│  │  - Database Administration Tools                          │      │
│  │                                                            │      │
│  └──────────────────────────────────────────────────────────┘      │
│                               │                                      │
│                               │ Qt SQL Module                        │
│                               │                                      │
│  ┌────────────────────────────▼─────────────────────────────┐      │
│  │            Direct PostgreSQL Connection                   │      │
│  │            (QSqlDatabase, QSqlQuery)                      │      │
│  └──────────────────────────────────────────────────────────┘      │
│                               │                                      │
└───────────────────────────────┼──────────────────────────────────────┘
                                │
                                │ Native libpq
                                │
                    ┌───────────▼──────────┐
                    │   PostgreSQL DB      │
                    │   (Same as Web)      │
                    └──────────────────────┘
```

### **Technology Stack**

#### **Web Application**
| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend - Main App** | React 18, TypeScript, Tailwind CSS, Vite | Management interface |
| **Frontend - Jury Portal** | React 18, TypeScript, Lucide Icons, Vite | Standalone scoring interface |
| **Backend API** | Node.js 18+, Express.js, TypeScript | RESTful API server |
| **ORM** | Prisma | Database abstraction |
| **Database** | PostgreSQL 15+ | Data persistence |
| **Authentication** | JWT, bcrypt | Secure auth with refresh tokens |
| **UI Components** | Custom components, Tailwind | Responsive UI |
| **Internationalization** | i18next | German/English support |
| **Build** | Vite, TypeScript Compiler | Fast dev & production builds |
| **Deployment** | GitHub Actions | CI/CD pipeline |
| **🛡️ Production Hardening** | **PM2, Error Boundaries** | **Enterprise stability** |
| **Process Manager** | PM2 6.0+ | Auto-restart, monitoring, logs |
| **Error Handling** | React Error Boundaries | Frontend crash recovery |
| **Database Resilience** | Connection Pool (20), Auto-reconnect | High availability |
| **Shutdown** | Graceful shutdown handlers | No data loss on restart |

#### **Legacy Qt Application**
| Component | Technology | Purpose |
|-----------|------------|---------|
| **Framework** | Qt 5.13+ | Cross-platform UI framework |
| **Language** | C++ | Native performance |
| **Compiler** | MinGW (Windows) | Build toolchain |
| **Database** | Qt SQL Module + libpq | PostgreSQL connectivity |
| **UI** | Qt Widgets | Desktop interface |
| **Reports** | Qt Print Support | PDF generation |

### **Network & Deployment**

```
┌──────────────────────────────────────────────────────────────┐
│                    Network Architecture                       │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Local Network (192.168.x.x)                                │
│                                                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  Organizer  │  │   Judges    │  │   Judges    │         │
│  │  Laptop     │  │   Tablet 1  │  │   Tablet 2  │         │
│  │             │  │             │  │             │         │
│  │  Main App   │  │ Jury Portal │  │ Jury Portal │         │
│  │  :5173      │  │  :5174      │  │  :5174      │         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
│         │                 │                 │                │
│         └─────────────────┼─────────────────┘                │
│                           │                                  │
│                  ┌────────▼────────┐                         │
│                  │  Server PC      │                         │
│                  │  - Backend      │                         │
│                  │  - PostgreSQL   │                         │
│                  └─────────────────┘                         │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

## 📱 **User Interfaces**

### **Modern Web UI**
- **Dashboard**: Centralized competition overview
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Dark/Light Mode**: User preference support
- **Internationalization**: German and English languages
- **Real-time Updates**: Live score and result updates

### **Desktop Application**
- **Native Windows UI**: Optimized for desktop workflows
- **Offline Operation**: No internet dependency
- **Direct Database Access**: High-performance data operations
- **Traditional Workflows**: Familiar interface for existing users

## 🚦 **Getting Support**

### **Documentation**
- 📖 [Complete Documentation](https://github.com/Igel18/turnfix/blob/v2/documentation/SUMMARY.md)
- 🚀 [Web UI Getting Started](newWebBased/GETTING_STARTED.md)
- 🔧 [API Documentation](newWebBased/server/README.md)
- 🛠️ [GitHub Workflows](/.github/workflows/README.md)

### **Community & Support**
- 🐛 [Report Issues](https://github.com/Igel18/turnfix/issues)
- 💡 [Feature Requests](https://github.com/Igel18/turnfix/discussions)
- 📧 Contact: [Support Email](mailto:support@turnfix.com)

## 🔄 **Migration Path**

### **From Legacy to Web UI**
1. **Keep Existing Setup**: Your current TurnFix installation continues to work
2. **Install Web UI**: Deploy alongside existing system
3. **Test in Parallel**: Validate functionality with real data
4. **Gradual Migration**: Move workflows incrementally
5. **Full Transition**: Complete move to web-based system

### **Compatibility Matrix**
| Feature | Legacy Qt | Modern Web UI | Notes |
|---------|-----------|---------------|-------|
| **Core Features** |
| Event Management | ✅ Full | ✅ Full | Complete feature parity |
| Competition Configuration | ✅ Full | ✅ Full | All disciplines supported |
| Participant Registration | ✅ Full | ✅ Enhanced | Web has improved UX |
| Club Management | ✅ Full | ✅ Full | Identical functionality |
| Squad Assignment | ✅ Full | ✅ Enhanced | Visual squad management |
| Score Entry | ✅ Desktop | ✅ Jury Portal | Dedicated judge interface |
| Result Calculation | ✅ Full | ✅ Real-time | Live updates in web |
| **Data Management** |
| GymNet XML Import | ✅ Full | ✅ Full | Competition data import |
| PDF Export | ✅ Full | ✅ Enhanced | More templates |
| Barcode Generation | ✅ Basic | ✅ Advanced | Better label printing |
| Database Access | ✅ Direct SQL | ✅ Prisma ORM | Both use PostgreSQL |
| Backup/Restore | ✅ Manual | ✅ Automated | Web has better tools |
| **User Experience** |
| Offline Operation | ✅ Yes | ❌ No | Qt works offline |
| Multi-Device Access | ❌ No | ✅ Yes | Web is responsive |
| Network Sharing | ❌ Limited | ✅ Full | LAN/WAN support |
| Judge Portal | ❌ No | ✅ Yes | Standalone scoring |
| Real-time Updates | ❌ No | ✅ Yes | Live synchronization |
| Mobile Support | ❌ No | ✅ Yes | Tablets & phones |
| Localization | 🇩🇪 German | 🇩🇪🇬🇧 DE/EN | i18next framework |
| **Technical** |
| Platform | Windows only | Cross-platform | Any browser |
| Installation | Complex | Automated | One-click setup |
| Updates | Manual rebuild | Git pull | Easy updates |
| User Management | Basic | ✅ Role-based | JWT authentication |
| API Access | ❌ No | ✅ REST API | Integration ready |

## 📊 **Screenshots**

### **Modern Web Application**

<details>
<summary>🖱️ Click to view Web UI screenshots</summary>

![Screenshot 1](documentation/pictures/2025-10-14%2014_07_42-TurnFix%20–%20Mozilla%20Firefox.png)

![Screenshot 2](documentation/pictures/2025-10-14%2014_08_15-.png)

![Screenshot 3](documentation/pictures/2025-10-14%2014_08_29-TurnFix%20–%20Mozilla%20Firefox.png)

![Screenshot 4](documentation/pictures/2025-10-14%2014_08_44-.png)

![Screenshot 5](documentation/pictures/2025-10-14%2014_09_22-.png)

![Screenshot 6](documentation/pictures/2025-10-14%2014_09_39-.png)

![Screenshot 7](documentation/pictures/2025-10-14%2014_09_53-TurnFix%20–%20Mozilla%20Firefox.png)

![Screenshot 8](documentation/pictures/2025-10-14%2014_10_11-.png)

![Screenshot 9](documentation/pictures/2025-10-14%2014_12_47-.png)

![Screenshot 10](documentation/pictures/2025-10-14%2014_13_51-.png)

![Screenshot 11](documentation/pictures/2025-10-14%2014_14_06-.png)

![Screenshot 12](documentation/pictures/2025-10-14%2014_15_12-.png)

![Screenshot 13](documentation/pictures/2025-10-14%2014_15_29-.png)

![Screenshot 14](documentation/pictures/2025-10-14%2014_15_50-2025-10-14%2014_15_29-.png)

![Screenshot 15](documentation/pictures/2025-10-14%2014_16_26-TurnFix%20–%20Mozilla%20Firefox.png)

*Modern web interface showcasing various features: dashboard, participant management, competition setup, results, and configuration.*

</details>

### **Legacy Desktop Application**
### **Legacy Desktop Application**

#### Login
![grafik](https://user-images.githubusercontent.com/10853055/195056135-b37b39f1-0ec8-4c2f-b764-b86d518840be.png)

#### Competitions 
![grafik](https://user-images.githubusercontent.com/10853055/195056483-be2e660d-8cee-4215-8b08-3cafdb244338.png)

#### Participants 
![grafik](https://user-images.githubusercontent.com/10853055/195056751-1c90ed4d-54d0-46c9-9170-6dbbd34f8505.png)

#### Squads 
![grafik](https://user-images.githubusercontent.com/10853055/195056873-bf7f6fe0-a7a5-4d1e-b0b5-f3b4ed169d7e.png)

#### Score Input
![grafik](https://user-images.githubusercontent.com/10853055/195057090-ab40614e-71b9-4563-aae8-5f570e0f4e7b.png)

#### Result 
![grafik](https://user-images.githubusercontent.com/10853055/195057281-1fd59940-015e-4a4a-b92a-4dc8d95426d8.png)

#### Print & Export 
![grafik](https://user-images.githubusercontent.com/10853055/195057438-377051c8-9ae1-4246-bdc6-0ae86b5e5f98.png)

#### Squad States 
![grafik](https://user-images.githubusercontent.com/10853055/195057667-0da15239-9bbb-4e62-9f75-61b42a5b84e0.png)

#### Database Administration 
![grafik](https://user-images.githubusercontent.com/10853055/195057951-fa90ceb8-3125-437a-b4d1-2bb2b99bf4b4.png)

## 🏆 **Production Use**

TurnFix has been successfully used in:
- **Regional Championships**: Multiple German gymnastics competitions
- **Club Competitions**: Local and national level events  
- **Training Camps**: Score tracking and athlete development
- **Multi-day Events**: Complex competition scheduling and management

## 🔮 **Roadmap**

### **Web UI Enhancements**
- 📱 Progressive Web App (PWA) support
- 🌍 Additional language support
- 📊 Advanced analytics and reporting
- 🔄 Real-time collaboration features
- 📱 Native mobile applications

### **Integration Features**
- 🔗 Federation result submission APIs
- 📡 Live streaming integration
- 📊 Broadcast-ready graphics generation
- 🏅 Digital certification system

## 🤝 **Contributing**

We welcome contributions to both the legacy Qt application and the new Web UI!

### **Development Setup**
```bash
# Fork the repository
git fork https://github.com/Igel18/turnfix.git

# Clone your fork
git clone https://github.com/yourusername/turnfix.git

# Set up development environment
cd turnfix/newWebBased
npm run install:all

# Create feature branch
git checkout -b feature/your-feature-name

# Make changes and test
npm run test

# Submit pull request
```

### **Contribution Guidelines**
- 📝 Follow existing code style and conventions
- ✅ Add tests for new functionality
- 📖 Update documentation as needed
- 🔍 Ensure all CI checks pass
- 📋 Fill out pull request template completely

## 📄 **License**

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## 🙏 **Acknowledgments**

- **Qt Framework**: For the robust desktop application foundation
- **React Community**: For the modern web development ecosystem
- **German Gymnastics Federation**: For requirements and testing support
- **Contributors**: Everyone who has helped improve TurnFix

## 📞 **Contact & Support**

- 🌐 **Website**: [TurnFix Official](https://turnfix.com)
- 📧 **Email**: support@turnfix.com
- 💬 **Discord**: [TurnFix Community](https://discord.gg/turnfix)
- 🐦 **Twitter**: [@TurnFixApp](https://twitter.com/turnfixapp)

---

**Made with ❤️ for the gymnastics community**

*Bringing modern technology to gymnastics competition management while preserving the reliability and feature completeness that coaches and administrators depend on.*
