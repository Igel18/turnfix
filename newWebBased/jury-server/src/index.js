import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

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
app.use('/jury', express.static(juryDistPath));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'jury-portal', port: PORT });
});

// Simple proxy for all other /api requests
app.use('/api', async (req, res) => {
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
app.get('/jury/*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../jury-portal/dist/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🏆 Jury Portal running on port ${PORT}`);
  console.log(`🔗 Local: http://localhost:${PORT}`);
  console.log(`🌐 Network: http://0.0.0.0:${PORT}`);
});
