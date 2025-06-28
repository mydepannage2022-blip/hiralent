import express, { Request, Response } from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// routes
app.get('/', (req: Request, res: Response) => {
  res.send("backend running successfully");
});

export default app;
