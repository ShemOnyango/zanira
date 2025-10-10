// routes/chats.js
import express from 'express';
import {
  getUserChats,
  getChat,
  createChat,
  addParticipant,
  removeParticipant,
  getChatHistory,
  sendMessage,
  markAsRead,
  getOrCreateBookingChat
} from '../controllers/chatController.js';
import { protect } from '../middleware/auth.js';
import { validateObjectId } from '../middleware/validation.js';

const router = express.Router();

// All routes are protected
router.use(protect);

router.get('/', getUserChats);
router.get('/:id', validateObjectId, getChat);
router.get('/:id/history', validateObjectId, getChatHistory);
router.post('/', createChat);
router.post('/booking/:bookingId', validateObjectId, getOrCreateBookingChat);
router.post('/:id/messages', validateObjectId, sendMessage);
router.put('/:id/read', validateObjectId, markAsRead);
router.patch('/:id/participants', validateObjectId, addParticipant);
router.delete('/:id/participants/:participantId', validateObjectId, removeParticipant);

export default router;