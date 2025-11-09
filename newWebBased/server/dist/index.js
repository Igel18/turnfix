"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = void 0;
const dotenv_1 = require("dotenv");
// Load environment variables first
(0, dotenv_1.config)();
console.log('🚀 Starting TurnFix server...');
console.log('🔧 Importing express...');
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const morgan_1 = __importDefault(require("morgan"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const errorHandler_1 = require("./middleware/errorHandler");
// import { notFoundHandler } from './middleware/notFoundHandler'; // DISABLED FOR FRONTEND INTEGRATION
const shutdown_1 = require("./utils/shutdown");
const connection_1 = require("./db/connection");
const portChecker_1 = require("./utils/portChecker");
// import { notFoundHandler } from './middleware/notFoundHandler';
// Prisma-based routes using SQL queries
const disciplines_1 = __importDefault(require("./routes/disciplines"));
const disciplineFields_1 = __importDefault(require("./routes/disciplineFields"));
const associations_1 = __importDefault(require("./routes/associations"));
const regions_1 = __importDefault(require("./routes/regions"));
const clubs_1 = __importDefault(require("./routes/clubs"));
const events_1 = __importDefault(require("./routes/events"));
const areas_1 = __importDefault(require("./routes/areas"));
const sports_1 = __importDefault(require("./routes/sports"));
const formulas_1 = __importDefault(require("./routes/formulas"));
const disciplineGroups_1 = __importDefault(require("./routes/disciplineGroups"));
const statuses_1 = __importDefault(require("./routes/statuses"));
const countries_1 = __importDefault(require("./routes/countries"));
const teams_1 = __importDefault(require("./routes/teams"));
const venues_1 = __importDefault(require("./routes/venues"));
const persons_1 = __importDefault(require("./routes/persons"));
const participants_1 = __importDefault(require("./routes/participants"));
const eventParticipants_1 = __importDefault(require("./routes/eventParticipants"));
const results_1 = __importDefault(require("./routes/results"));
const competitions_1 = __importDefault(require("./routes/competitions"));
const squadManagement_1 = __importDefault(require("./routes/squadManagement"));
const squad_disciplines_1 = __importDefault(require("./routes/squad-disciplines"));
const competition_status_1 = __importDefault(require("./routes/competition-status"));
const scores_1 = __importDefault(require("./routes/scores"));
const admin_1 = __importDefault(require("./routes/admin"));
const layouts_1 = __importDefault(require("./routes/layouts"));
const images_1 = __importDefault(require("./routes/images"));
const meldematrix_1 = __importDefault(require("./routes/meldematrix"));
const medals_1 = __importDefault(require("./routes/medals"));
const juryResults_1 = __importDefault(require("./routes/juryResults"));
const wertungenDetails_1 = __importDefault(require("./routes/wertungenDetails"));
const configuration_1 = __importDefault(require("./routes/configuration"));
const timePlanning_1 = __importDefault(require("./routes/timePlanning"));
const firewall_1 = __importDefault(require("./routes/firewall"));
const appSettings_1 = __importDefault(require("./routes/appSettings"));
const clientErrors_1 = __importDefault(require("./routes/clientErrors"));
const groups_1 = __importDefault(require("./routes/groups"));
const groupMembers_1 = __importDefault(require("./routes/groupMembers"));
const teamPenalties_1 = __importDefault(require("./routes/teamPenalties"));
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: '*', // Allow all origins for local network access
        methods: ['GET', 'POST'],
        credentials: true
    },
    transports: ['websocket', 'polling']
});
exports.io = io;
const PORT = process.env.PORT || 3001;
const PORT_NUMBER = typeof PORT === 'string' ? parseInt(PORT) : PORT;
// Rate limiting - very permissive for development, adjust for production
// Rate limiting is fully disabled for all IPs
// If you want to re-enable, uncomment the limiter and app.use(limiter) lines below.
// Middleware
// Configure Helmet with relaxed CSP for production frontend serving
app.use((0, helmet_1.default)({
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
app.use((0, compression_1.default)());
app.use((0, morgan_1.default)('combined'));
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
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin)
            return callback(null, true);
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
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Debug middleware - log all requests
app.use((req, res, next) => {
    console.log(`🔍 REQUEST: ${req.method} ${req.path} - Time: ${new Date().toISOString()}`);
    next();
});
// Serve static files from uploads directory
app.use('/uploads', express_1.default.static('uploads', {
    setHeaders: (res, path, stat) => {
        res.set('Cross-Origin-Resource-Policy', 'cross-origin');
        res.set('Access-Control-Allow-Origin', '*');
    }
}));
// Serve assets (icons, images) from client public directory for Jury Portal
const path_1 = __importDefault(require("path"));
// Serve static files from public directory (including icons)
const serverPublicPath = path_1.default.join(__dirname, '../public');
app.use('/public', express_1.default.static(serverPublicPath, {
    setHeaders: (res, path, stat) => {
        res.set('Cross-Origin-Resource-Policy', 'cross-origin');
        res.set('Access-Control-Allow-Origin', '*');
    }
}));
const clientPublicPath = path_1.default.join(__dirname, '../../client/public');
app.use('/assets', express_1.default.static(clientPublicPath, {
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
app.use('/api/disciplines', disciplines_1.default);
app.use('/api/discipline-fields', disciplineFields_1.default);
app.use('/api/associations', associations_1.default);
app.use('/api/regions', regions_1.default);
app.use('/api/clubs', clubs_1.default);
app.use('/api/participants', participants_1.default);
app.use('/api/event-participants', eventParticipants_1.default);
app.use('/api/events', events_1.default); // Re-enabled with simple version
app.use('/api/areas', areas_1.default);
app.use('/api/sports', sports_1.default);
app.use('/api/formulas', formulas_1.default);
app.use('/api/discipline-groups', disciplineGroups_1.default);
app.use('/api/statuses', statuses_1.default);
app.use('/api/countries', countries_1.default);
app.use('/api/teams', teams_1.default);
app.use('/api/venues', venues_1.default);
app.use('/api/persons', persons_1.default);
app.use('/api/results', results_1.default);
app.use('/api/competitions', competitions_1.default);
app.use('/api/squad-management', squadManagement_1.default);
app.use('/api/squad-disciplines', squad_disciplines_1.default);
app.use('/api/competition-status', competition_status_1.default);
app.use('/api/scores', scores_1.default);
app.use('/api/admin', admin_1.default);
app.use('/api/layouts', layouts_1.default);
app.use('/api/images', images_1.default);
app.use('/api/meldematrix', meldematrix_1.default);
app.use('/api/medals', medals_1.default);
app.use('/api/jury-results', juryResults_1.default);
app.use('/api/wertungen-details', wertungenDetails_1.default);
app.use('/api/configuration', configuration_1.default);
app.use('/api/time-planning', timePlanning_1.default);
app.use('/api/firewall', firewall_1.default);
app.use('/api/app-settings', appSettings_1.default);
app.use('/api/client-errors', clientErrors_1.default);
app.use('/api/groups', groups_1.default);
app.use('/api/groups', groupMembers_1.default);
app.use('/api/team-penalties', teamPenalties_1.default);
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
    app.use('/jury', express_1.default.static(juryPortalDistPath, {
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
    app.use(express_1.default.static(clientDistPath, {
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
            }
            else {
                console.log(`✅ Successfully served index.html for: ${req.path}`);
            }
        });
    });
    console.log('✅ Production mode: Frontend is served at http://localhost:' + PORT);
}
else {
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
// Error handling - MUST BE LAST after all routes including frontend
// app.use(notFoundHandler); // TEMPORARILY DISABLED FOR TESTING
app.use(errorHandler_1.errorHandler);
console.log('🔧 About to start server on port', PORT);
// Setup graceful shutdown and error handlers
(0, shutdown_1.setupUncaughtExceptionHandler)();
(0, shutdown_1.setupUnhandledRejectionHandler)();
(0, shutdown_1.setupProcessWarnings)();
(0, shutdown_1.setupGracefulShutdown)(server, io);
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
        const portAvailable = await (0, portChecker_1.ensurePortAvailable)(PORT_NUMBER, autoKill, autoKill);
        if (!portAvailable) {
            console.error(`❌ Port ${PORT_NUMBER} is not available after waiting.`);
            if (isPM2) {
                // In PM2 mode, wait longer before giving up to avoid restart loops
                console.log(`⏳ PM2 detected: Waiting additional 30 seconds before retry...`);
                console.log(`   This helps break restart loops caused by Windows TIME_WAIT state.`);
                await new Promise(resolve => setTimeout(resolve, 30000));
                // One final check
                const finalCheck = await (0, portChecker_1.ensurePortAvailable)(PORT_NUMBER, false, false);
                if (!finalCheck) {
                    console.error(`❌ Port ${PORT_NUMBER} still not available after 60 seconds total wait time.`);
                    console.error(`⚠️  This indicates a serious port conflict. Exiting to prevent restart loop.`);
                    process.exit(1);
                }
                else {
                    console.log(`✅ Port ${PORT_NUMBER} is finally available!`);
                }
            }
            else {
                console.log(`💡 You can manually kill the blocking process or run: npm run check-port ${PORT_NUMBER} --kill`);
                process.exit(1);
            }
        }
        // Check database connection before starting
        const isConnected = await (0, connection_1.checkDatabaseConnection)();
        if (isConnected) {
            console.log('✅ Database connection verified');
            // Start periodic health check
            (0, connection_1.startDatabaseHealthCheck)(60000); // Check every 60 seconds
        }
        else {
            console.error('❌ Database connection failed. Server may not work correctly.');
        }
        // Start server
        server.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`🔗 Local API: http://localhost:${PORT}/api`);
            console.log(`🌐 Network API: http://192.168.1.108:${PORT}/api`);
        });
        server.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                console.error(`❌ Port ${PORT_NUMBER} is already in use. Another process may have started during our check.`);
                console.log(`💡 Run: npm run check-port ${PORT_NUMBER} --kill --force`);
                process.exit(1);
            }
            else {
                console.error('❌ Server error:', error);
            }
        });
    }
    catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}
// Start the server
startServer();
exports.default = app;
// Force restart
//# sourceMappingURL=index.js.map