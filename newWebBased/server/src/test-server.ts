import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

console.log('Testing minimal server...');

app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Minimal server works' });
});

app.listen(PORT, () => {
  console.log(`✅ Minimal server running on port ${PORT}`);
});
