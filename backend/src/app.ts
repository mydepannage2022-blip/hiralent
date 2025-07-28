import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from "cors";

dotenv.config();
const app = express();

const allowedOrigins = [
  'http://localhost:3000',
  'https://hiralent.vercel.app'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));


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
