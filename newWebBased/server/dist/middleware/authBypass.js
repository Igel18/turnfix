"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateToken = void 0;
// Temporary bypass for authentication during development
const authenticateToken = async (req, res, next) => {
    // Bypass authentication - add a dummy user
    req.user = {
        id: '1',
        email: 'admin@turnfix.com',
        username: 'admin',
        role: 'admin'
    };
    next();
};
exports.authenticateToken = authenticateToken;
//# sourceMappingURL=authBypass.js.map