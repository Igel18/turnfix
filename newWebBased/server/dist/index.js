"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const http_1 = require("http");
const events_1 = __importDefault(require("./routes/events"));
const regions_1 = __importDefault(require("./routes/regions"));
const associations_1 = __importDefault(require("./routes/associations"));
const disciplines_1 = __importDefault(require("./routes/disciplines"));
const clubs_1 = __importDefault(require("./routes/clubs"));
const participants_1 = __importDefault(require("./routes/participants"));
const areas_1 = __importDefault(require("./routes/areas"));
const sports_1 = __importDefault(require("./routes/sports"));
const statuses_1 = __importDefault(require("./routes/statuses"));
const countries_1 = __importDefault(require("./routes/countries"));
const teams_1 = __importDefault(require("./routes/teams"));
const venues_1 = __importDefault(require("./routes/venues"));
// Load environment variables
dotenv_1.default.config();
// Create Express app
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
const PORT = process.env.PORT || 3002;
console.log('🔧 Server configuration:');
console.log('  - PORT from env:', process.env.PORT);
console.log('  - Final PORT:', PORT);
console.log('  - Starting server...'); // Restart trigger
// Security middleware
app.use((0, helmet_1.default)({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));
// CORS configuration
app.use((0, cors_1.default)({
    origin: process.env.NODE_ENV === 'production'
        ? process.env.FRONTEND_URL || 'https://your-domain.com'
        : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
// Body parsing middleware
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Logging middleware
app.use((0, morgan_1.default)(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});
// API Routes
app.use('/api/events', events_1.default);
app.use('/api/regions', regions_1.default);
app.use('/api/associations', associations_1.default);
app.use('/api/disciplines', disciplines_1.default);
app.use('/api/clubs', clubs_1.default);
app.use('/api/participants', participants_1.default);
app.use('/api/areas', areas_1.default);
app.use('/api/sports', sports_1.default);
app.use('/api/statuses', statuses_1.default);
app.use('/api/countries', countries_1.default);
app.use('/api/teams', teams_1.default);
app.use('/api/venues', venues_1.default);
// 404 handler
const notFoundHandler = (req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.path} not found`
    });
};
// Global error handler
const errorHandler = (error, req, res, next) => {
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
exports.default = app;
//# sourceMappingURL=index.js.map