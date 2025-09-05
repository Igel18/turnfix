// Debug server startup
import { config } from 'dotenv';
config();

console.log('Loading dependencies...');

try {
  const express = require('express');
  console.log('Express loaded');
  
  const cors = require('cors');
  console.log('CORS loaded');
  
  const app = express();
  console.log('Express app created');
  
  const PORT = process.env.PORT || 3002;
  
  app.use(cors());
  app.use(express.json());
  
  app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Debug server working' });
  });
  
  console.log('Starting server...');
  
  const server = app.listen(PORT, () => {
    console.log(`🚀 Debug server running on port ${PORT}`);
  });
  
  // Handle process signals
  process.on('SIGTERM', () => {
    console.log('SIGTERM received');
    server.close();
  });
  
  process.on('SIGINT', () => {
    console.log('SIGINT received');
    server.close();
  });
  
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });
  
  console.log('Server setup complete');
  
} catch (error) {
  console.error('Error during server setup:', error);
}
