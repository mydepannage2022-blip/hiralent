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
  origin: allowedOrigins
}));


  app.use(express.json()); // for JSON request body

  // routes
  import authRoutes from './routes/auth.routes';
  import candidateRoutes from './routes/candidate.routes';
  import companyRoutes from './routes/company.routes';
  
  import ocrRoutes from './routes/ocr.routes';

  // mount OCR
  app.use('/api/ocr', ocrRoutes);

  // Use routes
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/candidates', candidateRoutes);
  app.use('/api/v1/company', companyRoutes);

  app.get('/', (req: Request, res: Response) => {
    res.send("backend running successfully");
  });

export default app;
