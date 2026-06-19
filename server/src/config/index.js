import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

const config = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/crm',
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  },
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
  imagekit: {
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY || '',
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY || '',
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || '',
  },
};

export default config;
