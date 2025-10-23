import Fundi from '../models/Fundi.js';
//import Booking from '../models/Booking.js';
//import ServiceCategory from '../models/ServiceCategory.js';
import logger from '../middleware/logger.js';

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
  }

  // Main matching function
  async findBestFundis(job, options = {}) {
    try {
      const {
        maxResults = 10,
        minRating = 3.0,
        maxDistance = 50, // km
        considerAvailability = true
      } = options;

      // Get potential fundis based on service and basic criteria
      let fundis = await this.getPotentialFundis(job, {
        minRating,
        maxDistance,
        considerAvailability
      });

      if (fundis.length === 0) {
        logger.warn(`No fundis found for job: ${job._id}`);
        return [];
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

      logger.info(`Found ${topFundis.length} matching fundis for job ${job._id}`);

      // Compute breakdowns in parallel
      const resultsWithBreakdowns = await Promise.all(
        topFundis.map(async (item) => ({
          fundi: item.fundi,
          score: item.score,
          breakdown: await this.getScoreBreakdown(item.fundi, job)
        }))
      );

      return resultsWithBreakdowns;
    } catch (error) {
      logger.error('Error in matching service:', error);
      throw error;
    }
  }

  // Get potential fundis based on basic criteria
  async getPotentialFundis(job, options) {
    const {
      minRating,
      maxDistance,
      considerAvailability
    } = options;

    // Base query
    let query = {
      'verification.overallStatus': 'verified',
      'servicesOffered.service': job.serviceCategory,
      'stats.rating': { $gte: minRating }
    };

    // Availability filter
    if (considerAvailability) {
      query.availability = 'available';
    }

    // Location filter (if coordinates available)
    if (job.location.coordinates && maxDistance) {
      // This would use MongoDB's geospatial queries in production
      // For now, we'll filter by county
      query.operatingCounties = job.location.county;
    }

    // Get fundis with populated data
    const fundis = await Fundi.find(query)
      .populate('user', 'firstName lastName profilePhoto county town coordinates')
      .populate('servicesOffered.service')
      .populate('servicesOffered.service');

    // Additional filtering by distance if coordinates are available
    if (job.location.coordinates && maxDistance) {
      return fundis.filter(fundi => 
        this.calculateDistance(
          job.location.coordinates,
          fundi.user.coordinates
        ) <= maxDistance
      );
    }

    return fundis;
  }

  // Calculate overall score for a fundi
  async calculateFundiScore(fundi, job) {
    const breakdown = await this.getScoreBreakdown(fundi, job);
    
    return Object.keys(breakdown).reduce((total, category) => {
      return total + (breakdown[category] * this.weights[category]);
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
    if (!job.location.coordinates || !fundi.user.coordinates) {
      // Fallback to county/town matching
      if (fundi.operatingCounties.includes(job.location.county)) {
        return fundi.operatingTowns.includes(job.location.town) ? 90 : 70;
      }
      return 50;
    }

    const distance = this.calculateDistance(
      job.location.coordinates,
      fundi.user.coordinates
    );

    // Score based on distance (lower distance = higher score)
    if (distance <= 5) return 100;    // Within 5km
    if (distance <= 10) return 90;    // Within 10km
    if (distance <= 20) return 80;    // Within 20km
    if (distance <= 30) return 70;    // Within 30km
    if (distance <= 50) return 60;    // Within 50km
    return 30;                        // Beyond 50km
  }

  // Rating scoring (0-100)
  calculateRatingScore(fundi) {
    const rating = fundi.stats.rating || 0;
    // Convert 0-5 rating to 0-100 score
    return (rating / 5) * 100;
  }

  // Expertise scoring (0-100)
  calculateExpertiseScore(fundi, job) {
    let score = 50; // Base score

    // Years of experience
    const experience = fundi.yearsOfExperience || 0;
    score += Math.min(experience * 5, 25); // Max 25 points for experience

    // Specialization match
    const service = fundi.servicesOffered.find(
      s => s.service._id.toString() === job.serviceCategory.toString()
    );

    if (service) {
      // Price competitiveness (closer to service base price is better)
      const serviceCategory = service.service;
      const priceDifference = Math.abs(service.basePrice - serviceCategory.basePrice);
      const priceRatio = priceDifference / serviceCategory.basePrice;
      
      if (priceRatio <= 0.1) score += 15; // Within 10%
      else if (priceRatio <= 0.2) score += 10; // Within 20%
      else if (priceRatio <= 0.3) score += 5; // Within 30%
    }

    // Certifications bonus
    if (fundi.certifications && fundi.certifications.length > 0) {
      score += 10;
    }

    return Math.min(score, 100);
  }

  // Response time scoring (0-100)
  calculateResponseTimeScore(fundi) {
    const responseTime = fundi.stats.responseTime || 0; // in minutes
    
    if (responseTime === 0) return 80; // No data, assume average
    
    if (responseTime <= 15) return 100;  // Within 15 minutes
    if (responseTime <= 30) return 90;   // Within 30 minutes
    if (responseTime <= 60) return 80;   // Within 1 hour
    if (responseTime <= 120) return 60;  // Within 2 hours
    if (responseTime <= 240) return 40;  // Within 4 hours
    return 20;                           // More than 4 hours
  }

  // Availability scoring (0-100)
  async calculateAvailabilityScore(fundi, job) {
    let score = 70; // Base score for available fundis

    // Check if fundi has marked unavailable dates
    if (job.preferredDate && fundi.unavailableDates) {
      const preferredDate = new Date(job.preferredDate);
      const isUnavailable = fundi.unavailableDates.some(date => 
        new Date(date).toDateString() === preferredDate.toDateString()
      );

      if (isUnavailable) {
        return 0;
      }
      score += 10; // Bonus for being available on preferred date
    }

    // Check current workload
    const ongoingJobs = fundi.stats.ongoingJobs || 0;
    if (ongoingJobs === 0) score += 20;
    else if (ongoingJobs === 1) score += 10;
    else if (ongoingJobs >= 3) score -= 10;

    // Check working hours if job has preferred time
    if (job.preferredTime) {
      // Simple check - in production, this would verify against workingHours
      score += 5;
    }

    return Math.min(score, 100);
  }

  // Price scoring (0-100)
  calculatePriceScore(fundi, job) {
    const service = fundi.servicesOffered.find(
      s => s.service._id.toString() === job.serviceCategory.toString()
    );

    if (!service || !job.budget) return 50;

    const fundiPrice = service.basePrice;
    const clientMaxBudget = job.budget.max;

    if (fundiPrice <= clientMaxBudget) {
      // Lower price gets higher score, but not too low (quality concern)
      const budgetRatio = fundiPrice / clientMaxBudget;
      return Math.max(60, 100 * (1 - budgetRatio * 0.4)); // 60-100 range
    }

    // Over budget - score decreases with overage
    const overageRatio = (fundiPrice - clientMaxBudget) / clientMaxBudget;
    return Math.max(0, 50 * (1 - overageRatio));
  }

  // Completion rate scoring (0-100)
  calculateCompletionRateScore(fundi) {
    const totalJobs = fundi.stats.totalJobs || 0;
    const completedJobs = fundi.stats.completedJobs || 0;

    if (totalJobs === 0) return 70; // No history, assume average

    const completionRate = completedJobs / totalJobs;
    return completionRate * 100;
  }

  // Calculate distance between two coordinates using Haversine formula
  calculateDistance(coord1, coord2) {
    if (!coord1 || !coord2 || !coord1.latitude || !coord1.longitude || 
        !coord2.latitude || !coord2.longitude) {
      return Infinity; // Cannot calculate distance
    }

    const R = 6371; // Earth's radius in kilometers
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

  // Emergency matching - finds the closest available fundi
  async emergencyMatch(job, options = {}) {
    const {
      maxDistance = 25,
      minRating = 4.0
    } = options;

    const potentialFundis = await this.getPotentialFundis(job, {
      minRating,
      maxDistance,
      considerAvailability: true
    });

    if (potentialFundis.length === 0) {
      return null;
    }

    // For emergency, prioritize proximity and response time
    const emergencyScored = await Promise.all(
      potentialFundis.map(async (fundi) => {
        const proximityScore = await this.calculateLocationScore(fundi, job);
        const responseScore = this.calculateResponseTimeScore(fundi);
        
        // Emergency weights: 60% proximity, 40% response time
        const emergencyScore = (proximityScore * 0.6) + (responseScore * 0.4);
        
        return { fundi, emergencyScore };
      })
    );

    emergencyScored.sort((a, b) => b.emergencyScore - a.emergencyScore);
    
    return emergencyScored[0]?.fundi || null;
  }

  // Bulk matching for corporate clients
  async bulkMatch(jobs, options = {}) {
    const results = {};

    for (const job of jobs) {
      try {
        const matches = await this.findBestFundis(job, options);
        results[job._id] = {
          job,
          matches: matches.slice(0, 3) // Top 3 matches for each job
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

      // Update response time (if applicable)
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
      logger.info(`Updated stats for fundi: ${fundiId}`);
    } catch (error) {
      logger.error(`Error updating fundi stats for ${fundiId}:`, error);
    }
  }
}

// Create singleton instance
const matchingService = new MatchingService();
export default matchingService;