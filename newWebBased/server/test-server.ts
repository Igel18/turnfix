import express from 'express';
import cors from 'cors';
import eventRoutes from './src/routes/events';

const app = express();

app.use(cors());
app.use(express.json());

// Just test the events route
app.use('/api/events', eventRoutes);

app.listen(3002, () => {
  console.log('Test server running on port 3002');
});
