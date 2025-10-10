import express from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
import {
  createShop,
  getShops,
  getShop,
  updateShop,
  deleteShop,
  verifyShop,
  manageInventory,
  getShopAnalytics
} from '../controllers/shopController.js';

const router = express.Router();

router.use(protect);

router.post('/', restrictTo('shop_owner'), createShop);
router.get('/', getShops);
router.get('/:id', getShop);
router.put('/:id', updateShop);
router.delete('/:id', deleteShop);

router.patch('/:id/verify', restrictTo('admin', 'super_admin'), verifyShop);
router.post('/:id/inventory', restrictTo('shop_owner'), manageInventory);
router.get('/:id/analytics', getShopAnalytics);

export default router;
