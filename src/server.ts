import app from './app';
import { ENV } from './config/env';

const server = app.listen(ENV.PORT, () => {
  console.log(`🚀 Recall Cloud API server running on port ${ENV.PORT}`);
  console.log(`📡 Healthcheck available at: http://localhost:${ENV.PORT}/health`);
  console.log(`📚 REST API v1 prefix: http://localhost:${ENV.PORT}/api/v1`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});
