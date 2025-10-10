import User from '../models/User.js';
import Booking from '../models/Booking.js';
import Payment from '../models/Payment.js';
import Fundi from '../models/Fundi.js';
import Client from '../models/Client.js';
import logger from '../middleware/logger.js';

export const getRevenueAnalytics = async (req, res, next) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;

    if (!['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized'
      });
    }

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const payments = await Payment.find({
      status: 'completed',
      ...(Object.keys(dateFilter).length > 0 && { completedAt: dateFilter })
    });

    const totalRevenue = payments.reduce((sum, p) => sum + (p.platformFee || 0), 0);
    const totalTransactions = payments.length;
    const averageTransaction = totalRevenue / totalTransactions || 0;

    const groupedData = {};
    payments.forEach(payment => {
      const date = new Date(payment.completedAt);
      let key;

      switch (groupBy) {
        case 'hour':
          key = `${date.toISOString().split('T')[0]} ${date.getHours()}:00`;
          break;
        case 'day':
          key = date.toISOString().split('T')[0];
          break;
        case 'week':
          const weekNum = Math.ceil(date.getDate() / 7);
          key = `${date.getFullYear()}-W${weekNum}`;
          break;
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        default:
          key = date.toISOString().split('T')[0];
      }

      if (!groupedData[key]) {
        groupedData[key] = { revenue: 0, transactions: 0 };
      }
      groupedData[key].revenue += payment.platformFee || 0;
      groupedData[key].transactions += 1;
    });

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalRevenue,
          totalTransactions,
          averageTransaction
        },
        timeSeriesData: Object.entries(groupedData).map(([date, data]) => ({
          date,
          ...data
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getUserGrowthAnalytics = async (req, res, next) => {
  try {
    const { startDate, endDate, userType } = req.query;

    if (!['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized'
      });
    }

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const query = {};
    if (userType && userType !== 'all') {
      query.role = userType;
    }
    if (Object.keys(dateFilter).length > 0) {
      query.createdAt = dateFilter;
    }

    const users = await User.find(query).select('createdAt role isActive');

    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.isActive).length;
    const inactiveUsers = totalUsers - activeUsers;

    const byRole = {};
    users.forEach(user => {
      byRole[user.role] = (byRole[user.role] || 0) + 1;
    });

    const byMonth = {};
    users.forEach(user => {
      const month = user.createdAt.toISOString().substring(0, 7);
      byMonth[month] = (byMonth[month] || 0) + 1;
    });

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalUsers,
          activeUsers,
          inactiveUsers,
          activationRate: (activeUsers / totalUsers * 100).toFixed(2)
        },
        byRole,
        growthTrend: Object.entries(byMonth).map(([month, count]) => ({
          month,
          newUsers: count
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getBookingTrends = async (req, res, next) => {
  try {
    const { startDate, endDate, status } = req.query;

    if (!['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized'
      });
    }

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const query = {};
    if (status) query.status = status;
    if (Object.keys(dateFilter).length > 0) {
      query.createdAt = dateFilter;
    }

    const bookings = await Booking.find(query);

    const totalBookings = bookings.length;
    const byStatus = {};
    const byServiceType = {};

    bookings.forEach(booking => {
      byStatus[booking.status] = (byStatus[booking.status] || 0) + 1;
    });

    const completedBookings = bookings.filter(b => b.status === 'completed');
    const averagePrice = completedBookings.reduce((sum, b) => sum + b.agreedPrice, 0) / completedBookings.length || 0;

    const completionRate = (completedBookings.length / totalBookings * 100).toFixed(2);
    const cancellationRate = ((byStatus.cancelled || 0) / totalBookings * 100).toFixed(2);

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalBookings,
          completedBookings: completedBookings.length,
          completionRate,
          cancellationRate,
          averagePrice
        },
        byStatus,
        trends: {
          peakHours: calculatePeakHours(bookings),
          peakDays: calculatePeakDays(bookings)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getFundiPerformanceAnalytics = async (req, res, next) => {
  try {
    const { limit = 10, sortBy = 'rating' } = req.query;

    if (!['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized'
      });
    }

    const fundis = await Fundi.find({ 'verification.overallStatus': 'verified' })
      .populate('user', 'firstName lastName email phone')
      .sort({ [`stats.${sortBy}`]: -1 })
      .limit(parseInt(limit));

    const topPerformers = fundis.map(fundi => ({
      id: fundi._id,
      user: fundi.user,
      profession: fundi.profession,
      stats: fundi.stats,
      rating: fundi.stats.rating,
      completedJobs: fundi.stats.completedJobs,
      earnings: fundi.stats.totalEarnings,
      responseTime: fundi.stats.responseTime
    }));

    const avgRating = fundis.reduce((sum, f) => sum + f.stats.rating, 0) / fundis.length || 0;
    const avgCompletionRate = fundis.reduce((sum, f) =>
      sum + (f.stats.completedJobs / (f.stats.totalJobs || 1)), 0) / fundis.length * 100 || 0;

    res.status(200).json({
      success: true,
      data: {
        topPerformers,
        averages: {
          rating: avgRating.toFixed(2),
          completionRate: avgCompletionRate.toFixed(2)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getComprehensiveDashboard = async (req, res, next) => {
  try {
    if (!['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized'
      });
    }

    const [
      totalUsers,
      totalFundis,
      totalClients,
      totalBookings,
      completedBookings,
      activeBookings,
      totalRevenue
    ] = await Promise.all([
      User.countDocuments(),
      Fundi.countDocuments({ 'verification.overallStatus': 'verified' }),
      Client.countDocuments(),
      Booking.countDocuments(),
      Booking.countDocuments({ status: 'completed' }),
      Booking.countDocuments({ status: { $in: ['confirmed', 'scheduled', 'in_progress'] } }),
      Payment.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$platformFee' } } }
      ])
    ]);

    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [
      newUsersLast30Days,
      newBookingsLast30Days,
      revenueLast30Days
    ] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: last30Days } }),
      Booking.countDocuments({ createdAt: { $gte: last30Days } }),
      Payment.aggregate([
        { $match: { status: 'completed', completedAt: { $gte: last30Days } } },
        { $group: { _id: null, total: { $sum: '$platformFee' } } }
      ])
    ]);

    res.status(200).json({
      success: true,
      data: {
        overview: {
          users: {
            total: totalUsers,
            fundis: totalFundis,
            clients: totalClients,
            newLast30Days: newUsersLast30Days
          },
          bookings: {
            total: totalBookings,
            completed: completedBookings,
            active: activeBookings,
            newLast30Days: newBookingsLast30Days,
            completionRate: ((completedBookings / totalBookings) * 100).toFixed(2)
          },
          revenue: {
            total: totalRevenue[0]?.total || 0,
            last30Days: revenueLast30Days[0]?.total || 0,
            averagePerBooking: ((totalRevenue[0]?.total || 0) / completedBookings).toFixed(2)
          }
        },
        timestamp: new Date()
      }
    });
  } catch (error) {
    next(error);
  }
};

function calculatePeakHours(bookings) {
  const hours = {};
  bookings.forEach(booking => {
    if (booking.actualStartTime) {
      const hour = new Date(booking.actualStartTime).getHours();
      hours[hour] = (hours[hour] || 0) + 1;
    }
  });

  return Object.entries(hours)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([hour, count]) => ({ hour: `${hour}:00`, count }));
}

function calculatePeakDays(bookings) {
  const days = {};
  bookings.forEach(booking => {
    const day = new Date(booking.createdAt).toLocaleDateString('en-US', { weekday: 'long' });
    days[day] = (days[day] || 0) + 1;
  });

  return Object.entries(days)
    .sort((a, b) => b[1] - a[1])
    .map(([day, count]) => ({ day, count }));
}
