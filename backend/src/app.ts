import express, { Request, Response } from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

app.use(express.json()); // for JSON request body

// routes
import authRoutes from './routes/auth.routes';
import candidateRoutes from './routes/candidate.routes';

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/candidates', candidateRoutes);

app.get('/', (req: Request, res: Response) => {
  res.send("backend running successfully");
});

export default app;
