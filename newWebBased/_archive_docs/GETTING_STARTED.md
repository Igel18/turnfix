# Getting Started with TurnFix

## Prerequisites
- PostgreSQL database running (v15+)
- Node.js v18+ installed
- npm or yarn package manager
- **(Production)** PM2 for process management (installed automatically)

## 🛡️ System Stability Features

TurnFix includes enterprise-grade hardening for production deployments:
- ✅ **PM2 Process Management** - Automatic crash recovery
- ✅ **Error Boundaries** - Frontend errors handled gracefully
- ✅ **Database Resilience** - Auto-reconnect with health checks
- ✅ **Graceful Shutdown** - No data loss on server stop

See [`HARDENING-PLAN.md`](HARDENING-PLAN.md) for details.

## Database Setup

1. Create a PostgreSQL database for the project:
```sql
CREATE DATABASE turnfix_db;
CREATE USER turnfix_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE turnfix_db TO turnfix_user;
```

2. Copy the environment file:
```bash
cp server/.env.example server/.env
```

3. Update your `.env` file with your database credentials:
```
DATABASE_URL="postgresql://turnfix_user:your_password@localhost:5432/turnfix_db?schema=public"
```

## Installation & Setup

1. Install dependencies:
```bash
npm run install:all
```

2. Generate Prisma client:
```bash
cd server
npx prisma generate
```

3. Run database migrations:
```bash
npx prisma migrate dev --name init
```

4. Seed the database with sample data:
```bash
npm run db:seed
```

## Development

Start the development servers:
```bash
npm run dev
```

This will start:
- Backend API server on `http://localhost:3001`
- Frontend development server on `http://localhost:5173`

## 🚀 Production Deployment

For production, use PM2 for automatic restart and monitoring:

### 1. Build the Server
```bash
cd server
npm run build
```

### 2. Start with PM2
```bash
# Production mode
npm run pm2:start:prod

# Or development mode (with NODE_ENV=development)
npm run pm2:start
```

### 3. Monitor Server
```bash
# Check status
npm run pm2:status

# View logs (real-time)
npm run pm2:logs

# Live monitoring dashboard
npm run pm2:monit

# Server details
npx pm2 describe turnfix-server
```

### 4. Manage Server
```bash
# Restart
npm run pm2:restart

# Stop
npm run pm2:stop

# Zero-downtime reload
npm run pm2:reload

# Remove from PM2
npm run pm2:delete
```

### PM2 Features

The server is configured with:
- ✅ **Auto-Restart**: Restarts automatically on crash
- ✅ **Memory Limit**: 500MB max (auto-restart if exceeded)
- ✅ **Max Restarts**: 10 attempts with exponential backoff
- ✅ **Logs**: Separate error/output logs in `server/logs/`
- ✅ **Health Checks**: Database connection monitoring every 60s
- ✅ **Graceful Shutdown**: Clean exit on SIGTERM/SIGINT

**Configuration File**: [`server/ecosystem.config.js`](server/ecosystem.config.js)

### Environment Variables

For production, set these in `server/.env`:
```env
NODE_ENV=production
PORT=3001
DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=20&pool_timeout=10"
SHUTDOWN_TIMEOUT=30000
```

## Troubleshooting

### PM2 Issues

**Port already in use:**
```powershell
# Find and kill process on port 3001
Stop-Process -Id (Get-NetTCPConnection -LocalPort 3001).OwningProcess -Force

# Then restart PM2
npm run pm2:restart
```

**Server won't start:**
```bash
# Check PM2 logs
npm run pm2:logs

# Full restart
npm run pm2:delete
npm run build
npm run pm2:start
```

**Memory issues:**
```bash
# Check current memory usage
npx pm2 describe turnfix-server

# Memory limit is 500MB - adjust in ecosystem.config.js if needed
```

### Database Connection Issues

The server includes automatic reconnection:
- Up to 5 retry attempts on connection loss
- 5-second delay between retries
- Health check every 60 seconds

**Manual check:**
```bash
# Check PostgreSQL service
Get-Service postgresql-x64-15

# Restart if needed
Restart-Service postgresql-x64-15
```

## Default Login Credentials

After seeding the database, you can log in with:
- **Email**: admin@turnfix.com  
- **Password**: admin123

## Project Structure

```
├── server/               # Backend API
│   ├── src/
│   │   ├── routes/       # API routes
│   │   ├── middleware/   # Express middleware
│   │   └── index.ts      # Main server file
│   ├── prisma/
│   │   ├── schema.prisma # Database schema
│   │   └── seed.ts       # Database seeding
│   └── .env             # Environment variables
├── client/              # Frontend React app
│   ├── src/
│   │   ├── components/  # Reusable components
│   │   ├── pages/       # Page components
│   │   ├── contexts/    # React contexts
│   │   ├── types/       # TypeScript types
│   │   └── lib/         # Utilities
│   └── package.json
└── package.json         # Root package.json
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Clubs
- `GET /api/clubs` - List all clubs
- `POST /api/clubs` - Create new club
- `GET /api/clubs/:id` - Get club by ID
- `PUT /api/clubs/:id` - Update club
- `DELETE /api/clubs/:id` - Delete club

### Additional endpoints for participants, competitions, and results are available.

## Features

✅ **Authentication System**
- JWT-based authentication with refresh tokens
- Role-based access control (Admin, Organizer, Judge, Club Admin, User)
- Secure password hashing with bcrypt

✅ **Database Integration**
- PostgreSQL with Prisma ORM
- Comprehensive schema for gymnastics management
- Database migrations and seeding

✅ **Modern Tech Stack**
- Backend: Node.js, Express, TypeScript
- Frontend: React, TypeScript, Tailwind CSS
- Real-time features: Socket.io ready

✅ **Development Ready**
- Hot reloading for both frontend and backend
- TypeScript support throughout
- Proper error handling and validation

## Next Steps

1. **Complete the UI**: Add more components and improve the user interface
2. **Implement Authentication**: Connect the frontend login/register forms to the backend
3. **Add CRUD Operations**: Implement full create, read, update, delete operations
4. **Real-time Features**: Implement live scoring with Socket.io
5. **Testing**: Add unit and integration tests
6. **Deployment**: Set up production deployment configuration
