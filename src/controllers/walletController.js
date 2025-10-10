import Wallet from '../models/Wallet.js';
import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';
import mpesaService from '../config/mpesa.js';
import bcrypt from 'bcryptjs';
import logger from '../middleware/logger.js';

export const createWallet = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const existingWallet = await Wallet.findOne({ user: userId });
    if (existingWallet) {
      return res.status(400).json({
        success: false,
        error: 'Wallet already exists'
      });
    }

    const wallet = await Wallet.create({
      user: userId,
      balance: {
        available: 0,
        pending: 0,
        locked: 0
      },
      status: 'active'
    });

    await AuditLog.logAction({
      userId,
      userRole: req.user.role,
      userEmail: req.user.email,
      action: 'wallet_created',
      targetEntity: {
        entityType: 'Wallet',
        entityId: wallet._id
      },
      severity: 'medium',
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(201).json({
      success: true,
      message: 'Wallet created successfully',
      data: { wallet }
    });

    logger.info(`Wallet created for user: ${userId}`);
  } catch (error) {
    next(error);
  }
};

export const getWallet = async (req, res, next) => {
  try {
    const userId = req.user._id;

    let wallet = await Wallet.findOne({ user: userId });

    if (!wallet) {
      wallet = await Wallet.create({
        user: userId,
        balance: { available: 0, pending: 0, locked: 0 },
        status: 'active'
      });
    }

    res.status(200).json({
      success: true,
      data: { wallet }
    });
  } catch (error) {
    next(error);
  }
};

export const getTransactionHistory = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { limit = 50, type, startDate, endDate } = req.query;

    const wallet = await Wallet.findOne({ user: userId });
    if (!wallet) {
      return res.status(404).json({
        success: false,
        error: 'Wallet not found'
      });
    }

    let transactions = wallet.transactions;

    if (type) {
      transactions = transactions.filter(t => t.type === type);
    }

    if (startDate || endDate) {
      transactions = transactions.filter(t => {
        const txDate = new Date(t.timestamp);
        if (startDate && txDate < new Date(startDate)) return false;
        if (endDate && txDate > new Date(endDate)) return false;
        return true;
      });
    }

    transactions = transactions.slice(-parseInt(limit)).reverse();

    res.status(200).json({
      success: true,
      data: {
        transactions,
        count: transactions.length
      }
    });
  } catch (error) {
    next(error);
  }
};

export const addFunds = async (req, res, next) => {
  try {
    const { amount: rawAmount, phoneNumber: rawPhone } = req.body;
    const userId = req.user._id;

    // validate amount
    const amount = Number(rawAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid top-up amount' });
    }

    if (amount < 100) {
      return res.status(400).json({
        success: false,
        error: 'Minimum top-up amount is KES 100'
      });
    }

    let wallet = await Wallet.findOne({ user: userId });
    if (!wallet) {
      wallet = await Wallet.create({
        user: userId,
        balance: { available: 0, pending: 0, locked: 0 },
        status: 'active'
      });
    }

    if (wallet.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'Wallet is not active'
      });
    }

    // prefer provided phone number, fall back to user's phone from profile
    const phoneToUse = (rawPhone && String(rawPhone).trim()) || req.user.phone || req.user.mobile || null;

    if (!phoneToUse) {
      return res.status(400).json({ success: false, error: 'Phone number is required for top-up' });
    }

    // sanitizePhoneNumber expects a string; guard against undefined/null
    const sanitizedPhone = mpesaService.sanitizePhoneNumber(String(phoneToUse));
    const paymentReference = mpesaService.generateTransactionReference('TOP');

    const stkResult = await mpesaService.initiateSTKPush(
      sanitizedPhone,
      amount,
      paymentReference,
      'Wallet top-up'
    );

    if (!stkResult.success) {
      return res.status(400).json({
        success: false,
        error: stkResult.error?.errorMessage || 'Failed to initiate payment'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Payment initiated successfully',
      data: {
        checkoutRequestID: stkResult.checkoutRequestID,
        customerMessage: stkResult.customerMessage
      }
    });

    logger.info(`Wallet top-up initiated: User ${userId}, Amount: ${amount}`);
  } catch (error) {
    next(error);
  }
};

export const confirmTopUp = async (req, res, next) => {
  try {
    const { checkoutRequestID, amount } = req.body;
    const userId = req.user._id;

    const wallet = await Wallet.findOne({ user: userId });
    if (!wallet) {
      return res.status(404).json({
        success: false,
        error: 'Wallet not found'
      });
    }

    await wallet.addTransaction({
      type: 'credit',
      amount: parseFloat(amount),
      description: 'Wallet top-up',
      reference: checkoutRequestID,
      relatedEntity: {
        entityType: 'wallet',
        entityId: wallet._id
      }
    });

    await AuditLog.logAction({
      userId,
      userRole: req.user.role,
      userEmail: req.user.email,
      action: 'wallet_topup',
      metadata: { amount, checkoutRequestID },
      severity: 'low',
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(200).json({
      success: true,
      message: 'Wallet topped up successfully',
      data: {
        balance: wallet.balance,
        transaction: wallet.transactions[wallet.transactions.length - 1]
      }
    });

    logger.info(`Wallet topped up: User ${userId}, Amount: ${amount}`);
  } catch (error) {
    next(error);
  }
};

export const requestWithdrawal = async (req, res, next) => {
  try {
    const { amount, method, destination } = req.body;
    const userId = req.user._id;

    const wallet = await Wallet.findOne({ user: userId });
    if (!wallet) {
      return res.status(404).json({
        success: false,
        error: 'Wallet not found'
      });
    }

    const canWithdraw = wallet.canWithdraw(amount);
    if (!canWithdraw.allowed) {
      return res.status(400).json({
        success: false,
        error: canWithdraw.reason
      });
    }

    const withdrawal = await wallet.requestWithdrawal(amount, method, destination);

    await AuditLog.logAction({
      userId,
      userRole: req.user.role,
      userEmail: req.user.email,
      action: 'withdrawal_requested',
      metadata: { amount, method, withdrawalId: withdrawal.withdrawalId },
      severity: 'medium',
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(200).json({
      success: true,
      message: 'Withdrawal request submitted successfully',
      data: {
        withdrawal,
        balance: wallet.balance
      }
    });

    logger.info(`Withdrawal requested: User ${userId}, Amount: ${amount}`);
  } catch (error) {
    next(error);
  }
};

export const getWithdrawals = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const wallet = await Wallet.findOne({ user: userId });
    if (!wallet) {
      return res.status(404).json({
        success: false,
        error: 'Wallet not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        withdrawals: wallet.withdrawals.sort((a, b) => b.requestedAt - a.requestedAt)
      }
    });
  } catch (error) {
    next(error);
  }
};

export const processWithdrawal = async (req, res, next) => {
  try {
    const { withdrawalId, status, transactionCode, failureReason } = req.body;

    if (!['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to process withdrawals'
      });
    }

    const wallet = await Wallet.findOne({ 'withdrawals.withdrawalId': withdrawalId });
    if (!wallet) {
      return res.status(404).json({
        success: false,
        error: 'Withdrawal not found'
      });
    }

    const withdrawal = wallet.withdrawals.find(w => w.withdrawalId === withdrawalId);
    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        error: 'Withdrawal not found'
      });
    }

    withdrawal.status = status;
    withdrawal.processedAt = new Date();

    if (status === 'completed') {
      withdrawal.completedAt = new Date();
      withdrawal.transactionCode = transactionCode;

      wallet.balance.locked -= withdrawal.amount;
      wallet.statistics.totalWithdrawals += withdrawal.amount;

      await wallet.addTransaction({
        type: 'withdrawal',
        amount: withdrawal.amount,
        description: 'Withdrawal processed',
        reference: withdrawalId,
        relatedEntity: {
          entityType: 'withdrawal',
          entityId: wallet._id
        }
      });
    } else if (status === 'failed' || status === 'cancelled') {
      wallet.balance.locked -= withdrawal.amount;
      wallet.balance.available += withdrawal.amount;
      withdrawal.failureReason = failureReason;
    }

    await wallet.save();

    await AuditLog.logAction({
      userId: req.user._id,
      userRole: req.user.role,
      userEmail: req.user.email,
      action: 'withdrawal_processed',
      targetEntity: {
        entityType: 'Wallet',
        entityId: wallet._id
      },
      metadata: { withdrawalId, status, amount: withdrawal.amount },
      severity: 'high',
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(200).json({
      success: true,
      message: `Withdrawal ${status} successfully`,
      data: { withdrawal }
    });

    logger.info(`Withdrawal ${status}: ${withdrawalId}`);
  } catch (error) {
    next(error);
  }
};

export const transferFunds = async (req, res, next) => {
  try {
    const { recipientId, amount, description } = req.body;
    const userId = req.user._id;

    if (userId.toString() === recipientId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot transfer to yourself'
      });
    }

    const senderWallet = await Wallet.findOne({ user: userId });
    if (!senderWallet) {
      return res.status(404).json({
        success: false,
        error: 'Sender wallet not found'
      });
    }

    const recipientWallet = await Wallet.findOne({ user: recipientId });
    if (!recipientWallet) {
      return res.status(404).json({
        success: false,
        error: 'Recipient wallet not found'
      });
    }

    if (senderWallet.balance.available < amount) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient balance'
      });
    }

    if (amount > senderWallet.limits.dailyTransfer) {
      return res.status(400).json({
        success: false,
        error: 'Amount exceeds daily transfer limit'
      });
    }

    await senderWallet.addTransaction({
      type: 'transfer',
      amount: -amount,
      description: `Transfer to user ${recipientId}: ${description}`,
      reference: `TRF-${Date.now()}`,
      relatedEntity: {
        entityType: 'transfer',
        entityId: recipientId
      }
    });

    await recipientWallet.addTransaction({
      type: 'transfer',
      amount: amount,
      description: `Transfer from user ${userId}: ${description}`,
      reference: `TRF-${Date.now()}`,
      relatedEntity: {
        entityType: 'transfer',
        entityId: userId
      }
    });

    await AuditLog.logAction({
      userId,
      userRole: req.user.role,
      userEmail: req.user.email,
      action: 'wallet_transfer',
      metadata: { recipientId, amount, description },
      severity: 'medium',
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(200).json({
      success: true,
      message: 'Transfer completed successfully',
      data: {
        senderBalance: senderWallet.balance,
        recipientBalance: recipientWallet.balance
      }
    });

    logger.info(`Wallet transfer: ${userId} -> ${recipientId}, Amount: ${amount}`);
  } catch (error) {
    next(error);
  }
};

export const setWalletPIN = async (req, res, next) => {
  try {
    const { pin } = req.body;
    const userId = req.user._id;

    if (!/^\d{4}$/.test(pin)) {
      return res.status(400).json({
        success: false,
        error: 'PIN must be 4 digits'
      });
    }

    const wallet = await Wallet.findOne({ user: userId }).select('+security.pin');
    if (!wallet) {
      return res.status(404).json({
        success: false,
        error: 'Wallet not found'
      });
    }

    const hashedPIN = await bcrypt.hash(pin, 10);

    wallet.security.pin = hashedPIN;
    wallet.security.pinEnabled = true;
    wallet.security.lastPinChangeAt = new Date();
    await wallet.save();

    res.status(200).json({
      success: true,
      message: 'Wallet PIN set successfully'
    });

    logger.info(`Wallet PIN set for user: ${userId}`);
  } catch (error) {
    next(error);
  }
};
