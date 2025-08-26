const express = require('express');
const app = express();

app.get('/test', (req, res) => {
  res.json({ message: 'Test server is working!', timestamp: new Date().toISOString() });
});

const PORT = 3001;

const server = app.listen(PORT, '127.0.0.1', () => {
  console.log(`Test server running on http://127.0.0.1:${PORT}`);
});

server.on('error', (err) => {
  console.error('Server error:', err);
});
