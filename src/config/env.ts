import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_SECRET: process.env.JWT_SECRET || 'recall_fallback_secret_key',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  SMTP_USER: process.env.SMTP_USER || 'charles.biasora@gmail.com',
  SMTP_PASS: (process.env.SMTP_PASS || 'iisvqoahikccrdzs').replace(/\s+/g, ''),
};
