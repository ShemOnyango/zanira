// src/config/redis.js
import redis from 'redis';
import logger from '../middleware/logger.js';

let redisClient = null;

// Only initialize Redis if enabled
if (process.env.REDIS_ENABLED === 'true') {
  try {
    redisClient = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });

    redisClient.on('error', (err) => {
      logger.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      logger.info('Redis Client Connected');
    });

    await redisClient.connect();
    
  } catch (error) {
    logger.error('Failed to initialize Redis:', error);
    redisClient = null;
  }
} else {
  logger.info('Redis is disabled, using in-memory cache');
}

export default redisClient;