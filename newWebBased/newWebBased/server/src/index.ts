import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer } from 'http';
import path from 'path';

// Load environment variables
dotenv.config();

// Import routes
import eventsRouter from './routes/events';
import competitionsRouter from './routes/competitions';
import regionsRouter from './routes/regions';
import associationsRouter from './routes/associations';
import disciplinesRouter from './routes/disciplines';
import clubsRouter from './routes/clubs';
import participantsRouter from './routes/participants';
import eventParticipantsRouter from './routes/eventParticipants';
import squadManagementRouter from './routes/squadManagement';
// import scoresRouter from './routes/scores';  // Temporarily disabled - building step by step
// import authRouter from './routes/auth';  // Temporarily disabled due to missing Prisma models

// Create Express app
const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL || 'https://your-domain.com'
    : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Serve static files for testing
app.use('/test', express.static(path.join(__dirname, '..')));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API routes
app.use('/api/events', eventsRouter);
app.use('/api/competitions', competitionsRouter);
app.use('/api/regions', regionsRouter);
app.use('/api/associations', associationsRouter);
app.use('/api/disciplines', disciplinesRouter);
app.use('/api/clubs', clubsRouter);
app.use('/api/participants', participantsRouter);
app.use('/api/event-participants', eventParticipantsRouter);
app.use('/api/squad-management', squadManagementRouter);
// app.use('/api/scores', scoresRouter);  // Temporarily disabled - building step by step
// app.use('/api/auth', authRouter);  // Temporarily disabled due to missing Prisma models

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const staticPath = path.join(__dirname, '../client/dist');
  app.use(express.static(staticPath));
  
  app.get('*', (req: Request, res: Response) => {
    res.sendFile(path.join(staticPath, 'index.html'));
  });
}

// 404 handler
const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({ 
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  });
};

// Global error handler
const errorHandler = (error: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Global error handler:', error);
  
  if (res.headersSent) {
    return next(error);
  }
  
  res.status(error.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : error.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
  });
};

// Apply middleware
app.use(notFoundHandler);
app.use(errorHandler);

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API: http://localhost:${PORT}/api`);
});

export default app;