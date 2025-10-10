import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  createApiKey,
  getUserApiKeys,
  revokeApiKey,
  rotateApiKey
} from '../controllers/apiKeyController.js';
import { createSensitiveOperationLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.use(protect);

const sensitiveOpLimiter = createSensitiveOperationLimiter();

router.post('/', sensitiveOpLimiter, createApiKey);
router.get('/', getUserApiKeys);
router.delete('/:id', sensitiveOpLimiter, revokeApiKey);
router.post('/:id/rotate', sensitiveOpLimiter, rotateApiKey);

export default router;
