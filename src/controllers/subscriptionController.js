import Subscription from '../models/Subscription.js';
//import User from '../models/User.js';
//import Payment from '../models/Payment.js';
import AuditLog from '../models/AuditLog.js';
import mpesaService from '../config/mpesa.js';
import logger from '../middleware/logger.js';

const subscriptionPlans = {
  fundi: {
    basic: {
      name: 'basic',
      tier: 'free',
      price: 0,
      billingCycle: 'monthly',
      features: {
        maxJobsPerMonth: 5,
        maxActiveJobs: 2,
        commissionRate: 15,
        priorityListing: false,
        advancedAnalytics: false,
        customerSupport: 'basic',
        videoConsultations: false,
        bulkOperations: false,
        apiAccess: false
      }
    },
    professional: {
      name: 'professional',
      tier: 'paid',
      price: 1500,
      billingCycle: 'monthly',
      features: {
        maxJobsPerMonth: 20,
        maxActiveJobs: 5,
        commissionRate: 10,
        priorityListing: true,
        advancedAnalytics: true,
        customerSupport: 'priority',
        videoConsultations: true,
        bulkOperations: false,
        apiAccess: false
      }
    },
    premium: {
      name: 'premium',
      tier: 'paid',
      price: 3000,
      billingCycle: 'monthly',
      features: {
        maxJobsPerMonth: -1,
        maxActiveJobs: -1,
        commissionRate: 7,
        priorityListing: true,
        advancedAnalytics: true,
        customerSupport: '24/7',
        videoConsultations: true,
        bulkOperations: true,
        apiAccess: true,
        customBranding: true
      }
    }
  },
  client: {
    basic: {
      name: 'basic',
      tier: 'free',
      price: 0,
      billingCycle: 'monthly',
      features: {
        maxJobsPerMonth: 10,
        maxActiveJobs: 3,
        commissionRate: 0,
        priorityListing: false,
        advancedAnalytics: false,
        customerSupport: 'basic',
        videoConsultations: false
      }
    },
    premium: {
      name: 'premium',
      tier: 'paid',
      price: 500,
      billingCycle: 'monthly',
      features: {
        maxJobsPerMonth: -1,
        maxActiveJobs: -1,
        commissionRate: 0,
        priorityListing: true,
        advancedAnalytics: true,
        customerSupport: 'priority',
        videoConsultations: true,
        dedicatedAccountManager: false
      }
    },
    enterprise: {
      name: 'enterprise',
      tier: 'paid',
      price: 5000,
      billingCycle: 'monthly',
      features: {
        maxJobsPerMonth: -1,
        maxActiveJobs: -1,
        commissionRate: 0,
        priorityListing: true,
        advancedAnalytics: true,
        customerSupport: '24/7',
        videoConsultations: true,
        bulkOperations: true,
        apiAccess: true,
        dedicatedAccountManager: true
      }
    }
  }
};

export const getAvailablePlans = async (req, res, next) => {
  try {
    const { userType } = req.query;

    if (!userType || !['fundi', 'client'].includes(userType)) {
      return res.status(400).json({
        success: false,
        error: 'Valid userType (fundi or client) is required'
      });
    }

    const plans = subscriptionPlans[userType];

    res.status(200).json({
      success: true,
      data: { plans }
    });
  } catch (error) {
    next(error);
  }
};

export const createSubscription = async (req, res, next) => {
  try {
    const { planName, billingCycle = 'monthly' } = req.body;
    const userId = req.user._id;
    const userType = req.user.role;

    if (!['fundi', 'client', 'shop_owner'].includes(userType)) {
      return res.status(400).json({
        success: false,
        error: 'Only fundis, clients, and shop owners can create subscriptions'
      });
    }

    const existingSubscription = await Subscription.findOne({
      user: userId,
      status: { $in: ['active', 'trial'] }
    });

    if (existingSubscription) {
      return res.status(400).json({
        success: false,
        error: 'Active subscription already exists'
      });
    }

    const planConfig = subscriptionPlans[userType]?.[planName];
    if (!planConfig) {
      return res.status(400).json({
        success: false,
        error: 'Invalid plan'
      });
    }

    const now = new Date();
  const trialDays = 14;

    const subscription = await Subscription.create({
      user: userId,
      userType,
      plan: {
        name: planName,
        tier: planConfig.tier,
        price: planConfig.price,
        currency: 'KES',
        billingCycle
      },
      features: planConfig.features,
      status: planConfig.tier === 'free' ? 'active' : 'trial',
      billing: {
        startDate: now,
        endDate: new Date(now.getTime() + (planConfig.tier === 'free' ? 365 : trialDays) * 24 * 60 * 60 * 1000),
        nextBillingDate: planConfig.tier === 'paid' ? new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000) : null,
        trialEndsAt: planConfig.tier === 'paid' ? new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000) : null,
        autoRenew: true
      },
      usage: {
        lastResetDate: now
      },
      history: [{
        action: 'created',
        toPlan: planName,
        timestamp: now,
        performedBy: userId
      }]
    });

    await AuditLog.logAction({
      userId,
      userRole: userType,
      userEmail: req.user.email,
      action: 'subscription_created',
      targetEntity: {
        entityType: 'Subscription',
        entityId: subscription._id,
        entityDescription: `${userType} ${planName} subscription`
      },
      severity: 'medium',
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(201).json({
      success: true,
      message: 'Subscription created successfully',
      data: { subscription }
    });

    logger.info(`Subscription created: ${subscription._id} for user ${userId}`);
  } catch (error) {
    next(error);
  }
};

export const getUserSubscription = async (req, res, next) => {
  try {
    const userId = req.params.userId || req.user._id;

    if (userId !== req.user._id.toString() && !['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized'
      });
    }

    const subscription = await Subscription.findOne({ user: userId })
      .populate('user', 'firstName lastName email')
      .sort('-createdAt');

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'No subscription found'
      });
    }

    res.status(200).json({
      success: true,
      data: { subscription }
    });
  } catch (error) {
    next(error);
  }
};

export const upgradeSubscription = async (req, res, next) => {
  try {
    const { planName } = req.body;
    const userId = req.user._id;
    const userType = req.user.role;

    const subscription = await Subscription.findOne({
      user: userId,
      status: { $in: ['active', 'trial'] }
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'No active subscription found'
      });
    }

    const newPlanConfig = subscriptionPlans[userType]?.[planName];
    if (!newPlanConfig) {
      return res.status(400).json({
        success: false,
        error: 'Invalid plan'
      });
    }

    if (newPlanConfig.price <= subscription.plan.price) {
      return res.status(400).json({
        success: false,
        error: 'New plan must be an upgrade'
      });
    }

    const oldPlan = subscription.plan.name;

    subscription.plan = {
      name: planName,
      tier: newPlanConfig.tier,
      price: newPlanConfig.price,
      currency: 'KES',
      billingCycle: subscription.plan.billingCycle
    };
    subscription.features = newPlanConfig.features;

    subscription.history.push({
      action: 'upgraded',
      fromPlan: oldPlan,
      toPlan: planName,
      timestamp: new Date(),
      performedBy: userId
    });

    await subscription.save();

    await AuditLog.logAction({
      userId,
      userRole: userType,
      userEmail: req.user.email,
      action: 'subscription_upgraded',
      targetEntity: {
        entityType: 'Subscription',
        entityId: subscription._id
      },
      metadata: { fromPlan: oldPlan, toPlan: planName },
      severity: 'medium',
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(200).json({
      success: true,
      message: 'Subscription upgraded successfully',
      data: { subscription }
    });

    logger.info(`Subscription upgraded: ${subscription._id} from ${oldPlan} to ${planName}`);
  } catch (error) {
    next(error);
  }
};

export const cancelSubscription = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const userId = req.user._id;

    const subscription = await Subscription.findOne({
      user: userId,
      status: { $in: ['active', 'trial'] }
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'No active subscription found'
      });
    }

    subscription.status = 'cancelled';
    subscription.billing.cancelledAt = new Date();
    subscription.billing.cancelReason = reason;
    subscription.billing.autoRenew = false;

    subscription.history.push({
      action: 'cancelled',
      timestamp: new Date(),
      reason,
      performedBy: userId
    });

    await subscription.save();

    await AuditLog.logAction({
      userId,
      userRole: req.user.role,
      userEmail: req.user.email,
      action: 'subscription_cancelled',
      targetEntity: {
        entityType: 'Subscription',
        entityId: subscription._id
      },
      metadata: { reason },
      severity: 'medium',
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(200).json({
      success: true,
      message: 'Subscription cancelled successfully',
      data: { subscription }
    });

    logger.info(`Subscription cancelled: ${subscription._id}`);
  } catch (error) {
    next(error);
  }
};

export const processSubscriptionPayment = async (req, res, next) => {
  try {
    const { phoneNumber } = req.body;
    const userId = req.user._id;

    const subscription = await Subscription.findOne({
      user: userId,
      status: { $in: ['active', 'trial'] }
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'No active subscription found'
      });
    }

    if (subscription.plan.tier === 'free') {
      return res.status(400).json({
        success: false,
        error: 'Free plans do not require payment'
      });
    }

    const sanitizedPhone = mpesaService.sanitizePhoneNumber(phoneNumber);
    const paymentReference = mpesaService.generateTransactionReference('SUB');

    const stkResult = await mpesaService.initiateSTKPush(
      sanitizedPhone,
      subscription.plan.price,
      paymentReference,
      `Subscription payment for ${subscription.plan.name} plan`
    );

    if (!stkResult.success) {
      return res.status(400).json({
        success: false,
        error: stkResult.error?.errorMessage || 'Failed to initiate payment'
      });
    }

    subscription.payment = {
      method: 'mpesa',
      lastTransactionId: stkResult.checkoutRequestID
    };
    await subscription.save();

    res.status(200).json({
      success: true,
      message: 'Payment initiated successfully',
      data: {
        checkoutRequestID: stkResult.checkoutRequestID,
        customerMessage: stkResult.customerMessage
      }
    });

    logger.info(`Subscription payment initiated: ${subscription._id}`);
  } catch (error) {
    next(error);
  }
};

export const confirmSubscriptionPayment = async (req, res, next) => {
  try {
    const { checkoutRequestID } = req.body;

    const subscription = await Subscription.findOne({
      'payment.lastTransactionId': checkoutRequestID
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'Subscription not found for this payment'
      });
    }

    subscription.status = 'active';
    subscription.billing.lastPaymentDate = new Date();

    const billingDays = subscription.plan.billingCycle === 'monthly' ? 30 :
                        subscription.plan.billingCycle === 'quarterly' ? 90 : 365;

    subscription.billing.nextBillingDate = new Date(Date.now() + billingDays * 24 * 60 * 60 * 1000);
    subscription.billing.endDate = subscription.billing.nextBillingDate;

    await subscription.save();

    res.status(200).json({
      success: true,
      message: 'Payment confirmed and subscription activated',
      data: { subscription }
    });

    logger.info(`Subscription payment confirmed: ${subscription._id}`);
  } catch (error) {
    next(error);
  }
};
