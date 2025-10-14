import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.JURY_PORT || 3002;
const MAIN_SERVER_URL = process.env.MAIN_SERVER_URL || 'http://localhost:3001';

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the jury portal build
app.use(express.static(path.join(__dirname, '../../client/dist-jury')));

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

// Catch all handler: send back the jury portal index.html file
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../client/dist-jury/index-jury.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🏆 Jury Portal running on port ${PORT}`);
  console.log(`🔗 Local: http://localhost:${PORT}`);
  console.log(`🌐 Network: http://0.0.0.0:${PORT}`);
});
