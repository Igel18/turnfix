import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.JURY_PORT || 3002;
const MAIN_SERVER_URL = process.env.MAIN_SERVER_URL || 'http://localhost:3001';

// Middleware - Security headers with relaxed CSP for static frontend serving
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "http:", "ws:", "wss:"], // Allow all HTTP connections (network access)
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

// CORS - Allow all origins for jury portal network access
app.use(cors({
  origin: true, // Allow all origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());

// Serve static files from the jury portal build under /jury path
const juryDistPath = path.join(__dirname, '../../jury-portal/dist');
console.log(`📂 Jury Portal dist path: ${juryDistPath}`);
console.log(`📂 Jury Portal dist exists: ${fs.existsSync(juryDistPath)}`);
app.use('/jury', express.static(juryDistPath));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'jury-portal', port: PORT });
});

// ─── Jury API Allowlist ───────────────────────────────────────────────
// Only proxy endpoints that the Jury Portal actually needs.
// All other /api/* requests are blocked to prevent access to the
// management API (admin, firewall, configuration, etc.) via port 3002.
const ALLOWED_API_PATTERNS = [
  { method: 'GET',  pattern: /^\/api\/events(\?.*)?$/ },
  { method: 'GET',  pattern: /^\/api\/squad-management(\?.*)?$/ },
  { method: 'POST', pattern: /^\/api\/squad-management\/complete$/ },
  { method: 'GET',  pattern: /^\/api\/competitions(\?.*)?$/ },
  { method: 'GET',  pattern: /^\/api\/competitions\/\d+\/disciplines(\?.*)?$/ },
  { method: 'GET',  pattern: /^\/api\/scores(\?.*)?$/ },
  { method: 'POST', pattern: /^\/api\/scores\/save-value$/ },
  { method: 'GET',  pattern: /^\/api\/discipline-fields(\?.*)?$/ },
  { method: 'GET',  pattern: /^\/api\/jury-results(\?.*)?$/ },
  { method: 'POST', pattern: /^\/api\/jury-results$/ },
  { method: 'GET',  pattern: /^\/api\/app-settings(\?.*)?$/ },
  { method: 'GET',  pattern: /^\/api\/time-planning\/active-squads(\?.*)?$/ },
];

function isAllowedApiRequest(method, url) {
  // Strip hash/fragment if present
  const cleanUrl = url.split('#')[0];
  return ALLOWED_API_PATTERNS.some(
    rule => rule.method === method.toUpperCase() && rule.pattern.test(cleanUrl)
  );
}

// Proxy ONLY allowed /api requests to the main server
app.use('/api', async (req, res) => {
  // Check if this request is in the allowlist
  if (!isAllowedApiRequest(req.method, req.originalUrl)) {
    console.log(`[Proxy BLOCKED] ${req.method} ${req.originalUrl} — not in jury allowlist`);
    return res.status(403).json({
      error: 'Forbidden',
      message: 'This API endpoint is not available on the Jury Portal.'
    });
  }

  try {
    const targetUrl = `${MAIN_SERVER_URL}${req.originalUrl}`;
    console.log(`[Proxy] ${req.method} ${req.originalUrl} -> ${targetUrl}`);
    
    const response = await axios({
      method: req.method,
      url: targetUrl,
      data: req.body,
      headers: {
        ...req.headers,
        host: 'localhost:3001' // Override host header
      },
      validateStatus: () => true // Don't throw on any status code
    });
    
    console.log(`[Proxy] Response: ${response.status}`);
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('[Proxy Error]:', error.message);
    res.status(500).json({ 
      error: 'Proxy error', 
      message: error.message,
      targetUrl: `${MAIN_SERVER_URL}${req.originalUrl}`
    });
  }
});

// Root redirect to /jury
app.get('/', (req, res) => {
  res.redirect('/jury');
});

// Catch all handler for /jury routes: send back the jury portal index.html file
// This must come AFTER static file serving to allow assets to load
const juryIndexPath = path.join(juryDistPath, 'index.html');
app.get('/jury/*', (req, res) => {
  if (fs.existsSync(juryIndexPath)) {
    res.sendFile(juryIndexPath);
  } else {
    console.error(`❌ Jury Portal index.html not found at: ${juryIndexPath}`);
    res.status(500).send('Jury Portal not found. Please check the installation.');
  }
});

// Block all other routes — redirect to /jury
// This prevents the management UI from being accessible on port 3002
app.use('*', (req, res) => {
  // For API routes that weren't matched, return 404
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found' });
  }
  // For all other paths, redirect to the jury portal
  res.redirect('/jury');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🏆 Jury Portal running on port ${PORT}`);
  console.log(`🔗 Local: http://localhost:${PORT}`);
  console.log(`🌐 Network: http://0.0.0.0:${PORT}`);
});
