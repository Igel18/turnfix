# TurnFix - Modern Gymnastics Management System

A modern web-based application for managing gymnastics competitions, participants, and clubs with state-of-the-art authentication and user interface.

## Features

- **Modern UI**: React with TypeScript and Tailwind CSS
- **Secure Authentication**: JWT with refresh tokens and role-based access
- **Real-time Updates**: WebSocket integration for live competition updates
- **Database**: PostgreSQL with Prisma ORM
- **RESTful API**: Express.js backend with comprehensive endpoints
- **Responsive Design**: Mobile-first approach with modern components

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

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL
- npm or yarn

### Installation

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

**Windows (Recommended):**
```bash
# Start all services (Backend, Frontend, Jury Portal)
start-dev.bat

# Check service status
status-check.bat

# Stop all services
stop-dev.bat
```

**Alternative (npm scripts):**
```bash
npm run dev
```

The application will be available at:
- **Frontend (Main App)**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **Jury Portal**: http://localhost:5174

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
