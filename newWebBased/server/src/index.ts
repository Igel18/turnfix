/*
 * TurnFix - Gymnastics Competition Management System
 * Copyright (C) 2025 Dominik Prudlo
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

import { config } from 'dotenv';
import { resolve } from 'path';
// Load environment variables from server/.env (not CWD) 
// This ensures PM2 (which sets cwd to project root) still finds the .env file
config({ path: resolve(__dirname, '../.env') });

console.log('🚀 Starting TurnFix server...');
// Debug: Log database URL availability (mask the actual value for security)
const dbUrl = process.env.DATABASE_URL;
if (dbUrl) {
  const dbName = dbUrl.match(/\/([^?]+)\?/)?.[1] || 'unknown';
  console.log(`🔧 DATABASE_URL configured (database: ${dbName})`);
} else {
  console.error('❌ DATABASE_URL is NOT SET! Database connections will fail.');
}

console.log('🔧 Importing express...');
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

import { errorHandler } from './middleware/errorHandler';
// import { notFoundHandler } from './middleware/notFoundHandler'; // DISABLED FOR FRONTEND INTEGRATION
import { 
  setupGracefulShutdown, 
  setupProcessWarnings,
  setupUnhandledRejectionHandler,
  setupUncaughtExceptionHandler 
} from './utils/shutdown';
import { 
  checkDatabaseConnection, 
  startDatabaseHealthCheck 
} from './db/connection';
import { ensurePortAvailable } from './utils/portChecker';
// import { notFoundHandler } from './middleware/notFoundHandler';

// Prisma-based routes using SQL queries
import disciplineRoutes from './routes/disciplines';
import disciplineFieldRoutes from './routes/disciplineFields';
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
import juryResultRoutes from './routes/juryResults';
import wertungenDetailsRoutes from './routes/wertungenDetails';
import configurationRoutes from './routes/configuration';
import timePlanningRoutes from './routes/timePlanning';
import firewallRoutes from './routes/firewall';
import appSettingsRoutes from './routes/appSettings';
import clientErrorRoutes from './routes/clientErrors';
import groupRoutes from './routes/groups';
import groupMemberRoutes from './routes/groupMembers';
import teamPenaltyRoutes from './routes/teamPenalties';
import systemRoutes from './routes/system';
import groupScoresRoutes from './routes/groupScores';
import teamScoresRoutes from './routes/teamScores';
import eventSearchRoutes from './routes/eventSearch';

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*', // Allow all origins for local network access
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

const PORT = process.env.PORT || 3001;
const PORT_NUMBER = typeof PORT === 'string' ? parseInt(PORT) : PORT;

// Rate limiting - very permissive for development, adjust for production
// Rate limiting is fully disabled for all IPs
// If you want to re-enable, uncomment the limiter and app.use(limiter) lines below.

// Middleware
// Configure Helmet with relaxed CSP for production frontend serving
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "http:", "ws:", "wss:"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      upgradeInsecureRequests: null, // Disable HTTP->HTTPS upgrade
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(compression());
app.use(morgan('combined'));
// Rate limiting is disabled. If you want to re-enable, uncomment the app.use(limiter) line above.

// CORS configuration - allow network access
const corsOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:3002',
  process.env.FRONTEND_URL || 'http://localhost:5173'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow localhost/127.0.0.1 on any port
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    
    // Allow any IP address on ports 3001, 3002, 5173, 5174 (network access)
    const urlPattern = /^http:\/\/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):(3001|3002|5173|5174)$/;
    if (urlPattern.test(origin)) {
      return callback(null, true);
    }
    
    // Allow specific configured origins
    if (corsOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Debug middleware - log all requests
app.use((req, res, next) => {
  console.log(`🔍 REQUEST: ${req.method} ${req.path} - Time: ${new Date().toISOString()}`);
  next();
});

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads', {
  setHeaders: (res, path, stat) => {
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.set('Access-Control-Allow-Origin', '*');
  }
}));

// Serve assets (icons, images) from client public directory for Jury Portal
import path from 'path';

// Serve static files from public directory (including icons)
const serverPublicPath = path.join(__dirname, '../public');
app.use('/public', express.static(serverPublicPath, {
  setHeaders: (res, path, stat) => {
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.set('Access-Control-Allow-Origin', '*');
  }
}));
const clientPublicPath = path.join(__dirname, '../../client/public');
app.use('/assets', express.static(clientPublicPath, {
  setHeaders: (res, path, stat) => {
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.set('Access-Control-Allow-Origin', '*');
  }
}));

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
app.use('/api/discipline-fields', disciplineFieldRoutes);
app.use('/api/associations', associationRoutes);
app.use('/api/regions', regionRoutes);
app.use('/api/clubs', clubRoutes);
app.use('/api/participants', participantRoutes);
app.use('/api/event-participants', eventParticipantRoutes);
app.use('/api/events', eventRoutes); // Re-enabled with simple version
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
app.use('/api/jury-results', juryResultRoutes);
app.use('/api/wertungen-details', wertungenDetailsRoutes);
app.use('/api/configuration', configurationRoutes);
app.use('/api/time-planning', timePlanningRoutes);
app.use('/api/firewall', firewallRoutes);
app.use('/api/app-settings', appSettingsRoutes);
app.use('/api/client-errors', clientErrorRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/groups', groupMemberRoutes);
app.use('/api/team-penalties', teamPenaltyRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/scores', groupScoresRoutes);
app.use('/api/scores', teamScoresRoutes);
app.use('/api/event-search', eventSearchRoutes);

// Serve static frontend files in production
if (process.env.NODE_ENV === 'production') {
  const path = require('path');
  // Use proper cross-platform path handling - correct path with newWebBased
  const clientDistPath = path.resolve(__dirname, '../../client/dist');
  const juryPortalDistPath = path.resolve(__dirname, '../../jury-portal/dist');
  
  console.log('🌐 Serving static frontend from:', clientDistPath);
  console.log('🔍 Directory exists:', require('fs').existsSync(clientDistPath));
  console.log('⚖️ Serving Jury Portal from:', juryPortalDistPath);
  console.log('🔍 Jury Portal exists:', require('fs').existsSync(juryPortalDistPath));
  
  // Serve Jury Portal on /jury route (BEFORE main client to avoid conflicts)
  app.use('/jury', express.static(juryPortalDistPath, {
    maxAge: '1d',
    etag: true,
    lastModified: true,
    setHeaders: (res, path) => {
      if (path.endsWith('index.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
    }
  }));
  
  // Serve Jury Portal index.html for /jury route
  app.get('/jury', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(path.join(juryPortalDistPath, 'index.html'));
  });
  
  // Serve static files from the client dist directory
  app.use(express.static(clientDistPath, {
    maxAge: '1d', // Cache static files for 1 day
    etag: true,
    lastModified: true,
    setHeaders: (res, path) => {
      // Don't cache index.html to ensure users get latest version
      if (path.endsWith('index.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
    }
  }));
  
  // All other routes should serve the index.html (for SPA routing)
  app.get('*', (req, res, next) => {
    console.log(`🔍 Catch-all handler called for: ${req.path}`);
    
    // Skip API routes, uploads, public files, and jury portal
    if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/') || req.path.startsWith('/public/') || req.path.startsWith('/jury')) {
      console.log(`⏭️ Skipping API/upload/jury route: ${req.path}`);
      return next();
    }
    
    console.log(`📄 Serving index.html for: ${req.path}`);
    
    // Set no-cache headers for index.html
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    res.sendFile(path.join(clientDistPath, 'index.html'), (err) => {
      if (err) {
        console.error('Error serving index.html:', err);
        next(err);
      } else {
        console.log(`✅ Successfully served index.html for: ${req.path}`);
      }
    });
  });
  
  console.log('✅ Production mode: Frontend is served at http://localhost:' + PORT);
} else {
  console.log('🔧 Development mode: Frontend should be served separately (e.g., Vite dev server on port 5173)');
}

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
export { io };

// Error handling - MUST BE LAST after all routes including frontend
// app.use(notFoundHandler); // TEMPORARILY DISABLED FOR TESTING
app.use(errorHandler);

console.log('🔧 About to start server on port', PORT);

// Setup graceful shutdown and error handlers
setupUncaughtExceptionHandler();
setupUnhandledRejectionHandler();
setupProcessWarnings();
setupGracefulShutdown(server, io);

// Check if port is available before starting server
async function startServer() {
  try {
    // Check port availability
    // Always auto-kill in PM2 environment to handle restarts gracefully
    const isPM2 = process.env.PM2_HOME !== undefined || process.env.pm_id !== undefined;
    const autoKill = isPM2 || process.env.NODE_ENV !== 'production';
    
    console.log(`🔍 Checking if port ${PORT_NUMBER} is available...`);
    if (autoKill) {
      console.log(`🔨 Auto-kill enabled (${isPM2 ? 'PM2 mode' : 'Development mode'})`);
    }
    
    // Force kill blocking processes
    const portAvailable = await ensurePortAvailable(PORT_NUMBER, autoKill, autoKill);
    
    if (!portAvailable) {
      console.error(`❌ Port ${PORT_NUMBER} is not available after waiting.`);
      
      if (isPM2) {
        // In PM2 mode, wait longer before giving up to avoid restart loops
        console.log(`⏳ PM2 detected: Waiting additional 30 seconds before retry...`);
        console.log(`   This helps break restart loops caused by Windows TIME_WAIT state.`);
        await new Promise(resolve => setTimeout(resolve, 30000));
        
        // One final check
        const finalCheck = await ensurePortAvailable(PORT_NUMBER, false, false);
        if (!finalCheck) {
          console.error(`❌ Port ${PORT_NUMBER} still not available after 60 seconds total wait time.`);
          console.error(`⚠️  This indicates a serious port conflict. Exiting to prevent restart loop.`);
          process.exit(1);
        } else {
          console.log(`✅ Port ${PORT_NUMBER} is finally available!`);
        }
      } else {
        console.log(`💡 You can manually kill the blocking process or run: npm run check-port ${PORT_NUMBER} --kill`);
        process.exit(1);
      }
    }
    
    // Check database connection before starting
    const isConnected = await checkDatabaseConnection();
    if (isConnected) {
      console.log('✅ Database connection verified');
      // Start periodic health check
      startDatabaseHealthCheck(60000); // Check every 60 seconds
    } else {
      console.error('❌ Database connection failed. Server may not work correctly.');
    }

    // Start server
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Local API: http://localhost:${PORT}/api`);
      console.log(`🌐 Network API: http://192.168.1.108:${PORT}/api`);
    });

    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT_NUMBER} is already in use. Another process may have started during our check.`);
        console.log(`💡 Run: npm run check-port ${PORT_NUMBER} --kill --force`);
        process.exit(1);
      } else {
        console.error('❌ Server error:', error);
      }
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

export default app;
// Force restart
