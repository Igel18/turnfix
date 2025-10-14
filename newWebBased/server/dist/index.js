"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
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
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const errorHandler_1 = require("./middleware/errorHandler");
const notFoundHandler_1 = require("./middleware/notFoundHandler");
const shutdown_1 = require("./utils/shutdown");
const connection_1 = require("./db/connection");
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
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        methods: ['GET', 'POST']
    }
});
const PORT = process.env.PORT || 3001;
// Rate limiting - very permissive for development, adjust for production
const limiter = (0, express_rate_limit_1.default)({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'), // 1 minute
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '10000'), // 10000 requests per minute (very permissive)
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    // Skip rate limiting for localhost (including proxy from jury-server)
    skip: (req) => {
        const isLocalhost = req.ip === '::1' ||
            req.ip === '127.0.0.1' ||
            req.ip === '::ffff:127.0.0.1' ||
            req.hostname === 'localhost';
        return isLocalhost; // Always skip localhost, regardless of NODE_ENV
    }
});
// Middleware
app.use((0, helmet_1.default)());
app.use((0, compression_1.default)());
app.use((0, morgan_1.default)('combined'));
app.use(limiter);
app.use((0, cors_1.default)({
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
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Serve static files from uploads directory
app.use('/uploads', express_1.default.static('uploads', {
    setHeaders: (res, path, stat) => {
        res.set('Cross-Origin-Resource-Policy', 'cross-origin');
        res.set('Access-Control-Allow-Origin', '*');
    }
}));
// Serve static files from public directory (including icons)
app.use('/public', express_1.default.static('public', {
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
app.use(notFoundHandler_1.notFoundHandler);
app.use(errorHandler_1.errorHandler);
console.log('🔧 About to start server on port', PORT);
// Setup graceful shutdown and error handlers
(0, shutdown_1.setupUncaughtExceptionHandler)();
(0, shutdown_1.setupUnhandledRejectionHandler)();
(0, shutdown_1.setupProcessWarnings)();
(0, shutdown_1.setupGracefulShutdown)(server, io);
// Check database connection before starting
(0, connection_1.checkDatabaseConnection)().then((isConnected) => {
    if (isConnected) {
        console.log('✅ Database connection verified');
        // Start periodic health check
        (0, connection_1.startDatabaseHealthCheck)(60000); // Check every 60 seconds
    }
    else {
        console.error('❌ Database connection failed. Server may not work correctly.');
    }
});
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Local API: http://localhost:${PORT}/api`);
    console.log(`🌐 Network API: http://192.168.1.108:${PORT}/api`);
});
server.on('error', (error) => {
    console.error('❌ Server error:', error);
});
exports.default = app;
// Force restart
//# sourceMappingURL=index.js.map