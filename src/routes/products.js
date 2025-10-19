import express from 'express';
import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct
} from '../controllers/productController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/', listProducts);
router.get('/:id', getProduct);

// Protected routes
router.post('/', protect, authorize('shop_owner', 'admin', 'super_admin'), createProduct);
router.patch('/:id', protect, authorize('shop_owner', 'admin', 'super_admin'), updateProduct);
router.delete('/:id', protect, authorize('shop_owner', 'admin', 'super_admin'), deleteProduct);

export default router;
