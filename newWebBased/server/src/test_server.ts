import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3002;

// Basic middleware
app.use(cors());
app.use(express.json());

// Simple health endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Test server is running' });
});

// Simple regions test endpoint
app.get('/api/regions', (req, res) => {
  res.json({ 
    message: 'Regions endpoint is working',
    regions: [
      { id: 1, name: 'Test Region 1' },
      { id: 2, name: 'Test Region 2' }
    ]
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Test Server running on port ${PORT}`);
  console.log(`🔗 API: http://localhost:${PORT}/api`);
});
