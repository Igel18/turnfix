import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer } from 'http';
import path from 'path';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3002;

console.log('🔧 Server configuration:');
console.log('  - PORT from env:', process.env.PORT);
console.log('  - Final PORT:', PORT);
console.log('  - Starting server...');

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

// Temporary basic routes for testing
app.get('/api/events', (req: Request, res: Response) => {
  res.json({ message: 'Events endpoint working', data: [] });
});

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
