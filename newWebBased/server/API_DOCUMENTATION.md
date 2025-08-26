# TurnFix API Documentation

## Complete Prisma-based CRUD API Routes

All routes require authentication via Bearer token except where noted. All routes return JSON responses and include proper error handling with validation.

### Authentication Routes (`/api/auth`)
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user info

### User Management (`/api/users`)
- `GET /api/users` - Get all users (pagination, search, filter)
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create new user (Admin only)
- `PUT /api/users/:id` - Update user (Admin or self)
- `DELETE /api/users/:id` - Delete user (Admin only)
- `PATCH /api/users/:id/toggle-active` - Toggle user active status (Admin only)

### Club Management (`/api/clubs`)
- `GET /api/clubs` - Get all clubs (pagination, search, filter)
- `GET /api/clubs/:id` - Get club by ID
- `POST /api/clubs` - Create new club
- `PUT /api/clubs/:id` - Update club
- `DELETE /api/clubs/:id` - Delete club
- `GET /api/clubs/data/gaue` - Get all regions/districts
- `GET /api/clubs/data/personen` - Get all persons

### Participant Management (`/api/participants`)
- `GET /api/participants` - Get all participants (pagination, search, filter)
- `GET /api/participants/:id` - Get participant by ID
- `POST /api/participants` - Create new participant
- `PUT /api/participants/:id` - Update participant
- `DELETE /api/participants/:id` - Delete participant

### Competition Management (`/api/competitions`)
- `GET /api/competitions` - Get all competitions (pagination, search, filter)
- `GET /api/competitions/:id` - Get competition by ID
- `POST /api/competitions` - Create new competition
- `PUT /api/competitions/:id` - Update competition
- `DELETE /api/competitions/:id` - Delete competition
- `GET /api/competitions/filter/search` - Search competitions with filters

### Event Management (`/api/events`)
- `GET /api/events` - Get all events (pagination, search, filter)
- `GET /api/events/:id` - Get event by ID
- `POST /api/events` - Create new event
- `PUT /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event

### Discipline Management (`/api/disciplines`)
- `GET /api/disciplines` - Get all disciplines (pagination, search, filter)
- `GET /api/disciplines/:id` - Get discipline by ID
- `POST /api/disciplines` - Create new discipline
- `PUT /api/disciplines/:id` - Update discipline
- `DELETE /api/disciplines/:id` - Delete discipline

### Results Management (`/api/results`)
- `GET /api/results` - Get all results (pagination, filter by competition/participant/discipline)
- `GET /api/results/:id` - Get result by ID
- `POST /api/results` - Create new result
- `PUT /api/results/:id` - Update result
- `DELETE /api/results/:id` - Delete result
- `GET /api/results/competition/:competitionId` - Get results by competition
- `GET /api/results/participant/:participantId` - Get results by participant
- `POST /api/results/calculate-rankings` - Calculate and update rankings for competition/discipline

### Competition Entries (`/api/competition-entries`) **NEW**
- `GET /api/competition-entries` - Get all competition entries (pagination, filter)
- `GET /api/competition-entries/:id` - Get competition entry by ID
- `POST /api/competition-entries` - Create new competition entry
- `PUT /api/competition-entries/:id` - Update competition entry
- `DELETE /api/competition-entries/:id` - Delete competition entry
- `GET /api/competition-entries/competition/:competitionId` - Get entries by competition
- `GET /api/competition-entries/participant/:participantId` - Get entries by participant

### Refresh Token Management (`/api/refresh-tokens`) **NEW**
- `GET /api/refresh-tokens` - Get all refresh tokens (pagination, filter by user)
- `GET /api/refresh-tokens/:id` - Get refresh token by ID
- `POST /api/refresh-tokens` - Create new refresh token
- `PUT /api/refresh-tokens/:id` - Update refresh token
- `DELETE /api/refresh-tokens/:id` - Delete refresh token
- `DELETE /api/refresh-tokens/expired/cleanup` - Clean up expired tokens

### Audit Log Management (`/api/audit-logs`) **NEW**
- `GET /api/audit-logs` - Get all audit logs (pagination, filter by user/action/resource/date)
- `GET /api/audit-logs/:id` - Get audit log by ID
- `POST /api/audit-logs` - Create new audit log entry
- `PUT /api/audit-logs/:id` - Update audit log (not recommended)
- `DELETE /api/audit-logs/:id` - Delete audit log
- `GET /api/audit-logs/user/:userId` - Get audit logs by user
- `GET /api/audit-logs/resource/:resource` - Get audit logs by resource type
- `DELETE /api/audit-logs/cleanup/:days` - Delete logs older than specified days (min 30 days)

### Score Management (`/api/scores`)
- Various score-related endpoints (implementation details depend on existing code)

### Regional Data (`/api/regions`)
- Regional/geographical data management endpoints

### Association Management (`/api/associations`)
- Sports association management endpoints

## Key Features

### Database Integration
- **Complete Prisma ORM integration** - No direct SQL queries needed
- **Proper relations** - All models properly linked with foreign keys
- **Type safety** - Full TypeScript support with Prisma-generated types

### Validation & Security
- **Zod schema validation** on all input data
- **JWT authentication** with refresh token support
- **Role-based authorization** (Admin, Organizer, Judge, Club Admin, User)
- **Input sanitization** and error handling

### Data Features
- **Pagination** - Limit/offset support on all list endpoints
- **Search & Filtering** - Text search and field-specific filters
- **Sorting** - Proper ordering on all endpoints
- **Relations** - Include related data in responses
- **Counting** - Total counts for pagination

### API Standards
- **RESTful design** - Standard HTTP methods and status codes
- **JSON responses** - Consistent response format
- **Error handling** - Detailed error messages with validation details
- **CORS support** - Proper cross-origin request handling

## Request Examples

### Create Event
```json
POST /api/events
{
  "var_eventname": "Summer Championship 2025",
  "dat_eventstartdate": "2025-08-20T09:00:00Z",
  "dat_eventenddate": "2025-08-22T18:00:00Z",
  "var_location": "Sports Arena Munich",
  "var_description": "Annual summer gymnastics championship",
  "type": "INDIVIDUAL",
  "maxParticipants": 100,
  "isPublic": true
}
```

### Get Competitions with Filter
```
GET /api/competitions?search=championship&status=REGISTRATION_OPEN&limit=10&offset=0
```

### Create Competition Entry
```json
POST /api/competition-entries
{
  "competitionId": 1,
  "participantId": 25,
  "status": "CONFIRMED"
}
```

## Database Schema Support

All routes fully support the Prisma schema with these models:
- **User** - User accounts and authentication
- **RefreshToken** - JWT refresh token management
- **Club** - Sports clubs/organizations
- **Participant** - Individual participants/athletes
- **Competition** - Competition events
- **Discipline** - Competition disciplines/categories
- **CompetitionEntry** - Participant registrations
- **Result** - Competition results and scores
- **AuditLog** - System audit trail

## Deployment Ready

- **Environment configuration** - Supports different environments
- **Error logging** - Comprehensive error tracking
- **Health checks** - Server health monitoring
- **Production optimizations** - Security headers, rate limiting
- **Database connection management** - Proper Prisma client handling

No direct database table access is required - all operations go through the Prisma ORM with proper validation, relationships, and type safety.
