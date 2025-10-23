// controllers/matchingController.js
import matchingService from '../services/matchingService.js';
import Booking from '../models/Booking.js';
import Fundi from '../models/Fundi.js';
// import User from '../models/User.js';
import ServiceCategory from '../models/ServiceCategory.js';
import asyncHandler from 'express-async-handler';
import logger from '../middleware/logger.js';

// @desc    Find matching fundis for a job
// @route   POST /api/v1/matching/find-fundis
// @access  Private/Client,Admin
export const findMatchingFundis = asyncHandler(async (req, res) => {
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
    considerAvailability = true
  } = req.body;

  // Validate required fields
  if (!serviceCategory || !description || !location) {
    res.status(400);
    throw new Error('Service category, description, and location are required');
  }

  // Validate service category exists
  const service = await ServiceCategory.findById(serviceCategory);
  if (!service) {
    res.status(404);
    throw new Error('Service category not found');
  }

  // Validate location structure
  if (!location.county) {
    res.status(400);
    throw new Error('Location must include county');
  }

  // Create job object for matching
  const job = {
    _id: `temp_${Date.now()}`, // Temporary ID for matching
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
    client: req.user._id
  };

  // Set matching options
  const matchingOptions = {
    maxResults: parseInt(maxResults),
    minRating: parseFloat(minRating),
    maxDistance: parseInt(maxDistance),
    considerAvailability: considerAvailability === 'true'
  };

  try {
    // Find matching fundis
    const matches = await matchingService.findBestFundis(job, matchingOptions);

    // Format response
    const formattedMatches = matches.map(match => ({
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
        portfolio: match.fundi.portfolio?.slice(0, 3) || [] // First 3 portfolio items
      },
      score: Math.round(match.score * 100) / 100, // Round to 2 decimal places
      breakdown: {
        location: Math.round(match.breakdown.location),
        rating: Math.round(match.breakdown.rating),
        expertise: Math.round(match.breakdown.expertise),
        responseTime: Math.round(match.breakdown.responseTime),
        availability: Math.round(match.breakdown.availability),
        price: Math.round(match.breakdown.price),
        completionRate: Math.round(match.breakdown.completionRate)
      },
      estimatedPrice: getEstimatedPrice(match.fundi, service),
      distance: calculateDistanceForDisplay(job.location, match.fundi.user)
    }));

    // Log matching activity for analytics
    logger.info('Matching completed', {
      jobId: job._id,
      clientId: req.user._id,
      serviceCategory,
      matchesFound: formattedMatches.length,
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
    preferredDate: preferredDate ? new Date(preferredDate) : new Date(), // Today for emergency
    preferredTime: preferredTime || 'ASAP',
    urgency: 'emergency',
    client: req.user._id
  };

  try {
    // Find emergency match
    const emergencyFundi = await matchingService.emergencyMatch(job, {
      maxDistance: parseInt(maxDistance),
      minRating: parseFloat(minRating)
    });

    if (!emergencyFundi) {
      return res.status(404).json({
        success: false,
        error: 'No available fundis found for emergency service. Please try normal matching or contact support.',
        data: {
          suggestion: 'Try increasing the search distance or lowering the minimum rating requirement'
        }
      });
    }

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
          phone: emergencyFundi.user.phone // Include phone for emergency
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
      contactInstructions: generateEmergencyContactInstructions(emergencyFundi)
    };

    // Log emergency match for monitoring
    logger.info('Emergency match completed', {
      jobId: job._id,
      clientId: req.user._id,
      fundiId: emergencyFundi._id,
      emergencyScore,
      estimatedArrival: emergencyMatch.estimatedArrival
    });

    // TODO: Send immediate notification to fundi about emergency job
    // await notificationService.createEmergencyJobNotification(emergencyFundi.user._id, job);

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

  if (operatingCounties !== undefined) {
    updateData.operatingCounties = operatingCounties;
  }

  if (operatingTowns !== undefined) {
    updateData.operatingTowns = operatingTowns;
  }

  if (workingHours !== undefined) {
    updateData.workingHours = workingHours;
  }

  if (workingDays !== undefined) {
    updateData.workingDays = workingDays;
  }

  if (unavailableDates !== undefined) {
    updateData.unavailableDates = unavailableDates.map(date => new Date(date));
  }

  if (preferredJobTypes !== undefined) {
    updateData.preferredJobTypes = preferredJobTypes;
  }

  if (maxDistance !== undefined) {
    updateData.maxDistance = parseInt(maxDistance);
  }

  if (minJobValue !== undefined) {
    updateData.minJobValue = parseFloat(minJobValue);
  }

  if (autoAcceptJobs !== undefined) {
    updateData.autoAcceptJobs = autoAcceptJobs === 'true';
  }

  if (emergencyService !== undefined) {
    updateData.emergencyService = emergencyService === 'true';
  }

  // Update fundi preferences
  const updatedFundi = await Fundi.findByIdAndUpdate(
    fundi._id,
    { $set: updateData },
    { new: true, runValidators: true }
  ).populate('user', 'name email phone county town coordinates');

  // Log preference update
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

  // TODO: Send notifications to both fundi and client
  // await notificationService.createForceMatchNotifications(booking, fundi, req.user);

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
    s => s.service._id.toString() === service._id.toString()
  );

  if (fundiService && fundiService.basePrice) {
    return fundiService.basePrice;
  }

  // Fallback to service average
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
  } else if (distance <= 10) {
    return `${Math.round(distance)} km`;
  } else {
    return `${Math.round(distance)} km`;
  }
}

// Calculate emergency score
async function calculateEmergencyScore(fundi, job) {
  const breakdown = await matchingService.getScoreBreakdown(fundi, job);
  
  // Emergency weights: higher priority on location and response time
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

  // Assume average speed of 30 km/h in urban areas
  const travelTimeHours = distance / 30;
  const travelTimeMinutes = Math.ceil(travelTimeHours * 60);

  // Add buffer for preparation
  const totalMinutes = travelTimeMinutes + 15; // 15 minutes preparation

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
  // This would be a comprehensive score based on fundi's profile and performance
  let baseScore = fundi.stats.rating * 20 || 50; // Convert 5-star to 100 scale

  // Bonus for verification
  if (fundi.verificationStatus === 'verified') {
    baseScore += 10;
  }

  // Bonus for experience
  if (fundi.yearsOfExperience > 5) {
    baseScore += 10;
  } else if (fundi.yearsOfExperience > 2) {
    baseScore += 5;
  }

  // Bonus for completion rate
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

  return factors.slice(0, 3); // Return top 3 factors
}

// Get areas of high demand for fundi
async function getAreasOfHighDemand(fundi) {
  // This would typically query booking data to find areas with high demand
  // For now, return fundi's operating areas
  return fundi.operatingCounties.slice(0, 3);
}

