# Getting Started with TurnFix

## Prerequisites
- PostgreSQL database running
- Node.js v18+ installed
- npm or yarn package manager

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
