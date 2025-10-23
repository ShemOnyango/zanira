import Shop from '../models/Shop.js';
// import User from '../models/User.js';
import Payment from '../models/Payment.js';
import AuditLog from '../models/AuditLog.js';
import logger from '../middleware/logger.js';

export const createShop = async (req, res, next) => {
  try {
    const {
      shopName,
      shopType,
      description,
      location,
      contactPhone,
      contactEmail,
      website,
      socialMedia,
      businessRegistrationNumber,
      taxPin,
      yearsInOperation,
      operatingHours,
      commissionRate,
      pricingTier,
      paymentMethods,
      mpesaPaybill,
      bankAccount
    } = req.body;

    const userId = req.user._id;

    const existingShop = await Shop.findOne({ user: userId });
    if (existingShop) {
      return res.status(400).json({
        success: false,
        error: 'Shop already exists for this user'
      });
    }

    const shop = await Shop.create({
      user: userId,
      shopName,
      shopType,
      description,
      location,
      contactPhone: contactPhone || req.user.phone,
      contactEmail: contactEmail || req.user.email,
      website,
      socialMedia,
      businessRegistrationNumber,
      taxPin,
      yearsInOperation,
      operatingHours,
      commissionRate: commissionRate || 10,
      pricingTier: pricingTier || 'standard',
      paymentMethods,
      mpesaPaybill,
      bankAccount
    });

    await AuditLog.logAction({
      userId: req.user._id,
      userRole: req.user.role,
      userEmail: req.user.email,
      action: 'shop_created',
      targetEntity: {
        entityType: 'Shop',
        entityId: shop._id,
        entityDescription: `Shop: ${shop.shopName}`
      },
      severity: 'medium',
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    await shop.populate('user', 'firstName lastName email phone');

    res.status(201).json({
      success: true,
      message: 'Shop created successfully',
      data: { shop }
    });

    logger.info(`Shop created: ${shop._id} by user ${userId}`);
  } catch (error) {
    next(error);
  }
};

export const getShops = async (req, res, next) => {
  try {
    const {
      shopType,
      county,
      town,
      pricingTier,
      verificationStatus,
      page = 1,
      limit = 20,
      sort = '-createdAt'
    } = req.query;

    const query = {};

    if (shopType) query.shopType = shopType;
    if (county) query['location.county'] = county;
    if (town) query['location.town'] = town;
    if (pricingTier) query.pricingTier = pricingTier;
    if (verificationStatus) query['verification.overallStatus'] = verificationStatus;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const shops = await Shop.find(query)
      .populate('user', 'firstName lastName email phone profilePhoto')
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    const total = await Shop.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        shops,
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

export const getShop = async (req, res, next) => {
  try {
    const shop = await Shop.findById(req.params.id)
      .populate('user', 'firstName lastName email phone profilePhoto')
      .populate('inventory.product');

    if (!shop) {
      return res.status(404).json({
        success: false,
        error: 'Shop not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { shop }
    });
  } catch (error) {
    next(error);
  }
};

export const updateShop = async (req, res, next) => {
  try {
    const shopId = req.params.id;
    const userId = req.user._id;
    const userRole = req.user.role;

    const shop = await Shop.findById(shopId);
    if (!shop) {
      return res.status(404).json({
        success: false,
        error: 'Shop not found'
      });
    }

    if (shop.user.toString() !== userId.toString() && !['admin', 'super_admin'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this shop'
      });
    }

    const updateFields = [
      'shopName', 'description', 'location', 'contactPhone', 'contactEmail',
      'website', 'socialMedia', 'operatingHours', 'pricingTier',
      'paymentMethods', 'mpesaPaybill', 'bankAccount', 'commissionRate'
    ];

    const changesBefore = {};
    const changesAfter = {};

    updateFields.forEach(field => {
      if (req.body[field] !== undefined) {
        changesBefore[field] = shop[field];
        shop[field] = req.body[field];
        changesAfter[field] = req.body[field];
      }
    });

    await shop.save();

    await AuditLog.logAction({
      userId: req.user._id,
      userRole: req.user.role,
      userEmail: req.user.email,
      action: 'shop_updated',
      targetEntity: {
        entityType: 'Shop',
        entityId: shop._id,
        entityDescription: `Shop: ${shop.shopName}`
      },
      changes: {
        before: changesBefore,
        after: changesAfter
      },
      severity: 'low',
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    await shop.populate('user', 'firstName lastName email phone');

    res.status(200).json({
      success: true,
      message: 'Shop updated successfully',
      data: { shop }
    });

    logger.info(`Shop updated: ${shopId}`);
  } catch (error) {
    next(error);
  }
};

export const deleteShop = async (req, res, next) => {
  try {
    const shopId = req.params.id;
    const userId = req.user._id;
    const userRole = req.user.role;

    const shop = await Shop.findById(shopId);
    if (!shop) {
      return res.status(404).json({
        success: false,
        error: 'Shop not found'
      });
    }

    if (shop.user.toString() !== userId.toString() && !['admin', 'super_admin'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this shop'
      });
    }

    await shop.deleteOne();

    await AuditLog.logAction({
      userId: req.user._id,
      userRole: req.user.role,
      userEmail: req.user.email,
      action: 'shop_deleted',
      targetEntity: {
        entityType: 'Shop',
        entityId: shop._id,
        entityDescription: `Shop: ${shop.shopName}`
      },
      severity: 'high',
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(200).json({
      success: true,
      message: 'Shop deleted successfully'
    });

    logger.info(`Shop deleted: ${shopId}`);
  } catch (error) {
    next(error);
  }
};

export const verifyShop = async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    const shopId = req.params.id;

    if (!['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to verify shops'
      });
    }

    const shop = await Shop.findById(shopId);
    if (!shop) {
      return res.status(404).json({
        success: false,
        error: 'Shop not found'
      });
    }

    shop.verification.overallStatus = status;
    shop.verification.verificationDate = new Date();
    shop.verification.verifiedBy = req.user._id;

    await shop.save();

    await AuditLog.logAction({
      userId: req.user._id,
      userRole: req.user.role,
      userEmail: req.user.email,
      action: status === 'verified' ? 'shop_verified' : 'shop_rejected',
      targetEntity: {
        entityType: 'Shop',
        entityId: shop._id,
        entityDescription: `Shop: ${shop.shopName}`
      },
      metadata: { notes },
      severity: 'high',
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(200).json({
      success: true,
      message: `Shop ${status} successfully`,
      data: { shop }
    });

    logger.info(`Shop ${status}: ${shopId} by admin ${req.user._id}`);
  } catch (error) {
    next(error);
  }
};

export const manageInventory = async (req, res, next) => {
  try {
    const { action, items } = req.body;
    const shopId = req.params.id;

    const shop = await Shop.findById(shopId);
    if (!shop) {
      return res.status(404).json({
        success: false,
        error: 'Shop not found'
      });
    }

    if (shop.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to manage this shop inventory'
      });
    }

    switch (action) {
      case 'add':
        items.forEach(item => shop.inventory.push(item));
        break;
      case 'update':
        items.forEach(({ productId, quantity, price }) => {
          const inventoryItem = shop.inventory.find(
            item => item.product.toString() === productId
          );
          if (inventoryItem) {
            if (quantity !== undefined) inventoryItem.quantity = quantity;
            if (price !== undefined) inventoryItem.price = price;
          }
        });
        break;
      case 'remove':
        items.forEach(productId => {
          shop.inventory = shop.inventory.filter(
            item => item.product.toString() !== productId
          );
        });
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid action'
        });
    }

    await shop.save();

    res.status(200).json({
      success: true,
      message: 'Inventory updated successfully',
      data: { inventory: shop.inventory }
    });

    logger.info(`Inventory ${action} for shop ${shopId}`);
  } catch (error) {
    next(error);
  }
};

export const getShopAnalytics = async (req, res, next) => {
  try {
    const shopId = req.params.id;
    const { startDate, endDate } = req.query;

    const shop = await Shop.findById(shopId);
    if (!shop) {
      return res.status(404).json({
        success: false,
        error: 'Shop not found'
      });
    }

    if (shop.user.toString() !== req.user._id.toString() && !['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view shop analytics'
      });
    }

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const transactions = await Payment.find({
      'shopCommission.shop': shopId,
      ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
    });

    const analytics = {
      totalTransactions: transactions.length,
      totalRevenue: transactions.reduce((sum, t) => sum + (t.shopCommission?.amount || 0), 0),
      averageTransaction: transactions.length > 0
        ? transactions.reduce((sum, t) => sum + (t.shopCommission?.amount || 0), 0) / transactions.length
        : 0,
      shopStats: shop.stats
    };

    res.status(200).json({
      success: true,
      data: { analytics }
    });
  } catch (error) {
    next(error);
  }
};
