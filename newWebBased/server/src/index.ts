import { config } from 'dotenv';
// Load environment variables first
config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';

// Prisma-based routes using SQL queries
import disciplineRoutes from './routes/disciplines';
import associationRoutes from './routes/associations';
import regionRoutes from './routes/regions';
import clubRoutes from './routes/clubs';
import eventRoutes from './routes/events';
import areaRoutes from './routes/areas';
import sportRoutes from './routes/sports';
import formulaRoutes from './routes/formulas';
import disciplineGroupRoutes from './routes/disciplineGroups';
import statusRoutes from './routes/statuses';
import countryRoutes from './routes/countries';
import teamRoutes from './routes/teams';
import venueRoutes from './routes/venues';
import personsRoutes from './routes/persons';
import participantRoutes from './routes/participants';
import eventParticipantRoutes from './routes/eventParticipants';
import resultRoutes from './routes/results';
import competitionRoutes from './routes/competitions';
import squadManagementRoutes from './routes/squadManagement';
import squadDisciplineRoutes from './routes/squad-disciplines';
import competitionStatusRoutes from './routes/competition-status';
import scoresRoutes from './routes/scores';
import adminRoutes from './routes/admin';
import layoutRoutes from './routes/layouts';
import imageRoutes from './routes/images';
import meldematrixRoutes from './routes/meldematrix';
import medalRoutes from './routes/medals';

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3001;

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'), // 1 minute
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '10000'), // limit each IP to 10000 requests per minute (very high for development)
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Skip rate limiting for development environment
  skip: (req) => process.env.NODE_ENV === 'development' && req.ip === '::1' || req.ip === '127.0.0.1'
});

// Middleware
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));
app.use(limiter);
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:5176',
    'http://localhost:5177',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'http://127.0.0.1:5175',
    'http://127.0.0.1:5176',
    'http://127.0.0.1:5177',
    process.env.FRONTEND_URL || 'http://localhost:5173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Test endpoint (same as simple server)
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is working!' });
});

// API Routes - Only Prisma-based routes using direct SQL queries
app.use('/api/disciplines', disciplineRoutes);
app.use('/api/associations', associationRoutes);
app.use('/api/regions', regionRoutes);
app.use('/api/clubs', clubRoutes);
app.use('/api/participants', participantRoutes);
app.use('/api/event-participants', eventParticipantRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/areas', areaRoutes);
app.use('/api/sports', sportRoutes);
app.use('/api/formulas', formulaRoutes);
app.use('/api/discipline-groups', disciplineGroupRoutes);
app.use('/api/statuses', statusRoutes);
app.use('/api/countries', countryRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/venues', venueRoutes);
app.use('/api/persons', personsRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/competitions', competitionRoutes);
app.use('/api/squad-management', squadManagementRoutes);
app.use('/api/squad-disciplines', squadDisciplineRoutes);
app.use('/api/competition-status', competitionStatusRoutes);
app.use('/api/scores', scoresRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/layouts', layoutRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/meldematrix', meldematrixRoutes);
app.use('/api/medals', medalRoutes);

// Socket.IO for real-time features
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join-competition', (competitionId) => {
    socket.join(`competition-${competitionId}`);
    console.log(`Client ${socket.id} joined competition ${competitionId}`);
  });

  socket.on('leave-competition', (competitionId) => {
    socket.leave(`competition-${competitionId}`);
    console.log(`Client ${socket.id} left competition ${competitionId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Store io instance for use in other modules
app.set('io', io);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API: http://localhost:${PORT}/api`);
});

export default app;
