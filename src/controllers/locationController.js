import LocationTracking from '../models/LocationTracking.js';
import Booking from '../models/Booking.js';
import Fundi from '../models/Fundi.js';
import notificationService from '../services/notificationService.js';
import logger from '../middleware/logger.js';

// @desc    Start location tracking session
// @route   POST /api/v1/location/start-tracking
// @access  Private/Fundi
export const startLocationTracking = async (req, res, next) => {
  try {
    const { bookingId, settings = {} } = req.body;
    const fundiId = req.user.fundiProfile._id;

    // Validate booking
    const booking = await Booking.findById(bookingId)
      .populate('client', 'user')
      .populate('fundi', 'user');
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    // Check if fundi is assigned to this booking
    if (booking.fundi.user.toString() !== fundiId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to track location for this booking'
      });
    }

    // Check if tracking session already exists
    const existingSession = await LocationTracking.findOne({
      booking: bookingId,
      status: 'active'
    });

    if (existingSession) {
      return res.status(400).json({
        success: false,
        error: 'Location tracking session already active for this booking'
      });
    }

    // Create tracking session
    const trackingSession = await LocationTracking.create({
      booking: bookingId,
      fundi: booking.fundi._id,
      client: booking.client.user,
      settings: {
        updateInterval: settings.updateInterval || 30,
        maxDuration: settings.maxDuration || 14400,
        autoEndOnArrival: settings.autoEndOnArrival !== false,
        clientCanView: settings.clientCanView !== false,
        sharePreciseLocation: settings.sharePreciseLocation !== false
      },
      geofence: {
        jobLocation: {
          coordinates: booking.location.coordinates,
          radius: settings.geofenceRadius || 100
        }
      }
    });

    // Notify client
    if (trackingSession.settings.clientCanView) {
      await notificationService.sendNotification({
        recipient: booking.client.user,
        recipientType: 'client',
        title: 'Location Tracking Started',
        message: `Your fundi has started sharing their location. You can now track their arrival.`,
        notificationType: 'system_alert',
        action: 'navigate',
        actionData: {
          screen: 'LocationTracking',
          params: { bookingId: bookingId, sessionId: trackingSession.sessionId }
        }
      });
    }

    res.status(201).json({
      success: true,
      message: 'Location tracking session started',
      data: {
        session: trackingSession,
        settings: trackingSession.settings
      }
    });

    logger.info(`Location tracking started for booking ${bookingId} by fundi ${fundiId}`);
  } catch (error) {
    next(error);
  }
};

// @desc    Update fundi location
// @route   POST /api/v1/location/update
// @access  Private/Fundi
export const updateLocation = async (req, res, next) => {
  try {
    const { sessionId, locationData } = req.body;
    const fundiId = req.user.fundiProfile._id;

    // Validate session
    const session = await LocationTracking.findOne({
      sessionId,
      fundi: fundiId,
      status: 'active'
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Active tracking session not found'
      });
    }

    // Add location update
    await session.addLocationUpdate(locationData);

    // Check for arrival notification
    if (session.geofence.arrivalDetected && !session.notifications.arrivalSent) {
      await sendArrivalNotification(session);
      session.notifications.arrivalSent = true;
      await session.save();
    }

    res.status(200).json({
      success: true,
      message: 'Location updated successfully',
      data: {
        sessionId: session.sessionId,
        currentLocation: session.currentLocation,
        metrics: session.metrics,
        eta: session.eta
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current tracking session
// @route   GET /api/v1/location/session/:bookingId
// @access  Private
export const getTrackingSession = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;

    // Validate booking
    const booking = await Booking.findById(bookingId)
      .populate('client', 'user')
      .populate('fundi', 'user');

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    // Check if user is involved in the booking
    const isClient = booking.client.user.toString() === userId.toString();
    const isFundi = booking.fundi.user.toString() === userId.toString();
    
    if (!isClient && !isFundi && userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view location for this booking'
      });
    }

    // Get active tracking session
    const session = await LocationTracking.findOne({
      booking: bookingId,
      status: 'active'
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'No active tracking session found'
      });
    }

    // For clients, check if they're allowed to view location
    if (isClient && !session.settings.clientCanView) {
      return res.status(403).json({
        success: false,
        error: 'Location sharing is not enabled for this booking'
      });
    }

    // For clients, mask precise location if required
    let locationData = session.locations;
    if (isClient && !session.settings.sharePreciseLocation) {
      locationData = this.maskPreciseLocation(locationData);
    }

    res.status(200).json({
      success: true,
      data: {
        session: {
          ...session.toObject(),
          locations: locationData
        },
        currentLocation: session.currentLocation,
        eta: session.eta,
        geofence: session.geofence,
        metrics: session.metrics
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Stop location tracking
// @route   POST /api/v1/location/stop-tracking
// @access  Private/Fundi
export const stopLocationTracking = async (req, res, next) => {
  try {
    const { sessionId } = req.body;
    const fundiId = req.user.fundiProfile._id;

    const session = await LocationTracking.findOne({
      sessionId,
      fundi: fundiId,
      status: 'active'
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Active tracking session not found'
      });
    }

    // Update session
    session.status = 'completed';
    session.endedAt = new Date();
    await session.save();

    // Notify client
    await notificationService.sendNotification({
      recipient: session.client,
      recipientType: 'client',
      title: 'Location Tracking Ended',
      message: 'Fundi has stopped sharing their location.',
      notificationType: 'system_alert'
    });

    res.status(200).json({
      success: true,
      message: 'Location tracking stopped successfully',
      data: {
        sessionId: session.sessionId,
        duration: session.duration,
        totalUpdates: session.metrics.totalUpdates
      }
    });

    logger.info(`Location tracking stopped for session ${sessionId} by fundi ${fundiId}`);
  } catch (error) {
    next(error);
  }
};

// @desc    Get location history
// @route   GET /api/v1/location/history/:sessionId
// @access  Private
export const getLocationHistory = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { startTime, endTime } = req.query;
    const userId = req.user._id;

    const session = await LocationTracking.findOne({ sessionId })
      .populate('booking')
      .populate('client')
      .populate('fundi', 'user');

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Tracking session not found'
      });
    }

    // Check authorization
    const isAuthorized = 
      session.client.toString() === userId.toString() ||
      session.fundi.user.toString() === userId.toString() ||
      req.user.role === 'admin';

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view location history'
      });
    }

    // Filter locations by time range if provided
    let locations = session.locations;
    if (startTime && endTime) {
      const start = new Date(startTime);
      const end = new Date(endTime);
      locations = session.getLocationHistory(start, end);
    }

    // For clients, mask precise location if required
    if (session.client.toString() === userId.toString() && !session.settings.sharePreciseLocation) {
      locations = this.maskPreciseLocation(locations);
    }

    res.status(200).json({
      success: true,
      data: {
        session: {
          sessionId: session.sessionId,
          status: session.status,
          startedAt: session.startedAt,
          endedAt: session.endedAt,
          duration: session.duration
        },
        locations,
        metrics: session.metrics
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update tracking settings
// @route   PATCH /api/v1/location/settings/:sessionId
// @access  Private/Fundi
export const updateTrackingSettings = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { settings } = req.body;
    const fundiId = req.user.fundiProfile._id;

    const session = await LocationTracking.findOne({
      sessionId,
      fundi: fundiId
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Tracking session not found'
      });
    }

    // Update settings
    if (settings.updateInterval !== undefined) {
      session.settings.updateInterval = settings.updateInterval;
    }
    if (settings.autoEndOnArrival !== undefined) {
      session.settings.autoEndOnArrival = settings.autoEndOnArrival;
    }
    if (settings.clientCanView !== undefined) {
      session.settings.clientCanView = settings.clientCanView;
    }
    if (settings.sharePreciseLocation !== undefined) {
      session.settings.sharePreciseLocation = settings.sharePreciseLocation;
    }

    await session.save();

    res.status(200).json({
      success: true,
      message: 'Tracking settings updated successfully',
      data: {
        settings: session.settings
      }
    });
  } catch (error) {
    next(error);
  }
};

// Helper method to send arrival notification
const sendArrivalNotification = async (session) => {
  await notificationService.sendNotification({
    recipient: session.client,
    recipientType: 'client',
    title: 'Fundi Has Arrived',
    message: 'Your fundi has arrived at the job location.',
    notificationType: 'system_alert',
    action: 'navigate',
    actionData: {
      screen: 'BookingDetails',
      params: { bookingId: session.booking._id }
    }
  });
};

// Helper method to mask precise location for privacy
const maskPreciseLocation = (locations) => {
  return locations.map(location => ({
    ...location,
    coordinates: {
      latitude: Math.round(location.coordinates.latitude * 100) / 100, // Reduce precision to ~1km
      longitude: Math.round(location.coordinates.longitude * 100) / 100,
      accuracy: location.coordinates.accuracy
    },
    address: location.address ? {
      ...location.address,
      street: undefined // Remove street-level information
    } : undefined
  }));
};

// @desc    Get real-time location via WebSocket
// @route   WS /api/v1/location/live/:sessionId
// @access  Private
export const handleLiveLocationConnection = (socket) => {
  socket.on('subscribe_to_location', async (data) => {
    try {
      const { sessionId } = data;
      
      // Validate session and authorization
      const session = await LocationTracking.findOne({ sessionId })
        .populate('client')
        .populate('fundi', 'user');

      if (!session) {
        socket.emit('error', { message: 'Tracking session not found' });
        return;
      }

      // Check authorization
      const userId = socket.userId;
      const isAuthorized = 
        session.client.toString() === userId ||
        session.fundi.user.toString() === userId;

      if (!isAuthorized) {
        socket.emit('error', { message: 'Not authorized to view live location' });
        return;
      }

      // Join the location room
      socket.join(`location_${sessionId}`);
      socket.emit('subscribed', { sessionId, success: true });

      logger.info(`User ${userId} subscribed to live location for session ${sessionId}`);
    } catch (error) {
      logger.error('Error in live location subscription:', error);
      socket.emit('error', { message: 'Failed to subscribe to live location' });
    }
  });

  socket.on('unsubscribe_from_location', (data) => {
    const { sessionId } = data;
    socket.leave(`location_${sessionId}`);
    socket.emit('unsubscribed', { sessionId, success: true });
  });
};

