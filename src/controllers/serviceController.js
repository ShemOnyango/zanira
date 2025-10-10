import ServiceCategory from '../models/ServiceCategory.js';
import Fundi from '../models/Fundi.js';
import { sanitizeUser } from '../utils/authUtils.js';
import logger from '../middleware/logger.js';

// @desc    Get all service categories
// @route   GET /api/v1/services/categories
// @access  Public
export const getServiceCategories = async (req, res, next) => {
  try {
    const {
      category,
      isActive = true,
      isPopular,
      isEmergency,
      page = 1,
      limit = 20,
      sort = 'displayOrder'
    } = req.query;

    // Build filter
    const filter = { isActive };
    if (category) filter.category = category;
    if (isPopular !== undefined) filter.isPopular = isPopular === 'true';
    if (isEmergency !== undefined) filter.isEmergency = isEmergency === 'true';

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get services with pagination
    const services = await ServiceCategory.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    // Get total count
    const total = await ServiceCategory.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        services,
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

// @desc    Get single service category
// @route   GET /api/v1/services/categories/:id
// @access  Public
export const getServiceCategory = async (req, res, next) => {
  try {
    const service = await ServiceCategory.findById(req.params.id);

    if (!service) {
      return res.status(404).json({
        success: false,
        error: 'Service category not found'
      });
    }

    // Get fundis who offer this service
    const fundis = await Fundi.find({
      'servicesOffered.service': req.params.id,
      'verification.overallStatus': 'verified',
      availability: 'available'
    })
    .populate('user', 'firstName lastName profilePhoto county town')
    .limit(10);

    res.status(200).json({
      success: true,
      data: {
        service,
        availableFundis: fundis.length
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create service category (Admin only)
// @route   POST /api/v1/services/categories
// @access  Private/Admin
export const createServiceCategory = async (req, res, next) => {
  try {
    const service = await ServiceCategory.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Service category created successfully',
      data: {
        service
      }
    });

    logger.info(`Service category created by admin ${req.user.email}: ${service.name}`);
  } catch (error) {
    next(error);
  }
};

// @desc    Update service category (Admin only)
// @route   PATCH /api/v1/services/categories/:id
// @access  Private/Admin
export const updateServiceCategory = async (req, res, next) => {
  try {
    const service = await ServiceCategory.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!service) {
      return res.status(404).json({
        success: false,
        error: 'Service category not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Service category updated successfully',
      data: {
        service
      }
    });

    logger.info(`Service category updated by admin ${req.user.email}: ${service.name}`);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete service category (Admin only)
// @route   DELETE /api/v1/services/categories/:id
// @access  Private/Admin
export const deleteServiceCategory = async (req, res, next) => {
  try {
    const service = await ServiceCategory.findById(req.params.id);

    if (!service) {
      return res.status(404).json({
        success: false,
        error: 'Service category not found'
      });
    }

    // Check if service is being used by any fundi
    const fundisUsingService = await Fundi.countDocuments({
      'servicesOffered.service': req.params.id
    });

    if (fundisUsingService > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete service category. It is currently being used by ${fundisUsingService} fundis.`
      });
    }

    await ServiceCategory.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Service category deleted successfully'
    });

    logger.info(`Service category deleted by admin ${req.user.email}: ${service.name}`);
  } catch (error) {
    next(error);
  }
};

// @desc    Get services by fundi
// @route   GET /api/v1/services/fundi/:fundiId
// @access  Public
export const getFundiServices = async (req, res, next) => {
  try {
    const fundi = await Fundi.findById(req.params.fundiId)
      .populate('servicesOffered.service')
      .populate('user', 'firstName lastName profilePhoto county town rating');

    if (!fundi) {
      return res.status(404).json({
        success: false,
        error: 'Fundi not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        fundi: {
          ...fundi.toObject(),
          user: sanitizeUser(fundi.user)
        },
        services: fundi.servicesOffered
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add service to fundi profile
// @route   POST /api/v1/services/fundi/add-service
// @access  Private/Fundi
export const addFundiService = async (req, res, next) => {
  try {
    const { serviceId, basePrice, description } = req.body;
    const fundiId = req.user.fundiProfile._id;

    const fundi = await Fundi.findById(fundiId);
    if (!fundi) {
      return res.status(404).json({
        success: false,
        error: 'Fundi profile not found'
      });
    }

    // Check if service already exists
    const existingService = fundi.servicesOffered.find(
      service => service.service.toString() === serviceId
    );

    if (existingService) {
      return res.status(400).json({
        success: false,
        error: 'Service already added to your profile'
      });
    }

    // Get service details to validate
    const service = await ServiceCategory.findById(serviceId);
    if (!service) {
      return res.status(404).json({
        success: false,
        error: 'Service category not found'
      });
    }

    // Validate price against service range
    if (basePrice < service.priceRange.min || basePrice > service.priceRange.max) {
      return res.status(400).json({
        success: false,
        error: `Price must be between ${service.priceRange.min} and ${service.priceRange.max} KES`
      });
    }

    // Add service to fundi profile
    fundi.servicesOffered.push({
      service: serviceId,
      basePrice,
      description: description || service.description
    });

    await fundi.save();

    // Populate the new service
    await fundi.populate('servicesOffered.service');

    res.status(200).json({
      success: true,
      message: 'Service added successfully',
      data: {
        services: fundi.servicesOffered
      }
    });

    logger.info(`Service added to fundi profile: ${fundi.user} - ${service.name}`);
  } catch (error) {
    next(error);
  }
};

// @desc    Update fundi service
// @route   PATCH /api/v1/services/fundi/update-service/:serviceId
// @access  Private/Fundi
export const updateFundiService = async (req, res, next) => {
  try {
    const { basePrice, description } = req.body;
    const fundiId = req.user.fundiProfile._id;
    const serviceId = req.params.serviceId;

    const fundi = await Fundi.findById(fundiId);
    if (!fundi) {
      return res.status(404).json({
        success: false,
        error: 'Fundi profile not found'
      });
    }

    // Find the service
    const serviceIndex = fundi.servicesOffered.findIndex(
      service => service._id.toString() === serviceId
    );

    if (serviceIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Service not found in your profile'
      });
    }

    // Update service
    if (basePrice !== undefined) {
      // Validate price against service range
      const serviceCategory = await ServiceCategory.findById(fundi.servicesOffered[serviceIndex].service);
      if (basePrice < serviceCategory.priceRange.min || basePrice > serviceCategory.priceRange.max) {
        return res.status(400).json({
          success: false,
          error: `Price must be between ${serviceCategory.priceRange.min} and ${serviceCategory.priceRange.max} KES`
        });
      }
      fundi.servicesOffered[serviceIndex].basePrice = basePrice;
    }

    if (description !== undefined) {
      fundi.servicesOffered[serviceIndex].description = description;
    }

    await fundi.save();
    await fundi.populate('servicesOffered.service');

    res.status(200).json({
      success: true,
      message: 'Service updated successfully',
      data: {
        services: fundi.servicesOffered
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove service from fundi profile
// @route   DELETE /api/v1/services/fundi/remove-service/:serviceId
// @access  Private/Fundi
export const removeFundiService = async (req, res, next) => {
  try {
    const fundiId = req.user.fundiProfile._id;
    const serviceId = req.params.serviceId;

    const fundi = await Fundi.findById(fundiId);
    if (!fundi) {
      return res.status(404).json({
        success: false,
        error: 'Fundi profile not found'
      });
    }

    // Remove service
    fundi.servicesOffered = fundi.servicesOffered.filter(
      service => service._id.toString() !== serviceId
    );

    await fundi.save();

    res.status(200).json({
      success: true,
      message: 'Service removed successfully',
      data: {
        services: fundi.servicesOffered
      }
    });

    logger.info(`Service removed from fundi profile: ${fundi.user} - ${serviceId}`);
  } catch (error) {
    next(error);
  }
};

// @desc    Search services with filters
// @route   GET /api/v1/services/search
// @access  Public
export const searchServices = async (req, res, next) => {
  try {
    const {
      query,
      category,
      county,
      town,
      minPrice,
      maxPrice,
      rating,
      sortBy = 'rating',
      page = 1,
      limit = 10
    } = req.query;

    // Build search filter
    const searchFilter = {
      'verification.overallStatus': 'verified',
      availability: 'available'
    };

    // Text search
    if (query) {
      searchFilter.$or = [
        { 'user.firstName': { $regex: query, $options: 'i' } },
        { 'user.lastName': { $regex: query, $options: 'i' } },
        { specialization: { $regex: query, $options: 'i' } },
        { 'servicesOffered.description': { $regex: query, $options: 'i' } }
      ];
    }

    // Category filter
    if (category) {
      searchFilter.profession = category;
    }

    // Location filter
    if (county) {
      searchFilter.operatingCounties = county;
    }
    if (town) {
      searchFilter.operatingTowns = town;
    }

    // Price filter
    const priceFilter = {};
    if (minPrice) priceFilter.$gte = parseInt(minPrice);
    if (maxPrice) priceFilter.$lte = parseInt(maxPrice);

    // Rating filter
    if (rating) {
      searchFilter['stats.rating'] = { $gte: parseFloat(rating) };
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Sort options
    const sortOptions = {};
    switch (sortBy) {
      case 'rating':
        sortOptions['stats.rating'] = -1;
        break;
      case 'price_low':
        sortOptions['servicesOffered.basePrice'] = 1;
        break;
      case 'price_high':
        sortOptions['servicesOffered.basePrice'] = -1;
        break;
      case 'experience':
        sortOptions['yearsOfExperience'] = -1;
        break;
      default:
        sortOptions['stats.rating'] = -1;
    }

    // Get fundis with services
    const fundis = await Fundi.find(searchFilter)
      .populate('user', 'firstName lastName profilePhoto county town')
      .populate('servicesOffered.service')
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum);

    // Apply price filter in memory (MongoDB doesn't support filtering array elements easily)
    const filteredFundis = fundis.filter(fundi => {
      if (Object.keys(priceFilter).length === 0) return true;
      
      return fundi.servicesOffered.some(service => {
        if (priceFilter.$gte && service.basePrice < priceFilter.$gte) return false;
        if (priceFilter.$lte && service.basePrice > priceFilter.$lte) return false;
        return true;
      });
    });

    // Get total count
    const totalFundis = await Fundi.countDocuments(searchFilter);

    res.status(200).json({
      success: true,
      data: {
        fundis: filteredFundis.map(fundi => ({
          ...fundi.toObject(),
          user: sanitizeUser(fundi.user)
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalFundis,
          pages: Math.ceil(totalFundis / limitNum)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};