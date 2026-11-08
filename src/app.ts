import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { ENV } from './config/env';
import apiRoutes from './routes';
import { errorHandler } from './middleware/error.middleware';

const app: Application = express();

// Middlewares
app.use(
  cors({
    origin: ENV.CORS_ORIGIN,
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'recall-backend',
    version: '1.0.0',
    environment: ENV.NODE_ENV,
  });
});

// Swagger / OpenAPI documentation
app.get('/docs', (req: Request, res: Response) => {
  const candidatePaths = [
    path.join(__dirname, 'docs', 'swagger.html'),
    path.join(__dirname, '..', 'src', 'docs', 'swagger.html'),
    path.join(process.cwd(), 'src', 'docs', 'swagger.html'),
  ];
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) return res.sendFile(p);
  }
  res.redirect('/api/v1/swagger.json');
});

app.get('/api/v1/swagger.json', (req: Request, res: Response) => {
  const candidatePaths = [
    path.join(__dirname, 'docs', 'swagger.json'),
    path.join(__dirname, '..', 'src', 'docs', 'swagger.json'),
    path.join(process.cwd(), 'src', 'docs', 'swagger.json'),
  ];
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) return res.sendFile(p);
  }
  res.status(404).json({ error: 'OpenAPI specification not found.' });
});

// Mount versioned API routes
app.use('/api/v1', apiRoutes);

// Global Error Handler
app.use(errorHandler);

export default app;
