# TurnFix - Gymnastics Competition Management System

[![Build and Release](https://github.com/Igel18/turnfix/actions/workflows/build-and-release.yml/badge.svg)](https://github.com/Igel18/turnfix/actions/workflows/build-and-release.yml)
[![CI](https://github.com/Igel18/turnfix/actions/workflows/ci.yml/badge.svg)](https://github.com/Igel18/turnfix/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)

TurnFix is a comprehensive gymnastics competition management system designed for organizing, managing, and conducting gymnastics competitions. Originally developed for German gymnastics competitions, it now offers both a traditional Qt desktop application and a modern web-based interface.

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

### **Competition Management**
- ✅ Event creation and configuration
- ✅ Multiple competition categories
- ✅ Age group and division management
- ✅ Discipline configuration (Floor, Vault, Bars, Beam, etc.)
- ✅ Timeline and scheduling system
- ✅ Judge assignment and management

### **Participant Management**
- ✅ Athlete registration and profiles
- ✅ Club and association management
- ✅ Team formations and squad assignments
- ✅ Import/Export functionality (GymNet XML)
- ✅ Barcode generation for identification

### **Competition Execution**
- ✅ Score capture and validation
- ✅ Real-time result calculations
- ✅ Live leaderboards and standings
- ✅ Judge portal for score entry
- ✅ Competition status tracking

### **Results & Reporting**
- ✅ Comprehensive result generation
- ✅ PDF export for certificates and reports
- ✅ Medal standings and rankings
- ✅ Statistical analysis and reporting
- ✅ Print-ready competition documents

## 🔧 **Quick Start**

### **Web Application (Recommended)**

#### **Prerequisites**
- Node.js 18.x or higher
- PostgreSQL 12.x or higher
- 2GB RAM minimum

#### **Installation**
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
# Build for production
npm run build

# Start production server
npm run start
```

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

### **Web Application Stack**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Client  │    │  Jury Portal    │    │  Express API    │
│   (Port 5173)   │◄──►│  (Port 5174)    │◄──►│  (Port 3001)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                                               ┌─────────────────┐
                                               │  PostgreSQL DB  │
                                               │  (Port 5432)    │
                                               └─────────────────┘
```

### **Technology Stack**
- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite
- **Backend**: Node.js, Express, Prisma ORM
- **Database**: PostgreSQL
- **Authentication**: JWT with refresh tokens
- **Real-time**: Socket.io for live updates
- **Build**: GitHub Actions CI/CD

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
| Feature | Legacy Qt | Web UI | Notes |
|---------|-----------|---------|-------|
| Competition Management | ✅ | ✅ | Full compatibility |
| Participant Registration | ✅ | ✅ | Enhanced web workflows |
| Score Capture | ✅ | ✅ | Additional real-time features |
| Result Generation | ✅ | ✅ | PDF export in both |
| GymNet XML Import/Export | ❌ | ✅ | Shared database format |
| Judge Portal | ❌ | ✅ | New web-only feature |
| Mobile Access | ❌ | ✅ | Web-only capability |
| Real-time Updates | ❌ | ✅ | Live synchronization |
| Multi-user Access | Limited | Limited | Role-based permissions |

## 📊 **Screenshots**

### **Web Application**
<details>
<summary>Click to view Web UI screenshots</summary>

#### Dashboard
![Web Dashboard](newWebBased/docs/screenshots/dashboard.png)

#### Competition Management
![Web Competitions](newWebBased/docs/screenshots/competitions.png)

#### Participant Management
![Web Participants](newWebBased/docs/screenshots/participants.png)

#### Judge Portal
![Jury Portal](newWebBased/docs/screenshots/jury-portal.png)

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
