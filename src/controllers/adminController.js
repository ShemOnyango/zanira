import User from '../models/User.js';
import Booking from '../models/Booking.js';
import Payment from '../models/Payment.js';
import Fundi from '../models/Fundi.js';
import Client from '../models/Client.js';
import Shop from '../models/Shop.js';
import Verification from '../models/Verification.js';
import ServiceCategory from '../models/ServiceCategory.js';
import EscrowAccount from '../models/EscrowAccount.js';
import logger from '../middleware/logger.js';

// @desc    Get admin dashboard statistics
// @route   GET /api/v1/admin/dashboard
// @access  Private/Admin
export const getDashboardStats = async (req, res, next) => {
  try {
    // Get time ranges for analytics
    const today = new Date();
    const startOfToday = new Date(today.setHours(0, 0, 0, 0));
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    // User statistics
    const totalUsers = await User.countDocuments();
    const totalClients = await User.countDocuments({ role: 'client' });
    const totalFundis = await User.countDocuments({ role: 'fundi' });
    const newUsersToday = await User.countDocuments({
      createdAt: { $gte: startOfToday }
    });

    // Booking statistics
    const totalBookings = await Booking.countDocuments();
    const completedBookings = await Booking.countDocuments({ status: 'completed' });
    const pendingBookings = await Booking.countDocuments({ status: 'pending' });
    const todayBookings = await Booking.countDocuments({
      createdAt: { $gte: startOfToday }
    });

    // Financial statistics
    const totalRevenue = await Payment.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$platformFee' } } }
    ]);

    const todayRevenue = await Payment.aggregate([
      { 
        $match: { 
          status: 'completed',
          createdAt: { $gte: startOfToday }
        } 
      },
      { $group: { _id: null, total: { $sum: '$platformFee' } } }
    ]);

    // Verification statistics
    const pendingVerifications = await Verification.countDocuments({
      status: { $in: ['submitted', 'under_review'] }
    });

    // Fundi statistics
    const verifiedFundis = await Fundi.countDocuments({
      'verification.overallStatus': 'verified'
    });
    const pendingFundiVerifications = await Fundi.countDocuments({
      'verification.overallStatus': 'pending'
    });

    // Recent activities
    const recentBookings = await Booking.find()
      .populate('client', 'firstName lastName')
      .populate('fundi', 'user')
      .populate('service')
      .sort({ createdAt: -1 })
      .limit(5);

    const recentPayments = await Payment.find()
      .populate('client', 'firstName lastName')
      .populate('fundi', 'user')
      .sort({ createdAt: -1 })
      .limit(5);

    // Platform growth (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyGrowth = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 },
          revenue: { $sum: '$agreedPrice' }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalUsers,
          totalClients,
          totalFundis,
          newUsersToday,
          totalBookings,
          completedBookings,
          pendingBookings,
          todayBookings,
          totalRevenue: totalRevenue[0]?.total || 0,
          todayRevenue: todayRevenue[0]?.total || 0,
          pendingVerifications,
          verifiedFundis,
          pendingFundiVerifications
        },
        recentActivities: {
          bookings: recentBookings,
          payments: recentPayments
        },
        growth: monthlyGrowth
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get verification requests
// @route   GET /api/v1/admin/verifications
// @access  Private/Admin
export const getVerificationRequests = async (req, res, next) => {
  try {
    const {
      status,
      applicantType,
      page = 1,
      limit = 10,
      sort = '-createdAt'
    } = req.query;

    // Build filter
    const filter = {};
    if (status) filter.status = status;
    if (applicantType) filter.applicantType = applicantType;

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get verifications with population
    const verifications = await Verification.find(filter)
      .populate('applicant', 'firstName lastName email phone role')
      .populate('assignedTo', 'firstName lastName')
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    // Get total count
    const total = await Verification.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        verifications,
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

// @desc    Assign verification to admin
// @route   PATCH /api/v1/admin/verifications/:id/assign
// @access  Private/Admin
export const assignVerification = async (req, res, next) => {
  try {
    const { assignedTo } = req.body;
    const verificationId = req.params.id;

    const verification = await Verification.findById(verificationId);
    if (!verification) {
      return res.status(404).json({
        success: false,
        error: 'Verification request not found'
      });
    }

    // Check if admin exists and has verification permissions
    const admin = await User.findOne({ 
      _id: assignedTo, 
      role: { $in: ['admin', 'super_admin', 'verification_officer'] } 
    });

    if (!admin) {
      return res.status(404).json({
        success: false,
        error: 'Admin not found or does not have verification permissions'
      });
    }

    verification.assignedTo = assignedTo;
    verification.status = 'under_review';
    verification.reviewDate = new Date();
    await verification.save();

    // Update admin's assigned tasks
    const adminProfile = await Admin.findOne({ user: assignedTo });
    if (adminProfile) {
      adminProfile.assignedTasks.verifications.push(verificationId);
      await adminProfile.save();
    }

    res.status(200).json({
      success: true,
      message: 'Verification assigned successfully',
      data: {
        verification
      }
    });

    logger.info(`Verification ${verificationId} assigned to admin ${assignedTo}`);
  } catch (error) {
    next(error);
  }
};

// @desc    Approve verification
// @route   PATCH /api/v1/admin/verifications/:id/approve
// @access  Private/Admin
export const approveVerification = async (req, res, next) => {
  try {
    const { notes } = req.body;
    const verificationId = req.params.id;
    const adminId = req.user._id;

    const verification = await Verification.findById(verificationId)
      .populate('applicant');
    
    if (!verification) {
      return res.status(404).json({
        success: false,
        error: 'Verification request not found'
      });
    }

    // Update verification status
    verification.status = 'approved';
    verification.completionDate = new Date();
    verification.verifiedBy = adminId;
    verification.reviewerNotes = notes;

    // Update all document statuses to approved
    Object.keys(verification.documents).forEach(key => {
      if (verification.documents[key] && verification.documents[key].url) {
        verification.documents[key].status = 'approved';
      }
    });

    await verification.save();

    // Update applicant's verification status based on type
    switch (verification.applicantType) {
      case 'fundi':
        await Fundi.findOneAndUpdate(
          { user: verification.applicant._id },
          {
            'verification.overallStatus': 'verified',
            'verification.verificationDate': new Date(),
            'verification.verifiedBy': adminId,
            'verification.videoVerified': true,
            'verification.toolsVerified': true,
            'verification.idVerified': true,
            'verification.ncaVerified': verification.documents.ncaCertificate?.status === 'approved'
          }
        );
        break;

      case 'client':
        await Client.findOneAndUpdate(
          { user: verification.applicant._id },
          {
            idVerified: true
          }
        );
        break;

      case 'shop':
        await Shop.findOneAndUpdate(
          { user: verification.applicant._id },
          {
            'verification.overallStatus': 'verified',
            'verification.verificationDate': new Date(),
            'verification.verifiedBy': adminId,
            'verification.businessVerified': true,
            'verification.locationVerified': true
          }
        );
        break;
    }

    // Update user verification status
    await User.findByIdAndUpdate(verification.applicant._id, {
      isVerified: true
    });

    // Create notification for applicant
    await Notification.create({
      recipient: verification.applicant._id,
      recipientType: verification.applicantType,
      title: 'Verification Approved',
      message: 'Your account verification has been approved. You can now access all platform features.',
      notificationType: 'verification_approved',
      action: 'navigate',
      actionData: {
        screen: 'Dashboard'
      }
    });

    res.status(200).json({
      success: true,
      message: 'Verification approved successfully',
      data: {
        verification
      }
    });

    logger.info(`Verification approved: ${verificationId} by admin ${adminId}`);
  } catch (error) {
    next(error);
  }
};

// @desc    Reject verification
// @route   PATCH /api/v1/admin/verifications/:id/reject
// @access  Private/Admin
export const rejectVerification = async (req, res, next) => {
  try {
    const { reason, notes } = req.body;
    const verificationId = req.params.id;
    const adminId = req.user._id;

    const verification = await Verification.findById(verificationId)
      .populate('applicant');
    
    if (!verification) {
      return res.status(404).json({
        success: false,
        error: 'Verification request not found'
      });
    }

    if (!reason) {
      return res.status(400).json({
        success: false,
        error: 'Rejection reason is required'
      });
    }

    // Update verification status
    verification.status = 'rejected';
    verification.completionDate = new Date();
    verification.verifiedBy = adminId;
    verification.rejectionReason = reason;
    verification.reviewerNotes = notes;

    await verification.save();

    // Update applicant's verification status based on type
    switch (verification.applicantType) {
      case 'fundi':
        await Fundi.findOneAndUpdate(
          { user: verification.applicant._id },
          {
            'verification.overallStatus': 'rejected'
          }
        );
        break;

      case 'shop':
        await Shop.findOneAndUpdate(
          { user: verification.applicant._id },
          {
            'verification.overallStatus': 'rejected'
          }
        );
        break;
    }

    // Create notification for applicant
    await Notification.create({
      recipient: verification.applicant._id,
      recipientType: verification.applicantType,
      title: 'Verification Rejected',
      message: `Your verification was rejected. Reason: ${reason}`,
      notificationType: 'verification_rejected',
      action: 'navigate',
      actionData: {
        screen: 'Verification'
      }
    });

    res.status(200).json({
      success: true,
      message: 'Verification rejected successfully',
      data: {
        verification
      }
    });

    logger.info(`Verification rejected: ${verificationId} by admin ${adminId}`);
  } catch (error) {
    next(error);
  }
};

// @desc    Request additional information for verification
// @route   PATCH /api/v1/admin/verifications/:id/request-info
// @access  Private/Admin
export const requestAdditionalInfo = async (req, res, next) => {
  try {
    const { message } = req.body;
    const verificationId = req.params.id;
    const adminId = req.user._id;

    const verification = await Verification.findById(verificationId)
      .populate('applicant');
    
    if (!verification) {
      return res.status(404).json({
        success: false,
        error: 'Verification request not found'
      });
    }

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required to request additional information'
      });
    }

    // Update verification status
    verification.status = 'additional_info_required';
    verification.additionalInfoRequested = {
      requested: true,
      message: message,
      requestedAt: new Date(),
      responded: false
    };

    await verification.save();

    // Create notification for applicant
    await Notification.create({
      recipient: verification.applicant._id,
      recipientType: verification.applicantType,
      title: 'Additional Information Required',
      message: `The verification team requires additional information: ${message}`,
      notificationType: 'system_alert',
      action: 'navigate',
      actionData: {
        screen: 'Verification'
      }
    });

    res.status(200).json({
      success: true,
      message: 'Additional information requested successfully',
      data: {
        verification
      }
    });

    logger.info(`Additional info requested for verification: ${verificationId}`);
  } catch (error) {
    next(error);
  }
};

// @desc    Get system analytics
// @route   GET /api/v1/admin/analytics
// @access  Private/Admin
export const getSystemAnalytics = async (req, res, next) => {
  try {
    const { period = 'month' } = req.query;

    // Calculate date ranges based on period
    const now = new Date();
    let startDate;

    switch (period) {
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // User growth analytics
    const userGrowth = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            role: '$role'
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.date': 1 }
      }
    ]);

    // Booking analytics
    const bookingAnalytics = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            status: '$status'
          },
          count: { $sum: 1 },
          totalRevenue: { $sum: '$agreedPrice' }
        }
      },
      {
        $sort: { '_id.date': 1 }
      }
    ]);

    // Revenue analytics
    const revenueAnalytics = await Payment.aggregate([
      {
        $match: {
          status: 'completed',
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
          },
          totalAmount: { $sum: '$amount' },
          platformRevenue: { $sum: '$platformFee' },
          fundiEarnings: { $sum: '$fundiAmount' },
          transactionCount: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.date': 1 }
      }
    ]);

    // Service category analytics
    const serviceAnalytics = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $lookup: {
          from: 'servicecategories',
          localField: 'service',
          foreignField: '_id',
          as: 'serviceInfo'
        }
      },
      {
        $unwind: '$serviceInfo'
      },
      {
        $group: {
          _id: '$serviceInfo.name',
          category: { $first: '$serviceInfo.category' },
          bookingCount: { $sum: 1 },
          totalRevenue: { $sum: '$agreedPrice' },
          averagePrice: { $avg: '$agreedPrice' }
        }
      },
      {
        $sort: { bookingCount: -1 }
      }
    ]);

    // Location analytics
    const locationAnalytics = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$location.county',
          bookingCount: { $sum: 1 },
          totalRevenue: { $sum: '$agreedPrice' }
        }
      },
      {
        $sort: { bookingCount: -1 }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        userGrowth,
        bookingAnalytics,
        revenueAnalytics,
        serviceAnalytics,
        locationAnalytics,
        period
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Manage escrow account
// @route   GET /api/v1/admin/escrow
// @access  Private/Admin
export const getEscrowAccount = async (req, res, next) => {
  try {
    const escrowAccount = await EscrowAccount.getMainAccount();

    // Get recent escrow transactions
    const recentTransactions = await Payment.find({
      escrowStatus: { $in: ['held', 'released', 'refunded'] }
    })
    .populate('client', 'firstName lastName')
    .populate('fundi', 'user')
    .sort({ createdAt: -1 })
    .limit(10);

    res.status(200).json({
      success: true,
      data: {
        escrowAccount,
        recentTransactions
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update system settings
// @route   PATCH /api/v1/admin/settings
// @access  Private/SuperAdmin
export const updateSystemSettings = async (req, res, next) => {
  try {
    const { 
      commissionRate, 
      autoReleaseDays, 
      maxSingleTransaction,
      dailyTransactionLimit 
    } = req.body;

    // Update escrow account settings
    const escrowAccount = await EscrowAccount.getMainAccount();

    if (autoReleaseDays !== undefined) {
      escrowAccount.settings.autoReleaseDays = autoReleaseDays;
    }

    if (maxSingleTransaction !== undefined) {
      escrowAccount.settings.maxSingleTransaction = maxSingleTransaction;
    }

    if (dailyTransactionLimit !== undefined) {
      escrowAccount.settings.dailyTransactionLimit = dailyTransactionLimit;
    }

    await escrowAccount.save();

    // Update commission rate in all services (optional)
    if (commissionRate !== undefined) {
      // This would update the default commission rate for new bookings
      // Existing bookings would keep their original commission rate
      logger.info(`Commission rate updated to ${commissionRate}% by admin ${req.user.email}`);
    }

    res.status(200).json({
      success: true,
      message: 'System settings updated successfully',
      data: {
        escrowAccount
      }
    });

    logger.info(`System settings updated by admin ${req.user.email}`);
  } catch (error) {
    next(error);
  }
};

// @desc    Get recent admin activities
// @route   GET /api/v1/admin/activities
// @access  Private/Admin
export const getRecentActivities = async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;

    // For now, return a simple aggregation of recent bookings, payments and verifications
    const recentBookings = await Booking.find().sort({ createdAt: -1 }).limit(parseInt(limit)).select('client fundi service createdAt status');
    const recentPayments = await Payment.find().sort({ createdAt: -1 }).limit(parseInt(limit)).select('client fundi amount status createdAt');
    const recentVerifications = await Verification.find().sort({ createdAt: -1 }).limit(parseInt(limit)).select('applicant status createdAt applicantType');

    res.status(200).json({
      success: true,
      data: {
        bookings: recentBookings,
        payments: recentPayments,
        verifications: recentVerifications
      }
    });
  } catch (error) {
    next(error);
  }
};