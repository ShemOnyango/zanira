import Referral from '../models/Referral.js';
import User from '../models/User.js';
import Wallet from '../models/Wallet.js';
import Booking from '../models/Booking.js';
import logger from '../middleware/logger.js';

const REFERRAL_REWARDS = {
  referrer: {
    type: 'cash',
    amount: 500
  },
  referred: {
    type: 'discount',
    amount: 200
  },
  minimumBookings: 1,
  minimumSpend: 1000
};

export const createReferral = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const referralCode = await Referral.generateReferralCode();

    const referral = await Referral.create({
      referrer: userId,
      referralCode,
      status: 'pending',
      rewards: {
        referrerReward: {
          amount: REFERRAL_REWARDS.referrer.amount,
          type: REFERRAL_REWARDS.referrer.type
        },
        referredReward: {
          amount: REFERRAL_REWARDS.referred.amount,
          type: REFERRAL_REWARDS.referred.type
        }
      },
      conditions: {
        minimumBookings: REFERRAL_REWARDS.minimumBookings,
        minimumSpend: REFERRAL_REWARDS.minimumSpend
      },
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
    });

    res.status(201).json({
      success: true,
      message: 'Referral code created successfully',
      data: { referral }
    });

    logger.info(`Referral created: ${referralCode} by user ${userId}`);
  } catch (error) {
    next(error);
  }
};

export const getUserReferrals = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const referrals = await Referral.find({ referrer: userId })
      .populate('referredUser', 'firstName lastName email')
      .sort('-createdAt');

    const stats = {
      total: referrals.length,
      pending: referrals.filter(r => r.status === 'pending').length,
      completed: referrals.filter(r => r.status === 'completed').length,
      totalEarned: referrals
        .filter(r => r.status === 'completed' && r.rewards.referrerReward.claimed)
        .reduce((sum, r) => sum + r.rewards.referrerReward.amount, 0)
    };

    res.status(200).json({
      success: true,
      data: { referrals, stats }
    });
  } catch (error) {
    next(error);
  }
};

export const applyReferralCode = async (req, res, next) => {
  try {
    const { referralCode } = req.body;
    const userId = req.user._id;

    const referral = await Referral.findOne({ referralCode });
    if (!referral) {
      return res.status(404).json({
        success: false,
        error: 'Invalid referral code'
      });
    }

    if (referral.referrer.toString() === userId.toString()) {
      return res.status(400).json({
        success: false,
        error: 'Cannot use your own referral code'
      });
    }

    if (referral.referredUser) {
      return res.status(400).json({
        success: false,
        error: 'Referral code already used'
      });
    }

    if (referral.isExpired) {
      return res.status(400).json({
        success: false,
        error: 'Referral code has expired'
      });
    }

    const existingReferral = await Referral.findOne({
      referredUser: userId,
      status: { $in: ['pending', 'completed'] }
    });

    if (existingReferral) {
      return res.status(400).json({
        success: false,
        error: 'You have already used a referral code'
      });
    }

    referral.referredUser = userId;
    referral.registeredAt = new Date();
    await referral.save();

    res.status(200).json({
      success: true,
      message: 'Referral code applied successfully',
      data: {
        referral,
        reward: referral.rewards.referredReward
      }
    });

    logger.info(`Referral code applied: ${referralCode} by user ${userId}`);
  } catch (error) {
    next(error);
  }
};

export const updateReferralProgress = async (req, res, next) => {
  try {
    const { referralId, bookingCompleted, amountSpent } = req.body;

    const referral = await Referral.findById(referralId);
    if (!referral) {
      return res.status(404).json({
        success: false,
        error: 'Referral not found'
      });
    }

    if (bookingCompleted) {
      referral.conditions.bookingsCompleted += 1;
    }

    if (amountSpent) {
      referral.conditions.totalSpent += amountSpent;
    }

    const completed = await referral.checkCompletion();

    if (completed && !referral.rewards.referrerReward.claimed) {
      await autoClaimReferralReward(referral);
    }

    await referral.save();

    res.status(200).json({
      success: true,
      message: 'Referral progress updated',
      data: { referral, completed }
    });
  } catch (error) {
    next(error);
  }
};

export const claimReferralReward = async (req, res, next) => {
  try {
    const { referralId, type } = req.body;
    const userId = req.user._id;

    const referral = await Referral.findById(referralId);
    if (!referral) {
      return res.status(404).json({
        success: false,
        error: 'Referral not found'
      });
    }

    if (referral.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Referral not yet completed'
      });
    }

    let reward;
    let isReferrer = false;

    if (type === 'referrer' && referral.referrer.toString() === userId.toString()) {
      reward = referral.rewards.referrerReward;
      isReferrer = true;
    } else if (type === 'referred' && referral.referredUser.toString() === userId.toString()) {
      reward = referral.rewards.referredReward;
    } else {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to claim this reward'
      });
    }

    if (reward.claimed) {
      return res.status(400).json({
        success: false,
        error: 'Reward already claimed'
      });
    }

    if (reward.type === 'cash') {
      let wallet = await Wallet.findOne({ user: userId });
      if (!wallet) {
        wallet = await Wallet.create({
          user: userId,
          balance: { available: 0, pending: 0, locked: 0 },
          status: 'active'
        });
      }

      await wallet.addTransaction({
        type: 'bonus',
        amount: reward.amount,
        description: `Referral reward - ${isReferrer ? 'Referrer' : 'Referred user'}`,
        reference: referralId,
        relatedEntity: {
          entityType: 'referral',
          entityId: referralId
        }
      });
    }

    reward.claimed = true;
    reward.claimedAt = new Date();
    await referral.save();

    res.status(200).json({
      success: true,
      message: 'Reward claimed successfully',
      data: { reward, referral }
    });

    logger.info(`Referral reward claimed: ${referralId} by user ${userId}`);
  } catch (error) {
    next(error);
  }
};

async function autoClaimReferralReward(referral) {
  try {
    if (referral.rewards.referrerReward.type === 'cash') {
      let wallet = await Wallet.findOne({ user: referral.referrer });
      if (!wallet) {
        wallet = await Wallet.create({
          user: referral.referrer,
          balance: { available: 0, pending: 0, locked: 0 },
          status: 'active'
        });
      }

      await wallet.addTransaction({
        type: 'bonus',
        amount: referral.rewards.referrerReward.amount,
        description: 'Referral reward - Auto claimed',
        reference: referral._id.toString(),
        relatedEntity: {
          entityType: 'referral',
          entityId: referral._id
        }
      });

      referral.rewards.referrerReward.claimed = true;
      referral.rewards.referrerReward.claimedAt = new Date();
      await referral.save();

      logger.info(`Auto-claimed referral reward for referrer: ${referral.referrer}`);
    }
  } catch (error) {
    logger.error('Error auto-claiming referral reward:', error);
  }
}

export const trackReferralFromBooking = async (bookingId) => {
  try {
    const booking = await Booking.findById(bookingId).populate('client');
    if (!booking || booking.status !== 'completed') return;

    const referral = await Referral.findOne({
      referredUser: booking.client,
      status: 'pending'
    });

    if (!referral) return;

    referral.conditions.bookingsCompleted += 1;
    referral.conditions.totalSpent += booking.agreedPrice;

    const completed = await referral.checkCompletion();

    if (completed) {
      await autoClaimReferralReward(referral);
    }

    await referral.save();

    logger.info(`Referral progress updated from booking: ${bookingId}`);
  } catch (error) {
    logger.error('Error tracking referral from booking:', error);
  }
};
