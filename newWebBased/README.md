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
```bash
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

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
