import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.JURY_PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the jury portal build
app.use(express.static(path.join(__dirname, '../../client/dist-jury')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'jury-portal', port: PORT });
});

// Proxy API calls to main server
app.use('/api', (req, res) => {
  const mainServerUrl = `http://localhost:3001${req.originalUrl}`;
  
  // Simple proxy implementation
  import('node-fetch').then(({ default: fetch }) => {
    const options = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        ...req.headers
      }
    };

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      options.body = JSON.stringify(req.body);
    }

    fetch(mainServerUrl, options)
      .then(response => response.json())
      .then(data => res.json(data))
      .catch(error => {
        console.error('Proxy error:', error);
        res.status(500).json({ error: 'Proxy error' });
      });
  });
});

// Catch all handler: send back the jury portal index.html file
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../client/dist-jury/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🏆 Jury Portal running on port ${PORT}`);
  console.log(`🔗 Local: http://localhost:${PORT}`);
  console.log(`🌐 Network: http://0.0.0.0:${PORT}`);
});
