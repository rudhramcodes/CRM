import dns from 'node:dns';
import mongoose from 'mongoose';
import config from './index.js';
import logger from '../utils/logger.js';

const connectDB = async () => {
  // Some home routers hand out only an IPv6 link-local DNS server, which Node can't use, so it
  // falls back to 127.0.0.1 and the mongodb+srv lookup fails (querySrv ECONNREFUSED). Dev only.
  if (config.nodeEnv !== 'production' && dns.getServers().join() === '127.0.0.1') {
    dns.setServers(['1.1.1.1', '8.8.8.8']);
    logger.warn('No usable DNS server for Node; using 1.1.1.1 / 8.8.8.8 for MongoDB lookup');
  }
  try {
    const conn = await mongoose.connect(config.mongodbUri);
    logger.info(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    logger.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }

  mongoose.connection.on('error', (err) => {
    logger.error(`MongoDB runtime error: ${err.message}`);
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected. Attempting to reconnect...');
  });
};

export default connectDB;
