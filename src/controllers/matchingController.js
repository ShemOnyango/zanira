// controllers/matchingController.js
import matchingService from '../services/matchingService.js';
import Booking from '../models/Booking.js';
import Fundi from '../models/Fundi.js';
import ServiceCategory from '../models/ServiceCategory.js';
import asyncHandler from 'express-async-handler';
import logger from '../middleware/logger.js';
import redisClient from '../config/redis.js';
import Joi from 'joi';

// Validation schema
const matchingSchema = Joi.object({
  serviceCategory: Joi.string().required(),
  description: Joi.string().required(),
  location: Joi.object({
    county: Joi.string().required(),
    constituency: Joi.string().optional(),
    town: Joi.string().optional(),
    street: Joi.string().optional(),
    coordinates: Joi.object({
      latitude: Joi.number().min(-90).max(90),
      longitude: Joi.number().min(-180).max(180)
    }).optional()
  }).required(),
  budget: Joi.object({
    min: Joi.number().min(0),
    max: Joi.number().min(0)
  }).optional(),
  preferredDate: Joi.date().optional(),
  preferredTime: Joi.string().optional(),
  urgency: Joi.string().valid('low', 'normal', 'high', 'emergency').default('normal'),
  maxResults: Joi.number().min(1).max(50).default(10),
  minRating: Joi.number().min(0).max(5).default(3.0),
  maxDistance: Joi.number().min(1).max(500).default(50),
  considerAvailability: Joi.boolean().default(true),
  enableFallback: Joi.boolean().default(true),
  fallbackStrategy: Joi.string().valid('auto', 'strict', 'relaxed').default('auto'),
  preferences: Joi.object({
    weights: Joi.object({
      location: Joi.number().min(0).max(1),
      rating: Joi.number().min(0).max(1),
      expertise: Joi.number().min(0).max(1),
      responseTime: Joi.number().min(0).max(1),
      availability: Joi.number().min(0).max(1),
      price: Joi.number().min(0).max(1),
      completionRate: Joi.number().min(0).max(1)
    }).optional()
  }).optional()
});

// @desc    Find matching fundis for a job
// @route   POST /api/v1/matching/find-fundis
// @access  Private/Client,Admin
export const findMatchingFundis = asyncHandler(async (req, res) => {
  // Validate request body
  const { error, value } = matchingSchema.validate(req.body);
  if (error) {
    res.status(400);
    throw new Error(`Validation error: ${error.details[0].message}`);
  }

  const {
    serviceCategory,
    description,
    location,
    budget,
    preferredDate,
    preferredTime,
    urgency = 'normal',
    maxResults = 10,
    minRating = 3.0,
    maxDistance = 50,
    considerAvailability = true,
    enableFallback = true,
    fallbackStrategy = 'auto',
    preferences = {}
  } = value;

  // Validate service category exists
  const service = await ServiceCategory.findById(serviceCategory);
  if (!service) {
    res.status(404);
    throw new Error('Service category not found');
  }

  // Create job object for matching
  const job = {
    _id: `temp_${Date.now()}`,
    serviceCategory,
    description,
    location: {
      county: location.county,
      constituency: location.constituency,
      town: location.town,
      street: location.street,
      coordinates: location.coordinates || null
    },
    budget: budget || {
      min: service.minPrice || 0,
      max: service.maxPrice || 100000
    },
    preferredDate: preferredDate ? new Date(preferredDate) : null,
    preferredTime: preferredTime || null,
    urgency,
    client: req.user._id,
    preferences
  };

  // Set matching options
  const matchingOptions = {
    maxResults: parseInt(maxResults),
    minRating: parseFloat(minRating),
    maxDistance: parseInt(maxDistance),
    considerAvailability: considerAvailability === true || considerAvailability === 'true',
    enableFallback: enableFallback === true || enableFallback === 'true',
    fallbackStrategy
  };

  try {
    // Find matching fundis
    const matchingResult = await matchingService.findBestFundis(job, matchingOptions);

    // Format response
    const formattedMatches = matchingResult.matches.map(match => ({
      fundi: {
        _id: match.fundi._id,
        user: {
          _id: match.fundi.user._id,
          name: `${match.fundi.user.firstName} ${match.fundi.user.lastName}`,
          profilePhoto: match.fundi.user.profilePhoto,
          county: match.fundi.user.county,
          town: match.fundi.user.town
        },
        specialty: match.fundi.specialty,
        rating: match.fundi.stats.rating,
        completedJobs: match.fundi.stats.completedJobs,
        responseTime: match.fundi.stats.responseTime,
        yearsOfExperience: match.fundi.yearsOfExperience,
        verificationStatus: match.fundi.verificationStatus,
        isPremium: match.fundi.isPremium,
        portfolio: match.fundi.portfolio?.slice(0, 3) || [],
        availability: match.fundi.availability
      },
      score: Math.round(match.score * 100) / 100,
      breakdown: {
        location: Math.round(match.breakdown.location),
        rating: Math.round(match.breakdown.rating),
        expertise: Math.round(match.breakdown.expertise),
        responseTime: Math.round(match.breakdown.responseTime),
        availability: Math.round(match.breakdown.availability),
        price: Math.round(match.breakdown.price),
        completionRate: Math.round(match.breakdown.completionRate)
      },
      matchQuality: match.matchQuality,
      estimatedPrice: getEstimatedPrice(match.fundi, service),
      distance: calculateDistanceForDisplay(job.location, match.fundi.user)
    }));

    // Log matching activity
    logger.info('Matching completed with fallback', {
      jobId: job._id,
      clientId: req.user._id,
      serviceCategory,
      matchesFound: formattedMatches.length,
      fallbackStrategy: matchingResult.fallbackUsed,
      topScore: formattedMatches[0]?.score || 0
    });

    res.status(200).json({
      success: true,
      data: {
        job: {
          service: service.name,
          description,
          location: job.location,
          urgency
        },
        matches: formattedMatches,
        matchingCriteria: matchingOptions,
        fallbackInfo: {
          strategyUsed: matchingResult.fallbackUsed,
          totalAvailable: matchingResult.totalAvailable,
          message: getFallbackMessage(matchingResult.fallbackUsed)
        },
        totalMatches: formattedMatches.length,
        timestamp: new Date()
      }
    });

  } catch (error) {
    logger.error('Matching service error:', {
      error: error.message,
      clientId: req.user._id,
      serviceCategory
    });
    
    res.status(500);
    throw new Error('Failed to find matching fundis. Please try again.');
  }
});

// @desc    Emergency matching for urgent jobs
// @route   POST /api/v1/matching/emergency-match
// @access  Private/Client,Admin
export const emergencyMatch = asyncHandler(async (req, res) => {
  const {
    serviceCategory,
    description,
    location,
    budget,
    preferredDate,
    preferredTime,
    maxDistance = 25,
    minRating = 4.0
  } = req.body;

  // Validate required fields for emergency
  if (!serviceCategory || !description || !location) {
    res.status(400);
    throw new Error('Service category, description, and location are required for emergency matching');
  }

  // Validate service category exists
  const service = await ServiceCategory.findById(serviceCategory);
  if (!service) {
    res.status(404);
    throw new Error('Service category not found');
  }

  // Create emergency job object
  const job = {
    _id: `emergency_${Date.now()}`,
    serviceCategory,
    description,
    location: {
      county: location.county,
      constituency: location.constituency,
      town: location.town,
      street: location.street,
      coordinates: location.coordinates || null
    },
    budget: budget || {
      min: service.minPrice || 0,
      max: service.maxPrice || 100000
    },
    preferredDate: preferredDate ? new Date(preferredDate) : new Date(),
    preferredTime: preferredTime || 'ASAP',
    urgency: 'emergency',
    client: req.user._id
  };

  try {
    // Find emergency match
    const emergencyResult = await matchingService.emergencyMatch(job, {
      maxDistance: parseInt(maxDistance),
      minRating: parseFloat(minRating)
    });

    if (!emergencyResult?.fundi) {
      return res.status(404).json({
        success: false,
        error: 'No available fundis found for emergency service. Please try normal matching or contact support.',
        data: {
          suggestion: 'Try increasing the search distance or lowering the minimum rating requirement'
        }
      });
    }

    const emergencyFundi = emergencyResult.fundi;

    // Calculate emergency score
    const emergencyScore = await calculateEmergencyScore(emergencyFundi, job);

    // Format emergency match response
    const emergencyMatch = {
      fundi: {
        _id: emergencyFundi._id,
        user: {
          _id: emergencyFundi.user._id,
          name: `${emergencyFundi.user.firstName} ${emergencyFundi.user.lastName}`,
          profilePhoto: emergencyFundi.user.profilePhoto,
          county: emergencyFundi.user.county,
          town: emergencyFundi.user.town,
          phone: emergencyFundi.user.phone
        },
        specialty: emergencyFundi.specialty,
        rating: emergencyFundi.stats.rating,
        completedJobs: emergencyFundi.stats.completedJobs,
        responseTime: emergencyFundi.stats.responseTime,
        yearsOfExperience: emergencyFundi.yearsOfExperience,
        verificationStatus: emergencyFundi.verificationStatus,
        isPremium: emergencyFundi.isPremium,
        availability: emergencyFundi.availability
      },
      score: Math.round(emergencyScore * 100) / 100,
      estimatedPrice: getEstimatedPrice(emergencyFundi, service),
      distance: calculateDistanceForDisplay(job.location, emergencyFundi.user),
      estimatedArrival: calculateEstimatedArrival(emergencyFundi, job),
      contactInstructions: generateEmergencyContactInstructions(emergencyFundi),
      fallbackUsed: emergencyResult.fallbackUsed
    };

    // Log emergency match
    logger.info('Emergency match completed', {
      jobId: job._id,
      clientId: req.user._id,
      fundiId: emergencyFundi._id,
      emergencyScore,
      estimatedArrival: emergencyMatch.estimatedArrival,
      fallbackUsed: emergencyResult.fallbackUsed
    });

    res.status(200).json({
      success: true,
      data: {
        job: {
          service: service.name,
          description,
          location: job.location,
          urgency: 'emergency'
        },
        emergencyMatch,
        timestamp: new Date()
      }
    });

  } catch (error) {
    logger.error('Emergency matching error:', {
      error: error.message,
      clientId: req.user._id,
      serviceCategory
    });

    res.status(500);
    throw new Error('Emergency matching failed. Please contact support directly.');
  }
});

// @desc    Locality fallback matching
// @route   POST /api/v1/matching/locality-fallback
// @access  Private/Client,Admin
export const getLocalityFallback = asyncHandler(async (req, res) => {
  const { serviceCategory, county, limit = 10 } = req.body;

  if (!serviceCategory || !county) {
    res.status(400);
    throw new Error('Service category and county are required');
  }

  const job = {
    serviceCategory,
    location: { county }
  };

  try {
    const fallbackFundis = await matchingService.getLocalityFallbackFundis(job, limit);
    
    const formattedFundis = fallbackFundis.map(fundi => ({
      fundi: {
        _id: fundi._id,
        user: {
          _id: fundi.user._id,
          name: `${fundi.user.firstName} ${fundi.user.lastName}`,
          profilePhoto: fundi.user.profilePhoto,
          county: fundi.user.county,
          town: fundi.user.town
        },
        rating: fundi.stats.rating,
        completedJobs: fundi.stats.completedJobs,
        yearsOfExperience: fundi.yearsOfExperience,
        verificationStatus: fundi.verificationStatus,
        availability: fundi.availability,
        responseTime: fundi.stats.responseTime
      },
      isFallback: true,
      localityMatch: true,
      score: 50 // Base score for fallback matches
    }));

    res.status(200).json({
      success: true,
      data: {
        fundis: formattedFundis,
        message: `Found ${formattedFundis.length} fundis in ${county} county`,
        fallback: true,
        total: formattedFundis.length
      }
    });

  } catch (error) {
    logger.error('Locality fallback error:', error);
    res.status(500);
    throw new Error('Failed to find locality fallback fundis');
  }
});

// @desc    Update fundi matching preferences
// @route   PATCH /api/v1/matching/preferences
// @access  Private/Fundi
export const updateMatchingPreferences = asyncHandler(async (req, res) => {
  const {
    operatingCounties,
    operatingTowns,
    workingHours,
    workingDays,
    unavailableDates,
    preferredJobTypes,
    maxDistance,
    minJobValue,
    autoAcceptJobs,
    emergencyService
  } = req.body;

  // Get fundi profile
  const fundi = await Fundi.findOne({ user: req.user._id });
  if (!fundi) {
    res.status(404);
    throw new Error('Fundi profile not found');
  }

  // Update preferences
  const updateData = {};

  if (operatingCounties !== undefined) updateData.operatingCounties = operatingCounties;
  if (operatingTowns !== undefined) updateData.operatingTowns = operatingTowns;
  if (workingHours !== undefined) updateData.workingHours = workingHours;
  if (workingDays !== undefined) updateData.workingDays = workingDays;
  if (unavailableDates !== undefined) updateData.unavailableDates = unavailableDates.map(date => new Date(date));
  if (preferredJobTypes !== undefined) updateData.preferredJobTypes = preferredJobTypes;
  if (maxDistance !== undefined) updateData.maxDistance = parseInt(maxDistance);
  if (minJobValue !== undefined) updateData.minJobValue = parseFloat(minJobValue);
  if (autoAcceptJobs !== undefined) updateData.autoAcceptJobs = autoAcceptJobs === 'true';
  if (emergencyService !== undefined) updateData.emergencyService = emergencyService === 'true';

  // Update fundi preferences
  const updatedFundi = await Fundi.findByIdAndUpdate(
    fundi._id,
    { $set: updateData },
    { new: true, runValidators: true }
  ).populate('user', 'name email phone county town coordinates');

  // Clear cache for this fundi (if Redis enabled)
  if (redisClient) {
    try {
      const pattern = `matches:*`;
      const keys = await redisClient.keys(pattern);
      if (keys && keys.length > 0) {
        await redisClient.del(...keys);
      }
    } catch (cacheErr) {
      logger.warn('Failed to clear redis cache after updating fundi preferences', { error: cacheErr.message });
    }
  }

  logger.info('Fundi matching preferences updated', {
    fundiId: fundi._id,
    updates: Object.keys(updateData)
  });

  res.status(200).json({
    success: true,
    data: {
      message: 'Matching preferences updated successfully',
      preferences: {
        operatingCounties: updatedFundi.operatingCounties,
        operatingTowns: updatedFundi.operatingTowns,
        workingHours: updatedFundi.workingHours,
        workingDays: updatedFundi.workingDays,
        unavailableDates: updatedFundi.unavailableDates,
        preferredJobTypes: updatedFundi.preferredJobTypes,
        maxDistance: updatedFundi.maxDistance,
        minJobValue: updatedFundi.minJobValue,
        autoAcceptJobs: updatedFundi.autoAcceptJobs,
        emergencyService: updatedFundi.emergencyService
      }
    }
  });
});

// @desc    Get fundi matching statistics
// @route   GET /api/v1/matching/stats
// @access  Private/Fundi
export const getMatchingStats = asyncHandler(async (req, res) => {
  const fundi = await Fundi.findOne({ user: req.user._id });
  if (!fundi) {
    res.status(404);
    throw new Error('Fundi profile not found');
  }

  // Calculate matching statistics
  const stats = {
    totalJobsMatched: fundi.stats.totalJobs || 0,
    acceptanceRate: calculateAcceptanceRate(fundi),
    averageResponseTime: fundi.stats.responseTime || 0,
    matchScore: await calculateOverallMatchScore(fundi),
    topMatchingFactors: await getTopMatchingFactors(fundi),
    areasOfHighDemand: await getAreasOfHighDemand(fundi)
  };

  res.status(200).json({
    success: true,
    data: stats
  });
});

// @desc    Admin: Force match fundi to job
// @route   POST /api/v1/matching/admin/force-match
// @access  Private/Admin
export const adminForceMatch = asyncHandler(async (req, res) => {
  const { bookingId, fundiId, reason } = req.body;

  if (!bookingId || !fundiId) {
    res.status(400);
    throw new Error('Booking ID and Fundi ID are required');
  }

  // Find booking
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  // Find fundi
  const fundi = await Fundi.findById(fundiId).populate('user', 'name phone');
  if (!fundi) {
    res.status(404);
    throw new Error('Fundi not found');
  }

  // Check if fundi is available and verified
  if (fundi.verificationStatus !== 'verified') {
    res.status(400);
    throw new Error('Fundi must be verified to be force-matched');
  }

  if (fundi.availability !== 'available') {
    res.status(400);
    throw new Error('Fundi is not currently available');
  }

  // Update booking with forced match
  booking.fundi = fundi.user._id;
  booking.status = 'assigned';
  booking.assignedAt = new Date();
  booking.adminNotes = booking.adminNotes || [];
  booking.adminNotes.push({
    admin: req.user._id,
    note: `Force-matched to fundi ${fundi.user.name}. Reason: ${reason || 'Admin decision'}`,
    createdAt: new Date()
  });

  await booking.save();

  // Log admin force match
  logger.info('Admin force match completed', {
    adminId: req.user._id,
    bookingId: booking._id,
    fundiId: fundi._id,
    reason
  });

  res.status(200).json({
    success: true,
    data: {
      message: 'Fundi successfully force-matched to booking',
      booking: {
        _id: booking._id,
        description: booking.description,
        status: booking.status,
        assignedAt: booking.assignedAt
      },
      fundi: {
        _id: fundi._id,
        name: fundi.user.name,
        phone: fundi.user.phone,
        rating: fundi.stats.rating
      },
      assignedBy: req.user.name
    }
  });
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Calculate estimated price for a fundi
function getEstimatedPrice(fundi, service) {
  const fundiService = fundi.servicesOffered?.find(
    s => s.service && s.service._id.toString() === service._id.toString()
  );

  if (fundiService && fundiService.basePrice) {
    return fundiService.basePrice;
  }

  return (service.minPrice + service.maxPrice) / 2;
}

// Calculate distance for display
function calculateDistanceForDisplay(jobLocation, fundiUser) {
  if (!jobLocation.coordinates || !fundiUser.coordinates) {
    return 'Unknown';
  }

  const distance = matchingService.calculateDistance(
    jobLocation.coordinates,
    fundiUser.coordinates
  );

  if (distance < 1) {
    return '< 1 km';
  } else {
    return `${Math.round(distance)} km`;
  }
}

// Calculate emergency score
async function calculateEmergencyScore(fundi, job) {
  const breakdown = await matchingService.getScoreBreakdown(fundi, job);
  
  const emergencyWeights = {
    location: 0.35,
    rating: 0.15,
    expertise: 0.10,
    responseTime: 0.30,
    availability: 0.05,
    price: 0.03,
    completionRate: 0.02
  };

  return Object.keys(breakdown).reduce((total, category) => {
    return total + (breakdown[category] * emergencyWeights[category]);
  }, 0);
}

// Calculate estimated arrival time
function calculateEstimatedArrival(fundi, job) {
  if (!job.location.coordinates || !fundi.user.coordinates) {
    return 'Unknown';
  }

  const distance = matchingService.calculateDistance(
    job.location.coordinates,
    fundi.user.coordinates
  );

  const travelTimeHours = distance / 30;
  const travelTimeMinutes = Math.ceil(travelTimeHours * 60);
  const totalMinutes = travelTimeMinutes + 15;

  if (totalMinutes <= 30) {
    return 'Within 30 minutes';
  } else if (totalMinutes <= 60) {
    return 'Within 1 hour';
  } else if (totalMinutes <= 120) {
    return 'Within 2 hours';
  } else {
    return 'More than 2 hours';
  }
}

// Generate emergency contact instructions
function generateEmergencyContactInstructions(fundi) {
  const instructions = [
    'This is an emergency service request',
    'Fundi has been notified and is expected to respond immediately',
    'Please keep your phone accessible for confirmation calls'
  ];

  if (fundi.emergencyService) {
    instructions.push('This fundi specializes in emergency services');
  }

  return instructions;
}

// Calculate acceptance rate
function calculateAcceptanceRate(fundi) {
  const totalOffers = fundi.stats.jobOffers || 0;
  const acceptedOffers = fundi.stats.acceptedJobs || 0;

  if (totalOffers === 0) return 0;
  return Math.round((acceptedOffers / totalOffers) * 100);
}

// Calculate overall match score for fundi
async function calculateOverallMatchScore(fundi) {
  let baseScore = fundi.stats.rating * 20 || 50;

  if (fundi.verificationStatus === 'verified') {
    baseScore += 10;
  }

  if (fundi.yearsOfExperience > 5) {
    baseScore += 10;
  } else if (fundi.yearsOfExperience > 2) {
    baseScore += 5;
  }

  const completionRate = fundi.stats.completedJobs / (fundi.stats.totalJobs || 1);
  if (completionRate > 0.9) {
    baseScore += 10;
  } else if (completionRate > 0.7) {
    baseScore += 5;
  }

  return Math.min(baseScore, 100);
}

// Get top matching factors for fundi
async function getTopMatchingFactors(fundi) {
  const factors = [];

  if (fundi.stats.rating >= 4.5) {
    factors.push('High rating');
  }

  if (fundi.yearsOfExperience >= 5) {
    factors.push('Extensive experience');
  }

  if (fundi.verificationStatus === 'verified') {
    factors.push('Fully verified');
  }

  if (fundi.stats.responseTime <= 30) {
    factors.push('Fast response time');
  }

  if (fundi.isPremium) {
    factors.push('Premium fundi');
  }

  return factors.slice(0, 3);
}

// Get areas of high demand for fundi
async function getAreasOfHighDemand(fundi) {
  return fundi.operatingCounties.slice(0, 3);
}

// Helper function for fallback messages
function getFallbackMessage(strategy) {
  const messages = {
    strict: 'Best matches found using strict criteria',
    relaxed_rating: 'Matches found with relaxed rating requirements',
    relaxed_availability: 'Matches include currently unavailable fundis',
    same_locality: 'Matches from your locality (may be further away)',
    emergency_fallback: 'Emergency fallback matches found',
    none: 'No matches available'
  };
  return messages[strategy] || 'Matches found';
}