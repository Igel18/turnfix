import { config } from 'dotenv';
config();

import express from 'express';
import cors from 'cors';
import medalRoutes from './src/routes/medals';

console.log('Testing server with medals route...');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

console.log('Adding medal routes...');
app.use('/api/medals', medalRoutes);
console.log('Medal routes added successfully');

const server = app.listen(PORT, () => {
  console.log(`🚀 Server with medals running on port ${PORT}`);
});

// Keep alive
setInterval(() => {
  // Keep process running
}, 1000);
