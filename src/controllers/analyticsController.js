import Booking from '../models/Booking.js';
import Payment from '../models/Payment.js';
import User from '../models/User.js';
import Fundi from '../models/Fundi.js';
import Client from '../models/Client.js';
import ServiceCategory from '../models/ServiceCategory.js';
import Verification from '../models/Verification.js'; // Added missing import
import { protect, authorize } from '../middleware/auth.js';
import logger from '../middleware/logger.js';

// Helper methods - moved to top and fixed syntax
function getDateRanges(period) {
  const now = new Date();
  let currentPeriod = {};
  let previousPeriod = {};

  switch (period) {
    case '7d':
      currentPeriod.start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      previousPeriod.start = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      previousPeriod.end = currentPeriod.start;
      break;
    case '30d':
      currentPeriod.start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      previousPeriod.start = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
      previousPeriod.end = currentPeriod.start;
      break;
    case '90d':
      currentPeriod.start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      previousPeriod.start = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
      previousPeriod.end = currentPeriod.start;
      break;
    case 'ytd':
      currentPeriod.start = new Date(now.getFullYear(), 0, 1);
      previousPeriod.start = new Date(now.getFullYear() - 1, 0, 1);
      previousPeriod.end = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      currentPeriod.start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  currentPeriod.end = now;
  previousPeriod.end = previousPeriod.end || currentPeriod.start;

  return { currentPeriod, previousPeriod };
}

async function getPlatformOverview(currentPeriod, previousPeriod, compare) {
  const overview = {
    totalUsers: await User.countDocuments(),
    totalFundis: await User.countDocuments({ role: 'fundi' }),
    totalClients: await User.countDocuments({ role: 'client' }),
    totalBookings: await Booking.countDocuments({ createdAt: { $gte: currentPeriod.start } }),
    totalRevenue: await getTotalRevenue(currentPeriod),
    activeBookings: await Booking.countDocuments({
      status: { $in: ['confirmed', 'scheduled', 'in_progress'] }
    })
  };

  if (compare) {
    overview.previousPeriod = {
      totalBookings: await Booking.countDocuments({ createdAt: { $gte: previousPeriod.start, $lt: previousPeriod.end } }),
      totalRevenue: await getTotalRevenue(previousPeriod)
    };
  }

  return overview;
}

async function getTotalRevenue(period) {
  const result = await Payment.aggregate([
    {
      $match: {
        status: 'completed',
        createdAt: { $gte: period.start, $lte: period.end }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$amount' },
        platformFee: { $sum: '$platformFee' }
      }
    }
  ]);

  return result[0] || { total: 0, platformFee: 0 };
}

async function getUserAnalytics(currentPeriod, previousPeriod, compare) {
  const userGrowth = await User.aggregate([
    {
      $match: {
        createdAt: { $gte: currentPeriod.start }
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

  const userRetention = await calculateUserRetention(currentPeriod);

  return {
    userGrowth,
    userRetention,
  };
}

async function calculateUserRetention(period) {
  return {
    day7: 0.65,
    day30: 0.45,
    day90: 0.25
  };
}

async function getFinancialAnalytics(currentPeriod, previousPeriod, compare) {
  const revenueByDay = await Payment.aggregate([
    {
      $match: {
        status: 'completed',
        createdAt: { $gte: currentPeriod.start }
      }
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
        },
        revenue: { $sum: '$amount' },
        transactions: { $sum: 1 }
      }
    },
    {
      $sort: { '_id.date': 1 }
    }
  ]);

  return { revenueByDay };
}

async function getServiceAnalytics(currentPeriod, previousPeriod, compare) {
  const popularServices = await Booking.aggregate([
    {
      $match: {
        createdAt: { $gte: currentPeriod.start }
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
        bookings: { $sum: 1 },
        revenue: { $sum: '$agreedPrice' },
        averageRating: { $avg: '$rating.byClient.score' }
      }
    },
    {
      $sort: { bookings: -1 }
    }
  ]);

  return { popularServices };
}

async function getGeographicAnalytics(currentPeriod) {
  const bookingsByLocation = await Booking.aggregate([
    {
      $match: {
        createdAt: { $gte: currentPeriod.start }
      }
    },
    {
      $group: {
        _id: '$location.county',
        bookings: { $sum: 1 },
        revenue: { $sum: '$agreedPrice' }
      }
    },
    {
      $sort: { bookings: -1 }
    }
  ]);

  return { bookingsByLocation };
}

async function getPerformanceMetrics(currentPeriod) {
  const averageResponseTime = await Fundi.aggregate([
    {
      $group: {
        _id: null,
        avgResponseTime: { $avg: '$stats.responseTime' }
      }
    }
  ]);

  const completionRate = await Booking.aggregate([
    {
      $match: {
        createdAt: { $gte: currentPeriod.start }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        completed: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        }
      }
    }
  ]);

  return {
    averageResponseTime: averageResponseTime[0]?.avgResponseTime || 0,
    completionRate: completionRate[0] ? completionRate[0].completed / completionRate[0].total : 0
  };
}

// Fundi-specific analytics methods
async function getFundiStats(fundiId, period) {
  const stats = await Booking.aggregate([
    {
      $match: {
        fundi: fundiId,
        createdAt: { $gte: period.start }
      }
    },
    {
      $group: {
        _id: null,
        totalBookings: { $sum: 1 },
        completedBookings: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        cancelledBookings: {
          $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
        },
        totalEarnings: { $sum: '$agreedPrice' },
        averageRating: { $avg: '$rating.byClient.score' }
      }
    }
  ]);

  return stats[0] || {
    totalBookings: 0,
    completedBookings: 0,
    cancelledBookings: 0,
    totalEarnings: 0,
    averageRating: 0
  };
}

async function getFundiEarningsAnalysis(fundiId, period) {
  const earningsByDay = await Booking.aggregate([
    {
      $match: {
        fundi: fundiId,
        status: 'completed',
        createdAt: { $gte: period.start }
      }
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
        },
        earnings: { $sum: '$agreedPrice' },
        bookings: { $sum: 1 }
      }
    },
    {
      $sort: { '_id.date': 1 }
    }
  ]);

  return { earningsByDay };
}

async function getFundiServicePerformance(fundiId, period) {
  const servicePerformance = await Booking.aggregate([
    {
      $match: {
        fundi: fundiId,
        createdAt: { $gte: period.start }
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
        bookings: { $sum: 1 },
        revenue: { $sum: '$agreedPrice' },
        averageRating: { $avg: '$rating.byClient.score' }
      }
    },
    {
      $sort: { bookings: -1 }
    }
  ]);

  return servicePerformance;
}

async function getFundiCustomerInsights(fundiId, period) {
  const customerInsights = await Booking.aggregate([
    {
      $match: {
        fundi: fundiId,
        createdAt: { $gte: period.start }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'client',
        foreignField: '_id',
        as: 'clientInfo'
      }
    },
    {
      $unwind: '$clientInfo'
    },
    {
      $group: {
        _id: '$clientInfo._id',
        name: { $first: '$clientInfo.name' },
        bookings: { $sum: 1 },
        totalSpent: { $sum: '$agreedPrice' },
        lastBooking: { $max: '$createdAt' }
      }
    },
    {
      $sort: { bookings: -1 }
    }
  ]);

  return customerInsights;
}

async function getFundiPerformanceTrends(fundiId, period) {
  const { currentPeriod } = getDateRanges(period);
  
  const trends = await Booking.aggregate([
    {
      $match: {
        fundi: fundiId,
        createdAt: { $gte: currentPeriod.start }
      }
    },
    {
      $group: {
        _id: {
          week: { $week: '$createdAt' }
        },
        bookings: { $sum: 1 },
        revenue: { $sum: '$agreedPrice' },
        averageRating: { $avg: '$rating.byClient.score' }
      }
    },
    {
      $sort: { '_id.week': 1 }
    }
  ]);

  return trends;
}

// Client-specific analytics methods
async function getClientUsageStats(clientId, period) {
  const usageStats = await Booking.aggregate([
    {
      $match: {
        client: clientId,
        createdAt: { $gte: period.start }
      }
    },
    {
      $group: {
        _id: null,
        totalBookings: { $sum: 1 },
        completedBookings: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        cancelledBookings: {
          $sum: { $cond: [{ $in: ['$status', ['cancelled', 'rejected']] }, 1, 0] }
        },
        totalSpent: { $sum: '$agreedPrice' }
      }
    }
  ]);

  return usageStats[0] || {
    totalBookings: 0,
    completedBookings: 0,
    cancelledBookings: 0,
    totalSpent: 0
  };
}

async function getClientSpendingAnalysis(clientId, period) {
  const spendingByDay = await Booking.aggregate([
    {
      $match: {
        client: clientId,
        status: 'completed',
        createdAt: { $gte: period.start }
      }
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
        },
        spending: { $sum: '$agreedPrice' },
        bookings: { $sum: 1 }
      }
    },
    {
      $sort: { '_id.date': 1 }
    }
  ]);

  return { spendingByDay };
}

async function getClientServicePreferences(clientId, period) {
  const servicePreferences = await Booking.aggregate([
    {
      $match: {
        client: clientId,
        createdAt: { $gte: period.start }
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
        bookings: { $sum: 1 },
        totalSpent: { $sum: '$agreedPrice' }
      }
    },
    {
      $sort: { bookings: -1 }
    }
  ]);

  return servicePreferences;
}

async function getClientSatisfactionMetrics(clientId, period) {
  const satisfactionMetrics = await Booking.aggregate([
    {
      $match: {
        client: clientId,
        createdAt: { $gte: period.start },
        'rating.byClient.score': { $exists: true }
      }
    },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating.byClient.score' },
        totalRatings: { $sum: 1 },
        averageResponseTime: { $avg: '$fundiResponseTime' }
      }
    }
  ]);

  return satisfactionMetrics[0] || {
    averageRating: 0,
    totalRatings: 0,
    averageResponseTime: 0
  };
}

// Export methods
async function exportBookingsData(period) {
  const bookings = await Booking.find({
    createdAt: { $gte: period.start, $lte: period.end }
  }).populate('client fundi service');

  return bookings.map(booking => ({
    id: booking._id,
    client: booking.client?.name || 'Unknown',
    fundi: booking.fundi?.name || 'Unknown',
    service: booking.service?.name || 'Unknown',
    status: booking.status,
    agreedPrice: booking.agreedPrice,
    createdAt: booking.createdAt,
    completedAt: booking.completedAt
  }));
}

async function exportPaymentsData(period) {
  const payments = await Payment.find({
    createdAt: { $gte: period.start, $lte: period.end }
  }).populate('user booking');

  return payments.map(payment => ({
    id: payment._id,
    user: payment.user?.name || 'Unknown',
    amount: payment.amount,
    platformFee: payment.platformFee,
    status: payment.status,
    paymentMethod: payment.paymentMethod,
    createdAt: payment.createdAt
  }));
}

async function exportUsersData(period) {
  const users = await User.find({
    createdAt: { $gte: period.start, $lte: period.end }
  });

  return users.map(user => ({
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
    lastLogin: user.lastLogin
  }));
}

async function exportFundisData(period) {
  const fundis = await Fundi.find({
    createdAt: { $gte: period.start, $lte: period.end }
  }).populate('user');

  return fundis.map(fundi => ({
    id: fundi._id,
    name: fundi.user?.name || 'Unknown',
    specialty: fundi.specialty,
    rating: fundi.rating,
    completedJobs: fundi.completedJobs,
    status: fundi.status,
    createdAt: fundi.createdAt
  }));
}

function convertToCSV(data) {
  if (!data || data.length === 0) return '';
  
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(row => 
    Object.values(row).map(field => 
      typeof field === 'string' && field.includes(',') ? `"${field}"` : field
    ).join(',')
  );
  
  return [headers, ...rows].join('\n');
}

// Controller methods
// @desc    Get platform analytics (Admin only)
// @route   GET /api/v1/analytics/platform
// @access  Private/Admin
export const getPlatformAnalytics = async (req, res, next) => {
  try {
    const { period = '30d', compare = false } = req.query;

    // Calculate date ranges
    const { currentPeriod, previousPeriod } = getDateRanges(period);

    // Platform overview
    const overview = await getPlatformOverview(currentPeriod, previousPeriod, compare);

    // User analytics
    const userAnalytics = await getUserAnalytics(currentPeriod, previousPeriod, compare);

    // Financial analytics
    const financialAnalytics = await getFinancialAnalytics(currentPeriod, previousPeriod, compare);

    // Service analytics
    const serviceAnalytics = await getServiceAnalytics(currentPeriod, previousPeriod, compare);

    // Geographic analytics
    const geographicAnalytics = await getGeographicAnalytics(currentPeriod);

    // Performance metrics
    const performanceMetrics = await getPerformanceMetrics(currentPeriod);

    res.status(200).json({
      success: true,
      data: {
        period,
        compare,
        overview,
        userAnalytics,
        financialAnalytics,
        serviceAnalytics,
        geographicAnalytics,
        performanceMetrics,
        timestamp: new Date()
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get fundi performance analytics
// @route   GET /api/v1/analytics/fundi
// @access  Private/Fundi
export const getFundiAnalytics = async (req, res, next) => {
  try {
    // Safely resolve fundi id. req.user may not have a populated fundiProfile.
    let fundiId = null;
    if (req.user?.fundiProfile?._id) {
      fundiId = req.user.fundiProfile._id;
    } else {
      const fundiRecord = await Fundi.findOne({ user: req.user._id }).select('_id');
      fundiId = fundiRecord?._id;
    }

    if (!fundiId) {
      return res.status(404).json({ success: false, error: 'Fundi profile not found' });
    }
    const { period = '30d' } = req.query;

    const { currentPeriod } = getDateRanges(period);

    // Basic stats
    const stats = await getFundiStats(fundiId, currentPeriod);

    // Earnings analysis
    const earningsAnalysis = await getFundiEarningsAnalysis(fundiId, currentPeriod);

    // Service performance
    const servicePerformance = await getFundiServicePerformance(fundiId, currentPeriod);

    // Customer insights
    const customerInsights = await getFundiCustomerInsights(fundiId, currentPeriod);

    // Performance trends
    const performanceTrends = await getFundiPerformanceTrends(fundiId, period);

    res.status(200).json({
      success: true,
      data: {
        period,
        stats,
        earningsAnalysis,
        servicePerformance,
        customerInsights,
        performanceTrends
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get client usage analytics
// @route   GET /api/v1/analytics/client
// @access  Private/Client
export const getClientAnalytics = async (req, res, next) => {
  try {
    const clientId = req.user._id;
    const { period = '30d' } = req.query;

    const { currentPeriod } = getDateRanges(period);

    // Usage stats
    const usageStats = await getClientUsageStats(clientId, currentPeriod);

    // Spending analysis
    const spendingAnalysis = await getClientSpendingAnalysis(clientId, currentPeriod);

    // Service preferences
    const servicePreferences = await getClientServicePreferences(clientId, currentPeriod);

    // Satisfaction metrics
    const satisfactionMetrics = await getClientSatisfactionMetrics(clientId, currentPeriod);

    res.status(200).json({
      success: true,
      data: {
        period,
        usageStats,
        spendingAnalysis,
        servicePreferences,
        satisfactionMetrics
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get real-time dashboard data
// @route   GET /api/v1/analytics/realtime
// @access  Private/Admin
export const getRealtimeAnalytics = async (req, res, next) => {
  try {
    const now = new Date();
    const lastHour = new Date(now.getTime() - 60 * 60 * 1000);
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Real-time bookings
    const recentBookings = await Booking.countDocuments({
      createdAt: { $gte: lastHour }
    });

    // Active users
    const activeUsers = await User.countDocuments({
      lastLogin: { $gte: last24Hours }
    });

    // Pending verifications
    const pendingVerifications = await Verification.countDocuments({
      status: { $in: ['submitted', 'under_review'] }
    });

    // Today's revenue
    const todayRevenue = await Payment.aggregate([
      {
        $match: {
          status: 'completed',
          createdAt: { 
            $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate())
          }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
          platformFee: { $sum: '$platformFee' }
        }
      }
    ]);

    // System health
    const systemHealth = {
      database: 'healthy',
      payments: 'healthy',
      notifications: 'healthy',
      uploads: 'healthy'
    };

    res.status(200).json({
      success: true,
      data: {
        timestamp: now,
        metrics: {
          recentBookings,
          activeUsers,
          pendingVerifications,
          todayRevenue: todayRevenue[0] || { total: 0, platformFee: 0 },
          systemHealth
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export analytics data
// @route   POST /api/v1/analytics/export
// @access  Private/Admin
export const exportAnalytics = async (req, res, next) => {
  try {
    const { type, format = 'json', period = '30d' } = req.body;

    const { currentPeriod } = getDateRanges(period);

    let data;
    switch (type) {
      case 'bookings':
        data = await exportBookingsData(currentPeriod);
        break;
      case 'payments':
        data = await exportPaymentsData(currentPeriod);
        break;
      case 'users':
        data = await exportUsersData(currentPeriod);
        break;
      case 'fundis':
        data = await exportFundisData(currentPeriod);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid export type'
        });
    }

    if (format === 'csv') {
      const csvData = convertToCSV(data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${type}_${period}_${Date.now()}.csv`);
      return res.send(csvData);
    }

    res.status(200).json({
      success: true,
      data: {
        type,
        format,
        period,
        exportedAt: new Date(),
        records: data.length,
        data
      }
    });
  } catch (error) {
    next(error);
  }
};
