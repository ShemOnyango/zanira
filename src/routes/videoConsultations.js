import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  createVideoConsultation,
  joinConsultation,
  endConsultation,
  getConsultationHistory
} from '../controllers/videoConsultationController.js';

const router = express.Router();

router.use(protect);

router.post('/', createVideoConsultation);
router.post('/:sessionId/join', joinConsultation);
router.post('/:sessionId/end', endConsultation);
router.get('/history', getConsultationHistory);

export default router;
