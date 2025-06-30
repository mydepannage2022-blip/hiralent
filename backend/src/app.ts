import express, { Request, Response } from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

app.use(express.json()); // for JSON request body

// routes
import authRoutes from './routes/auth.routes';
app.use('/api/v1/auth', authRoutes);

app.get('/', (req: Request, res: Response) => {
  res.send("backend running successfully");
});

export default app;
