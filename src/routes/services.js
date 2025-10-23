import express from 'express';
import {
  getServiceCategories,
  getServiceCategory,
  getFundisForService,
  createServiceCategory,
  updateServiceCategory,
  deleteServiceCategory,
  getFundiServices,
  addFundiService,
  updateFundiService,
  removeFundiService,
  searchServices
} from '../controllers/serviceController.js';
import { protect, authorize } from '../middleware/auth.js';
import { validateObjectId } from '../middleware/validation.js';

const router = express.Router();

// Public routes
// Allow client to fetch list of services at GET /api/v1/services
router.get('/', getServiceCategories);
router.get('/categories', getServiceCategories);
router.get('/categories/:id', validateObjectId, getServiceCategory);
router.get('/search', searchServices);
router.get('/fundi/:fundiId', validateObjectId, getFundiServices);
// Get fundis for a specific service
router.get('/:id/fundis', validateObjectId, getFundisForService);

// Protected routes
router.use(protect);

// Fundi routes
router.post('/fundi/add-service', authorize('fundi'), addFundiService);
router.patch('/fundi/update-service/:serviceId', authorize('fundi'), updateFundiService);
router.delete('/fundi/remove-service/:serviceId', authorize('fundi'), removeFundiService);

// Admin routes
router.post('/categories', authorize('admin', 'super_admin'), createServiceCategory);
router.patch('/categories/:id', authorize('admin', 'super_admin'), validateObjectId, updateServiceCategory);
router.delete('/categories/:id', authorize('admin', 'super_admin'), validateObjectId, deleteServiceCategory);

export default router;