"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundHandler = void 0;
const notFoundHandler = (req, res) => {
    // Only handle API routes - let frontend handle all other routes
    if (req.originalUrl.startsWith('/api/')) {
        res.status(404).json({
            success: false,
            message: `Route ${req.originalUrl} not found`
        });
    }
    else {
        // For non-API routes, this should not be reached if frontend is properly configured
        // but just in case, send a generic 404
        res.status(404).send('Page not found');
    }
};
exports.notFoundHandler = notFoundHandler;
//# sourceMappingURL=notFoundHandler.js.map