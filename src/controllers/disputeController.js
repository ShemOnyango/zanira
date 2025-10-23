import Dispute from '../models/Dispute.js';
import Booking from '../models/Booking.js';
import Payment from '../models/Payment.js';
import Fundi from '../models/Fundi.js';
import Client from '../models/Client.js';
import User from '../models/User.js';
// Notification model not used in this controller (notifications are sent via notificationService)
import Chat from '../models/Chat.js';
import notificationService from '../services/notificationService.js';
import logger from '../middleware/logger.js';
import { normalizeRole } from '../utils/roleUtils.js';

// --- Payment/Compensation helpers (minimal implementations)
// These are small, safe helper functions to perform refunds/compensation
// in the dispute resolution flow. They create Payment records and update
// booking/payment statuses where appropriate. Integrate with your
// existing payments/escrow logic as needed.
const processRefund = async (booking, amount) => {
  try {
    if (!booking || !amount || amount <= 0) return null;

    // Create a payment record representing the refund (minimal)
    const payment = await Payment.create({
      booking: booking._id || booking,
      amount,
      type: 'refund',
      status: 'refunded',
      method: 'platform',
      createdAt: new Date()
    });

    // Mark booking as refunded if fully refunded
    if (booking && booking.status) {
      booking.status = 'refunded';
      try { await booking.save(); } catch (e) { /* non-fatal */ }
    }

    logger.info(`Processed refund of ${amount} for booking ${booking._id || booking}`);
    return payment;
  } catch (err) {
    logger.error('processRefund error:', err);
    throw err;
  }
};

const processCompensation = async (booking, amount) => {
  try {
    if (!booking || !amount || amount <= 0) return null;

    // Create a payment record for compensation (minimal)
    const payment = await Payment.create({
      booking: booking._id || booking,
      amount,
      type: 'refund',
      status: 'released',
      method: 'platform_compensation',
      createdAt: new Date()
    });

    logger.info(`Processed compensation of ${amount} for booking ${booking._id || booking}`);
    return payment;
  } catch (err) {
    logger.error('processCompensation error:', err);
    throw err;
  }
};

// @desc    Raise a dispute
// @route   POST /api/v1/disputes
// @access  Private
export const raiseDispute = async (req, res, next) => {
  try {
    const {
      bookingId,
      title,
      description,
      category,
      severity = 'medium',
      evidence
    } = req.body;

    const raisedBy = req.user._id;
    const raisedByRole = req.user.role;

    // Validate booking exists
    const booking = await Booking.findById(bookingId)
      .populate('client', 'user')
      .populate('fundi', 'user');
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    // Check if user is involved in the booking
    const isClient = booking.client.user.toString() === raisedBy.toString();
    const isFundi = booking.fundi.user.toString() === raisedBy.toString();
    
    if (!isClient && !isFundi) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to raise dispute for this booking'
      });
    }

    // Check if dispute already exists for this booking
    const existingDispute = await Dispute.findOne({ booking: bookingId });
    if (existingDispute) {
      return res.status(400).json({
        success: false,
        error: 'A dispute already exists for this booking'
      });
    }

    // Determine the other party
    const raisedAgainst = isClient ? booking.fundi.user : booking.client.user;

    // Create dispute
    const dispute = await Dispute.create({
      booking: bookingId,
      raisedBy,
      raisedAgainst,
      raisedByRole,
      title,
      description,
      category,
      severity,
      evidence,
      timeline: {
        raisedAt: new Date()
      }
    });

    // Calculate automatic penalties
    dispute.calculateAutomaticPenalties();
    await dispute.save();

    // Update booking status
    booking.status = 'disputed';
    booking.dispute = {
      exists: true,
      raisedBy: raisedBy,
      reason: category,
      description: description
    };
    await booking.save();

    // Create dedicated chat for dispute resolution
    const chat = await Chat.create({
      chatId: `dispute_${dispute.disputeId}`,
      chatType: 'group',
      participants: [
        {
          user: raisedBy,
          role: normalizeRole(raisedByRole),
          joinedAt: new Date()
        },
        {
          user: raisedAgainst,
          role: normalizeRole(raisedByRole === 'client' ? 'fundi' : 'client'),
          joinedAt: new Date()
        }
      ],
      context: {
        dispute: dispute._id,
        booking: bookingId,
        topic: `Dispute: ${title}`
      },
      settings: {
        maxParticipants: 5, // Include admins later
        allowAttachments: true,
        allowLocationSharing: false
      }
    });

    // Link chat to dispute
    dispute.chatThread = chat._id;
    await dispute.save();

    // Notify both parties and admins
    await notificationService.sendBulkNotifications(
      [raisedAgainst, ...await getAdminUsers()],
      {
        title: 'New Dispute Raised',
        message: `A dispute has been raised for booking ${booking.bookingId}: ${title}`,
        notificationType: 'system_alert',
        action: 'navigate',
        actionData: {
          screen: 'DisputeDetails',
          params: { disputeId: dispute._id }
        },
        priority: 'high'
      }
    );

    // Log the dispute
    logger.info(`Dispute raised: ${dispute.disputeId} for booking ${bookingId} by ${raisedByRole} ${raisedBy}`);

    res.status(201).json({
      success: true,
      message: 'Dispute raised successfully',
      data: {
        dispute,
        chat: chat
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user disputes
// @route   GET /api/v1/disputes
// @access  Private
export const getUserDisputes = async (req, res, next) => {
  try {
    const {
      status,
      category,
      page = 1,
      limit = 10,
      sort = '-createdAt'
    } = req.query;

    const userId = req.user._id;
    const userRole = req.user.role;

    // Build filter based on user role
    let filter = {};
    if (userRole === 'admin' || userRole === 'super_admin') {
      // Admins can see all disputes
      filter = {};
    } else {
      // Users can only see disputes they're involved in
      filter = {
        $or: [
          { raisedBy: userId },
          { raisedAgainst: userId }
        ]
      };
    }

    // Additional filters
    if (status) filter.status = status;
    if (category) filter.category = category;

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get disputes with population
    const disputes = await Dispute.find(filter)
      .populate('booking', 'bookingId serviceDescription agreedPrice')
      .populate('raisedBy', 'firstName lastName phone profilePhoto')
      .populate('raisedAgainst', 'firstName lastName phone profilePhoto')
      .populate('assignedTo', 'firstName lastName')
      .populate('resolution.resolvedBy', 'firstName lastName')
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    // Get total count
    const total = await Dispute.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        disputes,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single dispute
// @route   GET /api/v1/disputes/:id
// @access  Private
export const getDispute = async (req, res, next) => {
  try {
    const dispute = await Dispute.findById(req.params.id)
      .populate('booking')
      .populate('raisedBy', 'firstName lastName phone profilePhoto email')
      .populate('raisedAgainst', 'firstName lastName phone profilePhoto email')
      .populate('assignedTo', 'firstName lastName email')
      .populate('resolution.resolvedBy', 'firstName lastName')
      .populate('chatThread')
      .populate('internalNotes.admin', 'firstName lastName');

    if (!dispute) {
      return res.status(404).json({
        success: false,
        error: 'Dispute not found'
      });
    }

    // Check if user has access to this dispute
    const userId = req.user._id;
    const userRole = req.user.role;
    
    const hasAccess = 
      dispute.raisedBy._id.toString() === userId.toString() ||
      dispute.raisedAgainst._id.toString() === userId.toString() ||
      userRole === 'admin' ||
      userRole === 'super_admin';

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to access this dispute'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        dispute
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Assign dispute to admin
// @route   PATCH /api/v1/disputes/:id/assign
// @access  Private/Admin
export const assignDispute = async (req, res, next) => {
  try {
    const { assignedTo } = req.body;
    const disputeId = req.params.id;
    const adminId = req.user._id;

    const dispute = await Dispute.findById(disputeId);
    if (!dispute) {
      return res.status(404).json({
        success: false,
        error: 'Dispute not found'
      });
    }

    // Verify assigned user is an admin
    const admin = await User.findOne({ 
      _id: assignedTo, 
      role: { $in: ['admin', 'super_admin'] } 
    });

    if (!admin) {
      return res.status(400).json({
        success: false,
        error: 'Assigned user must be an admin'
      });
    }

    // Update dispute
    dispute.assignedTo = assignedTo;
    dispute.status = 'under_review';
    dispute.timeline.underReviewAt = new Date();
    
    // Add internal note
    dispute.internalNotes.push({
      admin: adminId,
      note: `Dispute assigned to ${admin.firstName} ${admin.lastName}`
    });

    await dispute.save();

    // Notify assigned admin
    await notificationService.sendNotification({
      recipient: assignedTo,
      recipientType: 'admin',
      title: 'Dispute Assigned',
      message: `You have been assigned to resolve dispute ${dispute.disputeId}`,
      notificationType: 'system_alert',
      action: 'navigate',
      actionData: {
        screen: 'DisputeDetails',
        params: { disputeId: dispute._id }
      },
      priority: 'high'
    });

    res.status(200).json({
      success: true,
      message: 'Dispute assigned successfully',
      data: {
        dispute
      }
    });

    logger.info(`Dispute ${disputeId} assigned to admin ${assignedTo} by ${adminId}`);
  } catch (error) {
    next(error);
  }
};

// @desc    Resolve dispute with penalties
// @route   PATCH /api/v1/disputes/:id/resolve
// @access  Private/Admin
export const resolveDispute = async (req, res, next) => {
  try {
    const {
      decision,
      resolutionNotes,
      adminNotes,
      clientPenalty,
      fundiPenalty,
      platformActions
    } = req.body;

    const disputeId = req.params.id;
    const adminId = req.user._id;

    const dispute = await Dispute.findById(disputeId)
      .populate('booking')
      .populate('raisedBy')
      .populate('raisedAgainst');

    if (!dispute) {
      return res.status(404).json({
        success: false,
        error: 'Dispute not found'
      });
    }

    // Update dispute resolution
    dispute.resolution = {
      decision,
      decisionDate: new Date(),
      resolvedBy: adminId,
      resolutionNotes,
      adminNotes
    };

    // Apply penalties
    if (clientPenalty) {
      dispute.penalties.clientPenalty = {
        ...dispute.penalties.clientPenalty,
        ...clientPenalty
      };
    }

    if (fundiPenalty) {
      dispute.penalties.fundiPenalty = {
        ...dispute.penalties.fundiPenalty,
        ...fundiPenalty
      };
    }

    if (platformActions) {
      dispute.penalties.platformActions = {
        ...dispute.penalties.platformActions,
        ...platformActions
      };
    }

    dispute.status = 'resolved';
    dispute.timeline.resolvedAt = new Date();

    await dispute.save();

    // Execute penalties and adjustments
  await executePenalties(dispute);

    // Update booking status
    const booking = await Booking.findById(dispute.booking._id);
    if (booking) {
      booking.status = 'completed'; // or other appropriate status
      await booking.save();
    }

    // Notify both parties
    await notificationService.sendBulkNotifications(
      [dispute.raisedBy._id, dispute.raisedAgainst._id],
      {
        title: 'Dispute Resolved',
        message: `Your dispute ${dispute.disputeId} has been resolved. Decision: ${decision}`,
        notificationType: 'system_alert',
        action: 'navigate',
        actionData: {
          screen: 'DisputeDetails',
          params: { disputeId: dispute._id }
        }
      }
    );

    res.status(200).json({
      success: true,
      message: 'Dispute resolved successfully',
      data: {
        dispute,
        penalties: dispute.penalties
      }
    });

    logger.info(`Dispute ${disputeId} resolved by admin ${adminId} with decision: ${decision}`);
  } catch (error) {
    next(error);
  }
};

// @desc    Add evidence to dispute
// @route   PATCH /api/v1/disputes/:id/evidence
// @access  Private
export const addEvidence = async (req, res, next) => {
  try {
    const { photos, videos, documents, witnessStatements, additionalNotes } = req.body;
    const disputeId = req.params.id;
    const userId = req.user._id;

    const dispute = await Dispute.findById(disputeId);
    if (!dispute) {
      return res.status(404).json({
        success: false,
        error: 'Dispute not found'
      });
    }

    // Check if user is involved in the dispute
    const isInvolved = 
      dispute.raisedBy.toString() === userId.toString() ||
      dispute.raisedAgainst.toString() === userId.toString();

    if (!isInvolved && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to add evidence to this dispute'
      });
    }

    // Update evidence
    if (photos) dispute.evidence.photos.push(...photos);
    if (videos) dispute.evidence.videos.push(...videos);
    if (documents) dispute.evidence.documents.push(...documents);
    if (witnessStatements) dispute.evidence.witnessStatements.push(...witnessStatements);
    if (additionalNotes) dispute.evidence.additionalNotes = additionalNotes;

    await dispute.save();

    res.status(200).json({
      success: true,
      message: 'Evidence added successfully',
      data: {
        evidence: dispute.evidence
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Escalate dispute
// @route   PATCH /api/v1/disputes/:id/escalate
// @access  Private/Admin
export const escalateDispute = async (req, res, next) => {
  try {
    const { reason, level = 'level_2' } = req.body;
    const disputeId = req.params.id;
    const adminId = req.user._id;

    const dispute = await Dispute.findById(disputeId);
    if (!dispute) {
      return res.status(404).json({
        success: false,
        error: 'Dispute not found'
      });
    }

    await dispute.escalateDispute(adminId, reason, level);

    res.status(200).json({
      success: true,
      message: 'Dispute escalated successfully',
      data: {
        dispute
      }
    });

    logger.info(`Dispute ${disputeId} escalated to ${level} by admin ${adminId}`);
  } catch (error) {
    next(error);
  }
};

// @desc    Get dispute statistics
// @route   GET /api/v1/disputes/stats/overview
// @access  Private/Admin
export const getDisputeStats = async (req, res, next) => {
  try {
    const { period = '30d' } = req.query;

    const stats = await Dispute.getDisputeStats(period);

    // Additional statistics
    const totalDisputes = await Dispute.countDocuments();
    const activeDisputes = await Dispute.countDocuments({ 
      status: { $in: ['raised', 'under_review', 'additional_info_required'] } 
    });
  const averageResolutionTime = await calculateAverageResolutionTime();

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalDisputes,
          activeDisputes,
          averageResolutionTime,
          resolutionRate: totalDisputes > 0 ? 
            (await Dispute.countDocuments({ status: 'resolved' })) / totalDisputes : 0
        },
        detailedStats: stats,
        period
      }
    });
  } catch (error) {
    next(error);
  }
};

// Helper method to execute penalties
const executePenalties = async (dispute) => {
  const { penalties, booking, raisedBy, raisedAgainst } = dispute;

  try {
    // Client penalties
    if (penalties?.clientPenalty?.amount > 0) {
      await applyClientPenalty(raisedBy, penalties.clientPenalty, booking);
    }

    // Fundi penalties
    if (penalties?.fundiPenalty?.amount > 0) {
      await applyFundiPenalty(raisedAgainst, penalties.fundiPenalty, booking);
    }

    // Platform actions (refunds, compensation, etc.)
    if (penalties?.platformActions?.refundAmount > 0) {
      await processRefund(booking, penalties.platformActions.refundAmount);
    }

    if (penalties?.platformActions?.compensationAmount > 0) {
      await processCompensation(booking, penalties.platformActions.compensationAmount);
    }

    logger.info(`Penalties executed for dispute ${dispute.disputeId}`);
  } catch (error) {
    logger.error(`Error executing penalties for dispute ${dispute.disputeId}:`, error);
    throw error;
  }
};

// Helper method to apply client penalty
const applyClientPenalty = async (clientId, penalty, _booking) => {
  const client = await Client.findOne({ user: clientId });
  
  switch (penalty.type) {
    case 'account_suspension':
      await User.findByIdAndUpdate(clientId, { isActive: false });
      logger.info(`Client ${clientId} account suspended due to dispute`);
      break;
      
    case 'service_credit':
      // Add service credit to client's account
      client.loyaltyPoints = (client.loyaltyPoints || 0) - (penalty.amount || 0);
      await client.save();
      break;
      
    // Add other penalty types as needed
  }
};

// Helper method to apply fundi penalty
const applyFundiPenalty = async (fundiId, penalty, _booking) => {
  const fundi = await Fundi.findOne({ user: fundiId });
  
  switch (penalty.type) {
    case 'payment_deduction':
      // Deduct from fundi's earnings
      fundi.earnings.available = Math.max(0, (fundi.earnings.available || 0) - (penalty.amount || 0));
      await fundi.save();
      break;
      
    case 'account_suspension':
      await User.findByIdAndUpdate(fundiId, { isActive: false });
      logger.info(`Fundi ${fundiId} account suspended due to dispute`);
      break;
      
    case 'rating_penalty': {
      // Apply rating penalty
      const currentRating = fundi.stats?.rating || 0;
      fundi.stats = fundi.stats || {};
      fundi.stats.rating = Math.max(1, currentRating - 1); // Reduce by 1 star, minimum 1
      await fundi.save();
      break;
    }
  }
};

// Helper method to get admin users
const getAdminUsers = async () => {
  const admins = await User.find({ 
    role: { $in: ['admin', 'super_admin'] } 
  }).select('_id');
  
  return admins.map(admin => admin._id);
};

// Helper method to calculate average resolution time
const calculateAverageResolutionTime = async () => {
  const result = await Dispute.aggregate([
    {
      $match: {
        status: 'resolved',
        'timeline.raisedAt': { $exists: true },
        'timeline.resolvedAt': { $exists: true }
      }
    },
    {
      $project: {
        resolutionTime: {
          $divide: [
            { $subtract: ['$timeline.resolvedAt', '$timeline.raisedAt'] },
            1000 * 60 * 60 * 24 // Convert to days
          ]
        }
      }
    },
    {
      $group: {
        _id: null,
        averageResolutionTime: { $avg: '$resolutionTime' }
      }
    }
  ]);

  return result[0]?.averageResolutionTime || 0;
};

