import Fundi from '../models/Fundi.js';
// import ServiceCategory from '../models/ServiceCategory.js';
import logger from '../middleware/logger.js';

// Try to import Redis, but fall back to an in-memory cache if unavailable
let cache = null;

class MemoryCache {
  constructor() {
    this.store = new Map();
  }

  // Normalize different coordinate shapes to { latitude, longitude }
  normalizeCoordinates(coord) {
    if (!coord) return null;

    // Array [lng, lat] or [lat, lng]
    if (Array.isArray(coord) && coord.length >= 2) {
      const [a, b] = coord;
      // Heuristic: if values look like lng/lat (lng around 36), assume [lng, lat]
      if (Math.abs(a) > 90) {
        return { latitude: Number(b), longitude: Number(a) };
      }
      return { latitude: Number(a), longitude: Number(b) };
    }

    // Object shapes
    if (typeof coord === 'object') {
      if (coord.latitude !== undefined || coord.longitude !== undefined) {
        return { latitude: Number(coord.latitude), longitude: Number(coord.longitude) };
      }
      if (coord.lat !== undefined || coord.lng !== undefined) {
        return { latitude: Number(coord.lat), longitude: Number(coord.lng) };
      }
    }

    return null;
  }

  async get(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }

  async setex(key, seconds, value) {
    this.store.set(key, value);
    setTimeout(() => {
      this.store.delete(key);
    }, seconds * 1000);
    return 'OK';
  }

  async del(keyOrKeys) {
    if (Array.isArray(keyOrKeys)) {
      let count = 0;
      for (const k of keyOrKeys) {
        if (this.store.delete(k)) count++;
      }
      return count;
    }
    return this.store.delete(keyOrKeys) ? 1 : 0;
  }

  async keys(pattern) {
    const regex = new RegExp('^' + pattern.split('*').map(s => s.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')).join('.*') + '$');
    const matches = [];
    for (const key of this.store.keys()) {
      if (regex.test(key)) matches.push(key);
    }
    return matches;
  }
}

// Initialize with in-memory cache; try to replace with Redis client if available
cache = new MemoryCache();
(async () => {
  try {
    const mod = await import('../config/redis.js');
    const redisClient = mod && mod.default ? mod.default : mod;
    if (redisClient) {
      cache = redisClient;
      logger.info('Redis cache enabled for matching service');
    }
  } catch (err) {
    logger.warn('Redis not configured for matching service, using in-memory cache');
  }
})();

class MatchingService {
  constructor() {
    this.weights = {
      location: 0.25,
      rating: 0.20,
      expertise: 0.15,
      responseTime: 0.15,
      availability: 0.10,
      price: 0.10,
      completionRate: 0.05
    };
    
    // Fallback strategies in order of relaxation
    this.fallbackStrategies = [
      {
        name: 'strict',
        minRating: 3.0,
        maxDistance: 50,
        considerAvailability: true,
        requireVerification: true
      },
      {
        name: 'relaxed_rating',
        minRating: 2.0,
        maxDistance: 50,
        considerAvailability: true,
        requireVerification: true
      },
      {
        name: 'relaxed_availability',
        minRating: 2.0,
        maxDistance: 50,
        considerAvailability: false,
        requireVerification: true
      },
      {
        name: 'same_locality',
        minRating: 0,
        maxDistance: null,
        considerAvailability: false,
        requireVerification: true,
        sameCountyOnly: true
      },
      {
        name: 'emergency_fallback',
        minRating: 0,
        maxDistance: null,
        considerAvailability: false,
        requireVerification: false,
        sameCountyOnly: false
      }
    ];
  }

  // Main matching function with fallback
  async findBestFundis(job, options = {}) {
    try {
      const {
        maxResults = 10,
        enableFallback = true,
        //fallbackStrategy = 'auto'
      } = options;

      // Generate cache key for matching results
      const cacheKey = `matches:${job._id}:${JSON.stringify(options)}`;
      
      // Try to get cached results from the active cache (Redis or in-memory)
      try {
        const cachedRaw = await cache.get(cacheKey);
        if (cachedRaw) {
          logger.info(`Returning cached matches for job: ${job._id}`);
          const cached = typeof cachedRaw === 'string' ? JSON.parse(cachedRaw) : cachedRaw;
          return cached;
        }
      } catch (err) {
        logger.warn('Cache get failed in matching service, continuing without cache', err);
      }

      let fundis = [];
      let strategyUsed = 'strict';
      
      // Try each fallback strategy until we find fundis
      for (const strategy of this.fallbackStrategies) {
        if (!enableFallback && strategy.name !== 'strict') break;
        
        fundis = await this.getPotentialFundis(job, {
          minRating: strategy.minRating,
          maxDistance: strategy.maxDistance,
          considerAvailability: strategy.considerAvailability,
          requireVerification: strategy.requireVerification,
          sameCountyOnly: strategy.sameCountyOnly
        });

        strategyUsed = strategy.name;
        
        if (fundis.length > 0) {
          logger.info(`Found ${fundis.length} fundis using strategy: ${strategy.name} for job ${job._id}`);
          break;
        }
        
        logger.warn(`No fundis found with strategy: ${strategy.name} for job ${job._id}`);
      }

      if (fundis.length === 0) {
        logger.error(`No fundis found even after all fallback strategies for job: ${job._id}`);
        return {
          matches: [],
          fallbackUsed: 'none',
          message: 'No fundis available in your area'
        };
      }

      // Calculate scores for each fundi
      const scoredFundis = await Promise.all(
        fundis.map(async (fundi) => {
          const score = await this.calculateFundiScore(fundi, job);
          return { fundi, score };
        })
      );

      // Sort by score descending
      scoredFundis.sort((a, b) => b.score - a.score);

      // Return top results
      const topFundis = scoredFundis.slice(0, maxResults);

      // Compute breakdowns in parallel
      const resultsWithBreakdowns = await Promise.all(
        topFundis.map(async (item) => ({
          fundi: item.fundi,
          score: item.score,
          breakdown: await this.getScoreBreakdown(item.fundi, job),
          matchQuality: this.getMatchQuality(item.score, strategyUsed)
        }))
      );

      const result = {
        matches: resultsWithBreakdowns,
        fallbackUsed: strategyUsed,
        totalAvailable: fundis.length
      };

      // Cache the results for 5 minutes (works with Redis or in-memory cache)
      try {
        if (cache && typeof cache.setex === 'function') {
          await cache.setex(cacheKey, 300, JSON.stringify(result));
        }
      } catch (err) {
        logger.warn('Cache set failed in matching service, continuing without caching', err);
      }

      logger.info(`Found ${topFundis.length} matching fundis for job ${job._id} using ${strategyUsed} strategy`);

      return result;

    } catch (error) {
      logger.error('Error in matching service:', error);
      throw error;
    }
  }

  // Get potential fundis based on criteria
  async getPotentialFundis(job, options) {
    const {
      minRating = 3.0,
      maxDistance = 50,
      considerAvailability = true,
      requireVerification = true,
      sameCountyOnly = false
    } = options;

    // Base query
    let query = {
      'servicesOffered.service': job.serviceCategory
    };

    // Verification filter
    if (requireVerification) {
      query['verification.overallStatus'] = 'verified';
    }

    // Rating filter
    if (minRating > 0) {
      query['stats.rating'] = { $gte: minRating };
    }

    // Availability filter
    if (considerAvailability) {
      query.availability = 'available';
    }

    // Location filtering
    // Normalize incoming job coordinates to { latitude, longitude } if possible
    const jobCoords = this.normalizeCoordinates(job.location?.coordinates);
    if (job.location?.county) {
      if (sameCountyOnly) {
        query.operatingCounties = job.location.county;
      } else if (jobCoords && maxDistance) {
        // Use geospatial query if coordinates available
        query.location = {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: [jobCoords.longitude, jobCoords.latitude]
            },
            $maxDistance: maxDistance * 1000 // Convert to meters
          }
        };
      } else {
        query.operatingCounties = job.location.county;
      }
    }

    try {
      // Get fundis with populated data
      const fundis = await Fundi.find(query)
        .populate('user', 'firstName lastName profilePhoto county town coordinates')
        .populate('servicesOffered.service');

      // If using JavaScript distance calculation as fallback
      let filteredFundis = fundis;
      const normalizedJobCoords = this.normalizeCoordinates(job.location?.coordinates);
      if (normalizedJobCoords && maxDistance && !sameCountyOnly) {
        filteredFundis = fundis.filter(fundi => {
          const fCoords = this.normalizeCoordinates(fundi.user?.coordinates);
          return fCoords && this.calculateDistance(normalizedJobCoords, fCoords) <= maxDistance;
        });
      }

      // Fallback to county matches if no distance-based matches
      if (filteredFundis.length === 0 && fundis.length > 0 && sameCountyOnly) {
        logger.info(`Falling back to ${fundis.length} fundis in same county without distance filtering`);
        return fundis;
      }

      return filteredFundis;
    } catch (error) {
      logger.error('Error fetching potential fundis:', error);
      return [];
    }
  }

  // Calculate overall score for a fundi
  async calculateFundiScore(fundi, job) {
    const breakdown = await this.getScoreBreakdown(fundi, job);
    
    // Use client weights if provided in job
    const weights = job.preferences?.weights || this.weights;
    
    return Object.keys(breakdown).reduce((total, category) => {
      return total + (breakdown[category] * weights[category]);
    }, 0);
  }

  // Get detailed score breakdown
  async getScoreBreakdown(fundi, job) {
    return {
      location: await this.calculateLocationScore(fundi, job),
      rating: this.calculateRatingScore(fundi),
      expertise: this.calculateExpertiseScore(fundi, job),
      responseTime: this.calculateResponseTimeScore(fundi),
      availability: await this.calculateAvailabilityScore(fundi, job),
      price: this.calculatePriceScore(fundi, job),
      completionRate: this.calculateCompletionRateScore(fundi)
    };
  }

  // Location scoring (0-100)
  async calculateLocationScore(fundi, job) {
    const jobCoords = this.normalizeCoordinates(job.location?.coordinates);
    const fundiCoords = this.normalizeCoordinates(fundi.user?.coordinates);

    if (!jobCoords || !fundiCoords) {
      // Fallback to county/town matching
      if (fundi.operatingCounties.includes(job.location.county)) {
        return fundi.operatingTowns.includes(job.location.town) ? 90 : 70;
      }
      return 50;
    }

    const distance = this.calculateDistance(jobCoords, fundiCoords);

    // Score based on distance (lower distance = higher score)
    if (distance <= 5) return 100;
    if (distance <= 10) return 90;
    if (distance <= 20) return 80;
    if (distance <= 30) return 70;
    if (distance <= 50) return 60;
    return 30;
  }

  // Rating scoring (0-100)
  calculateRatingScore(fundi) {
    const rating = fundi.stats.rating || 0;
    return (rating / 5) * 100;
  }

  // Expertise scoring (0-100)
  calculateExpertiseScore(fundi, job) {
    let score = 50;

    // Years of experience
    const experience = fundi.yearsOfExperience || 0;
    score += Math.min(experience * 5, 25);

    // Specialization match
    const service = fundi.servicesOffered?.find(
      s => s.service && s.service._id.toString() === job.serviceCategory.toString()
    );

    if (service && service.service) {
      const serviceCategory = service.service;
      const priceDifference = Math.abs(service.basePrice - (serviceCategory.basePrice || 0));
      const priceRatio = serviceCategory.basePrice ? priceDifference / serviceCategory.basePrice : 0;
      
      if (priceRatio <= 0.1) score += 15;
      else if (priceRatio <= 0.2) score += 10;
      else if (priceRatio <= 0.3) score += 5;
    }

    // Certifications bonus
    if (fundi.certifications && fundi.certifications.length > 0) {
      score += 10;
    }

    return Math.min(score, 100);
  }

  // Response time scoring (0-100)
  calculateResponseTimeScore(fundi) {
    const responseTime = fundi.stats.responseTime || 0;
    
    if (responseTime === 0) return 80;
    
    if (responseTime <= 15) return 100;
    if (responseTime <= 30) return 90;
    if (responseTime <= 60) return 80;
    if (responseTime <= 120) return 60;
    if (responseTime <= 240) return 40;
    return 20;
  }

  // Availability scoring (0-100)
  async calculateAvailabilityScore(fundi, job) {
    let score = 70;

    // Check if fundi has marked unavailable dates
    if (job.preferredDate && fundi.unavailableDates) {
      const preferredDate = new Date(job.preferredDate);
      const isUnavailable = fundi.unavailableDates.some(date => 
        new Date(date).toDateString() === preferredDate.toDateString()
      );

      if (isUnavailable) {
        return 0;
      }
      score += 10;
    }

    // Check current workload
    const ongoingJobs = fundi.stats.ongoingJobs || 0;
    if (ongoingJobs === 0) score += 20;
    else if (ongoingJobs === 1) score += 10;
    else if (ongoingJobs >= 3) score -= 10;

    // Check working hours if job has preferred time
    if (job.preferredTime) {
      score += 5;
    }

    return Math.min(score, 100);
  }

  // Price scoring (0-100)
  calculatePriceScore(fundi, job) {
    const service = fundi.servicesOffered?.find(
      s => s.service && s.service._id.toString() === job.serviceCategory.toString()
    );

    if (!service || !job.budget) return 50;

    const fundiPrice = service.basePrice;
    const clientMaxBudget = job.budget.max;

    if (fundiPrice <= clientMaxBudget) {
      const budgetRatio = fundiPrice / clientMaxBudget;
      return Math.max(60, 100 * (1 - budgetRatio * 0.4));
    }

    const overageRatio = (fundiPrice - clientMaxBudget) / clientMaxBudget;
    return Math.max(0, 50 * (1 - overageRatio));
  }

  // Completion rate scoring (0-100)
  calculateCompletionRateScore(fundi) {
    const totalJobs = fundi.stats.totalJobs || 0;
    const completedJobs = fundi.stats.completedJobs || 0;

    if (totalJobs === 0) return 70;

    const completionRate = completedJobs / totalJobs;
    return completionRate * 100;
  }

  // Calculate distance between two coordinates using Haversine formula
  calculateDistance(coord1, coord2) {
    if (!coord1 || !coord2 || !coord1.latitude || !coord1.longitude || 
        !coord2.latitude || !coord2.longitude) {
      return Infinity;
    }

    const R = 6371;
    const dLat = this.deg2rad(coord2.latitude - coord1.latitude);
    const dLon = this.deg2rad(coord2.longitude - coord1.longitude);

    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(coord1.latitude)) * Math.cos(this.deg2rad(coord2.latitude)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;

    return distance;
  }

  deg2rad(deg) {
    return deg * (Math.PI/180);
  }

  // Normalize different coordinate shapes to { latitude, longitude }
  normalizeCoordinates(coord) {
    if (!coord) return null;

    // Array [lng, lat] or [lat, lng]
    if (Array.isArray(coord) && coord.length >= 2) {
      const [a, b] = coord;
      // Heuristic: if values look like lng/lat (lng around 36), assume [lng, lat]
      if (Math.abs(a) > 90) {
        return { latitude: Number(b), longitude: Number(a) };
      }
      return { latitude: Number(a), longitude: Number(b) };
    }

    // Object shapes
    if (typeof coord === 'object') {
      if (coord.latitude !== undefined || coord.longitude !== undefined) {
        return { latitude: Number(coord.latitude), longitude: Number(coord.longitude) };
      }
      if (coord.lat !== undefined || coord.lng !== undefined) {
        return { latitude: Number(coord.lat), longitude: Number(coord.lng) };
      }
    }

    return null;
  }

  // Determine match quality based on score and strategy
  getMatchQuality(score, strategy) {
    if (strategy === 'strict' && score >= 80) return 'excellent';
    if (strategy === 'strict') return 'good';
    if (strategy === 'relaxed_rating') return 'fair';
    if (strategy === 'relaxed_availability') return 'basic';
    if (strategy === 'same_locality') return 'locality_fallback';
    if (strategy === 'emergency_fallback') return 'emergency_fallback';
    return 'poor';
  }

  // Get locality-based fallback fundis
  async getLocalityFallbackFundis(job, limit = 10) {
    if (!job.location.county) {
      throw new Error('Location county is required for locality fallback');
    }

    const fundis = await Fundi.find({
      'operatingCounties': job.location.county,
      'servicesOffered.service': job.serviceCategory
    })
    .populate('user', 'firstName lastName profilePhoto county town coordinates')
    .populate('servicesOffered.service')
    .limit(limit);

    logger.info(`Found ${fundis.length} locality fallback fundis in ${job.location.county} for service ${job.serviceCategory}`);

    return fundis;
  }

  // Emergency matching with fallback
  async emergencyMatch(job, options = {}) {
    const {
      maxDistance = 25,
      minRating = 4.0,
      enableFallback = true
    } = options;

    let potentialFundis = await this.getPotentialFundis(job, {
      minRating,
      maxDistance,
      considerAvailability: true,
      requireVerification: true
    });

    // Emergency fallback
    if (potentialFundis.length === 0 && enableFallback) {
      logger.warn(`No fundis found for emergency match, using locality fallback for job: ${job._id}`);
      
      potentialFundis = await this.getPotentialFundis(job, {
        minRating: 3.0,
        maxDistance: 50,
        considerAvailability: false,
        requireVerification: true,
        sameCountyOnly: true
      });
    }

    if (potentialFundis.length === 0) {
      return null;
    }

    const emergencyScored = await Promise.all(
      potentialFundis.map(async (fundi) => {
        const proximityScore = await this.calculateLocationScore(fundi, job);
        const responseScore = this.calculateResponseTimeScore(fundi);
        
        const emergencyScore = (proximityScore * 0.7) + (responseScore * 0.3);
        
        return { fundi, emergencyScore };
      })
    );

    emergencyScored.sort((a, b) => b.emergencyScore - a.emergencyScore);
    
    return {
      fundi: emergencyScored[0]?.fundi || null,
      fallbackUsed: potentialFundis.length > 0 ? 'emergency_fallback' : 'none',
      totalOptions: potentialFundis.length
    };
  }

  // Bulk matching for corporate clients
  async bulkMatch(jobs, options = {}) {
    const results = {};

    for (const job of jobs) {
      try {
        const matches = await this.findBestFundis(job, options);
        results[job._id] = {
          job,
          matches: matches.matches?.slice(0, 3) || []
        };
      } catch (error) {
        logger.error(`Error matching job ${job._id}:`, error);
        results[job._id] = {
          job,
          matches: [],
          error: error.message
        };
      }
    }

    return results;
  }

  // Update fundi stats based on completed job
  async updateFundiStats(fundiId, jobData) {
    try {
      const fundi = await Fundi.findById(fundiId);
      if (!fundi) return;

      // Update response time
      if (jobData.responseTime) {
        const currentAvg = fundi.stats.responseTime || 0;
        const totalJobs = fundi.stats.totalJobs || 0;
        
        fundi.stats.responseTime = (
          (currentAvg * totalJobs) + jobData.responseTime
        ) / (totalJobs + 1);
      }

      // Update completion rate
      fundi.stats.totalJobs += 1;
      if (jobData.completedSuccessfully) {
        fundi.stats.completedJobs += 1;
      }

      // Update rating if provided
      if (jobData.rating) {
        const currentRating = fundi.stats.rating || 0;
        const totalRatings = fundi.stats.totalJobs || 1;
        
        fundi.stats.rating = (
          (currentRating * (totalRatings - 1)) + jobData.rating
        ) / totalRatings;
      }

      await fundi.save();
      
      // Clear relevant cache entries (works with Redis or in-memory cache)
      try {
        if (cache && typeof cache.keys === 'function' && typeof cache.del === 'function') {
          const pattern = `matches:*`;
          const keys = await cache.keys(pattern);
          if (keys && keys.length > 0) {
            await cache.del(keys);
          }
        }
      } catch (err) {
        logger.warn('Cache clear failed in matching service after stats update', err);
      }
      
      logger.info(`Updated stats for fundi: ${fundiId}`);
    } catch (error) {
      logger.error(`Error updating fundi stats for ${fundiId}:`, error);
    }
  }
}

// Create singleton instance
const matchingService = new MatchingService();
export default matchingService;