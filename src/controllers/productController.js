import Product from '../models/Product.js';
import Shop from '../models/Shop.js';
import asyncHandler from 'express-async-handler';

// @desc List products with optional shop filter
// @route GET /api/v1/products
// @access Public
export const listProducts = asyncHandler(async (req, res) => {
  const { shop, page = 1, limit = 20 } = req.query;
  const skip = (page - 1) * limit;
  const query = {};
  if (shop) query.shop = shop;

  const [products, total] = await Promise.all([
    Product.find(query).skip(parseInt(skip)).limit(parseInt(limit)).sort({ createdAt: -1 }),
    Product.countDocuments(query)
  ]);

  res.status(200).json({ success: true, data: { products, pagination: { page: parseInt(page), limit: parseInt(limit), total } } });
});

// @desc Get product by id
// @route GET /api/v1/products/:id
// @access Public
export const getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ success: false, error: 'Product not found' });
  res.status(200).json({ success: true, data: { product } });
});

// @desc Create product (shop owner or admin)
// @route POST /api/v1/products
// @access Private (shop_owner | admin)
export const createProduct = asyncHandler(async (req, res) => {
  const { name, description, price, sku, images, shop } = req.body;

  // If shop provided, ensure caller owns the shop or is admin
  if (shop) {
    const shopDoc = await Shop.findById(shop);
    if (!shopDoc) return res.status(404).json({ success: false, error: 'Shop not found' });
    if (req.user.role !== 'admin' && shopDoc.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Not authorized to add product to this shop' });
    }
  }

  const product = await Product.create({ name, description, price, sku, images, shop });
  res.status(201).json({ success: true, data: { product } });
});

// @desc Update product
// @route PATCH /api/v1/products/:id
// @access Private (shop_owner | admin)
export const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ success: false, error: 'Product not found' });

  // Authorization: if product has shop, only shop owner or admin can edit
  if (product.shop) {
    const shopDoc = await Shop.findById(product.shop);
    if (req.user.role !== 'admin' && shopDoc.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Not authorized to update this product' });
    }
  }

  Object.keys(req.body).forEach(key => {
    product[key] = req.body[key];
  });

  await product.save();
  res.status(200).json({ success: true, data: { product } });
});

// @desc Delete product
// @route DELETE /api/v1/products/:id
// @access Private (shop_owner | admin)
export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ success: false, error: 'Product not found' });

  if (product.shop) {
    const shopDoc = await Shop.findById(product.shop);
    if (req.user.role !== 'admin' && shopDoc.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Not authorized to delete this product' });
    }
  }

  await product.deleteOne();
  res.status(200).json({ success: true, message: 'Product deleted' });
});
