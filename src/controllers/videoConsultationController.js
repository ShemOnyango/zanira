import VideoConsultation from '../models/VideoConsultation.js';
import Subscription from '../models/Subscription.js';
import Notification from '../models/Notification.js';
import logger from '../middleware/logger.js';

const generateSessionId = () => {
  return `VC${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
};

export const createVideoConsultation = async (req, res, next) => {
  try {
    const { fundiId, bookingId, type, scheduledStartTime, scheduledEndTime } = req.body;
    const clientId = req.user._id;

    const subscription = await Subscription.findOne({
      user: clientId,
      status: 'active'
    });

    if (!subscription || !subscription.canPerformAction('video_call')) {
      return res.status(403).json({
        success: false,
        error: 'Video consultations not available in your subscription plan'
      });
    }

    const sessionId = generateSessionId();

    const consultation = await VideoConsultation.create({
      sessionId,
      client: clientId,
      fundi: fundiId,
      booking: bookingId,
      type: type || 'consultation',
      provider: 'twilio',
      scheduling: {
        scheduledStartTime: scheduledStartTime ? new Date(scheduledStartTime) : new Date(),
        scheduledEndTime: scheduledEndTime ? new Date(scheduledEndTime) : null,
        timezone: 'Africa/Nairobi'
      },
      status: 'scheduled'
    });

    await Notification.create([
      {
        recipient: clientId,
        recipientType: 'client',
        title: 'Video Consultation Scheduled',
        message: 'Your video consultation has been scheduled',
        notificationType: 'video_consultation',
        actionData: { sessionId }
      },
      {
        recipient: fundiId,
        recipientType: 'fundi',
        title: 'New Video Consultation',
        message: 'A client has scheduled a video consultation with you',
        notificationType: 'video_consultation',
        actionData: { sessionId }
      }
    ]);

    res.status(201).json({
      success: true,
      message: 'Video consultation created successfully',
      data: { consultation }
    });

    logger.info(`Video consultation created: ${sessionId}`);
  } catch (error) {
    next(error);
  }
};

export const joinConsultation = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user._id;

    const consultation = await VideoConsultation.findOne({ sessionId });
    if (!consultation) {
      return res.status(404).json({
        success: false,
        error: 'Consultation not found'
      });
    }

    const isParticipant =
      consultation.client.toString() === userId.toString() ||
      consultation.fundi.toString() === userId.toString();

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to join this consultation'
      });
    }

    if (!consultation.roomDetails.token) {
      consultation.roomDetails = {
        roomName: `zanira-${sessionId}`,
        token: `mock-token-${Date.now()}`
      };
      await consultation.save();
    }

    const role = consultation.client.toString() === userId.toString() ? 'host' : 'participant';

    consultation.participants.push({
      user: userId,
      role,
      joinedAt: new Date()
    });

    if (consultation.status === 'scheduled') {
      await consultation.start();
    }

    await consultation.save();

    res.status(200).json({
      success: true,
      data: {
        sessionId: consultation.sessionId,
        roomDetails: consultation.roomDetails,
        status: consultation.status
      }
    });

    logger.info(`User ${userId} joined video consultation: ${sessionId}`);
  } catch (error) {
    next(error);
  }
};

export const endConsultation = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { notes } = req.body;
    const userId = req.user._id;

    const consultation = await VideoConsultation.findOne({ sessionId });
    if (!consultation) {
      return res.status(404).json({
        success: false,
        error: 'Consultation not found'
      });
    }

    await consultation.end();

    if (notes) {
      if (consultation.client.toString() === userId.toString()) {
        consultation.notes.clientNotes = notes;
      } else {
        consultation.notes.fundiNotes = notes;
      }
      await consultation.save();
    }

    res.status(200).json({
      success: true,
      message: 'Consultation ended successfully',
      data: { consultation }
    });

    logger.info(`Video consultation ended: ${sessionId}`);
  } catch (error) {
    next(error);
  }
};

export const getConsultationHistory = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { status } = req.query;

    const query = {
      $or: [{ client: userId }, { fundi: userId }]
    };
    if (status) query.status = status;

    const consultations = await VideoConsultation.find(query)
      .populate('client', 'firstName lastName')
      .populate('fundi')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      data: { consultations }
    });
  } catch (error) {
    next(error);
  }
};
