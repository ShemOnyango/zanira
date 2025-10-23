import Booking from '../models/Booking.js';
// import mongoose from 'mongoose';
import Job from '../models/Job.js';
import ServiceCategory from '../models/ServiceCategory.js';
import Payment from '../models/Payment.js';
import Fundi from '../models/Fundi.js';
import Client from '../models/Client.js';
import Notification from '../models/Notification.js';
// import notificationService from '../services/notificationService.js';
import mpesaService from '../config/mpesa.js';
// import { generateToken } from '../utils/authUtils.js';
import logger from '../middleware/logger.js';

// @desc    Create booking request
// @route   POST /api/v1/bookings
// @access  Private/Client
export const createBooking = async (req, res, _next) => {
  try {
    const {
      serviceId,
      scheduledDate,
      scheduledTime,
      location: rawLocation,
      description,
      specialRequirements,
      emergencyContact,
      serviceType: requestedServiceType
    } = req.body;

    // Location may be sent as a JSON string (multipart/form-data). Parse if needed.
    let location = rawLocation;
    if (typeof rawLocation === 'string') {
      try {
        location = JSON.parse(rawLocation);
      } catch (e) {
        return res.status(400).json({ success: false, error: 'Invalid location format' });
      }
    }

    const clientId = req.user._id;

    // Validate client exists
    const client = await Client.findOne({ user: clientId });
    if (!client) {
      return res.status(404).json({
        success: false,
        error: 'Client profile not found'
      });
    }

    // Validate required fields
    if (!serviceId) {
      return res.status(400).json({ success: false, error: 'serviceId is required' });
    }

    if (!location || !location.county || !location.town || !location.address) {
      return res.status(400).json({ success: false, error: 'location.county, location.town and location.address are required' });
    }

    if (!scheduledDate) {
      return res.status(400).json({ success: false, error: 'scheduledDate is required' });
    }

    // Resolve the service category so we can set a valid serviceType for Job
    const serviceCategory = await ServiceCategory.findById(serviceId);
    if (!serviceCategory) {
      return res.status(404).json({ success: false, error: 'Service category not found' });
    }

    // Map serviceCategory.category (which can be 'plumbing','electrical','both') to Job.serviceType
    // If category === 'both' prefer a requestedServiceType if provided and valid, otherwise default to 'plumbing'.
    const allowedServiceTypes = ['plumbing', 'electrical'];
    let serviceType = 'plumbing';
    if (serviceCategory.category === 'plumbing' || serviceCategory.category === 'electrical') {
      serviceType = serviceCategory.category;
    } else if (serviceCategory.category === 'both') {
      if (requestedServiceType && allowedServiceTypes.includes(requestedServiceType)) {
        serviceType = requestedServiceType;
      } else {
        // default choice when ambiguous
        serviceType = 'plumbing';
      }
    }

    // Create job first - without assigned fundi
    const job = await Job.create({
      title: 'Service Request',
      description: description || 'Service booking request',
      serviceCategory: serviceId,
      serviceType: serviceType,
      client: clientId,
      location: {
        county: location.county,
        town: location.town,
        address: location.address,
        coordinates: location.coordinates,
        landmark: location.landmark,
        instructions: location.instructions
      },
      urgency: 'medium',
      // Use a Job.status value that exists in the Job schema
      status: 'posted',
      timeline: {
        posted: new Date()
      }
    });

    // Create booking without fundi
    const booking = await Booking.create({
      job: job._id,
      client: clientId,
      // Remove fundi assignment
      service: serviceId,
      serviceDescription: description || '',
      agreedPrice: 0, // Will be set when admin assigns fundi
      pricingType: 'fixed',
      commissionRate: 10,
      scheduledDate: new Date(scheduledDate),
      scheduledTime: scheduledTime,
      estimatedDuration: 120,
      location: {
        county: location.county,
        town: location.town,
        address: location.address,
        coordinates: location.coordinates,
        landmark: location.landmark,
        instructions: location.instructions
      },
      specialInstructions: specialRequirements,
      emergencyContact: emergencyContact,
      status: 'pending'
    });

    // Update client stats
    client.stats.totalBookings += 1;
    await client.save();

    // Create notification for client
    await Notification.create({
      recipient: clientId,
      recipientType: 'client',
      title: 'Booking Request Sent',
      message: 'Your booking request has been received. An admin will assign a fundi shortly.',
      notificationType: 'booking_created',
      action: 'navigate',
      actionData: {
        screen: 'BookingDetails',
        params: { bookingId: booking._id }
      }
    });

    // Notify all admins individually (so Notification.recipient is populated)
    const AdminModel = await import('../models/Admin.js');
    const adminUsers = await AdminModel.default.find().populate('user', '_id');
    const adminNotifications = adminUsers.map(a => ({
      recipient: a.user._id,
      recipientType: 'admin',
      title: 'New Booking Request',
      message: `New booking request from ${req.user.firstName} needs fundi assignment.`,
      notificationType: 'booking_created',
      action: 'navigate',
      actionData: {
        screen: 'AdminBookingDetails',
        params: { bookingId: booking._id }
      }
    }));

    if (adminNotifications.length) {
      await Notification.insertMany(adminNotifications);
    }

    // Populate booking details
    await booking.populate([
      { path: 'client', select: 'firstName lastName phone' },
      { path: 'service' },
      { path: 'job' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Booking created successfully. Admin will assign a fundi shortly.',
      data: {
        booking
      }
    });

    logger.info(`Booking created: ${booking._id} - Client: ${clientId}`);
  } catch (error) {
    // Log full error for debugging and return a clear JSON error so frontend shows a message
    logger.error('getBooking error', { error: error?.message || error, stack: error?.stack })
    return res.status(500).json({ success: false, error: 'Failed to load booking' })
  }
};

// @desc    Get user bookings
// @route   GET /api/v1/bookings
// @access  Private
export const getUserBookings = async (req, res, next) => {
  try {
    const {
      status,
      page = 1,
      limit = 10,
      sort = '-createdAt'
    } = req.query;

    const userId = req.user._id;
    const userRole = req.user.role;

    // Build filter based on user role
    let filter = {};
    if (userRole === 'client') {
      filter.client = userId;
    } else if (userRole === 'fundi') {
      // For fundis, return bookings assigned to them OR available pending jobs that match their offered services
      let fundiRecord = null;
      if (req.user.fundiProfile && req.user.fundiProfile._id) {
        fundiRecord = await Fundi.findById(req.user.fundiProfile._id).populate('servicesOffered.service');
      } else {
        fundiRecord = await Fundi.findOne({ user: userId }).populate('servicesOffered.service');
      }

      if (!fundiRecord) {
        return res.status(404).json({ success: false, error: 'Fundi profile not found' });
      }

      const fundiId = fundiRecord._id;

      // If the caller asked for status=pending (available jobs), return unassigned bookings that match this fundi's services
      if (status === 'pending') {
        // Collect service ids offered by this fundi
        const offeredServiceIds = (fundiRecord.servicesOffered || []).map(s => String(s.service));

        // If the fundi hasn't set up any offered services, there's nothing to return
        if (!offeredServiceIds || offeredServiceIds.length === 0) {
          logger.info('getUserBookings - fundi has no offered services', { fundiId, userId });
          return res.status(200).json({ success: true, data: { bookings: [], pagination: { page: 1, limit: 0, total: 0, pages: 0 } } });
        }

        // Basic matching: booking.status === 'pending' && booking.fundi == null && booking.service in offeredServiceIds
        filter = {
          status: 'pending',
          fundi: { $exists: false },
          service: { $in: offeredServiceIds }
        };

        // Optional: prefer same county if fundi has a location
        if (fundiRecord.location && fundiRecord.location.county) {
          filter['location.county'] = fundiRecord.location.county;
        }
      } else {
        // Otherwise, return bookings assigned to this fundi
        filter.fundi = fundiId;
      }
    } else {
      // Admin can see all bookings
      filter = {};
    }

    // Status filter
    if (status) {
      filter.status = status;
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get bookings with population
    logger.info('getUserBookings - computed filter', { userId: userId.toString(), userRole, filter })
    const bookings = await Booking.find(filter)
      .populate([
        { 
          path: 'client', 
          select: 'firstName lastName phone profilePhoto'
        },
        { 
          path: 'fundi', 
          populate: { 
            path: 'user', 
            select: 'firstName lastName phone profilePhoto' 
          }
        },
        { path: 'service' },
        { path: 'job' },
        { path: 'payment' }
      ])
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    // Get total count
    const total = await Booking.countDocuments(filter);

  logger.info('getUserBookings - found bookings', { userId: userId.toString(), userRole, filter, count: total });

    res.status(200).json({
      success: true,
      data: {
        bookings,
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

// @desc    Get single booking
// @route   GET /api/v1/bookings/:id
// @access  Private
export const getBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate([
        { 
          path: 'client', 
          select: 'firstName lastName phone profilePhoto'
        },
        { 
          path: 'fundi', 
          populate: [
            { path: 'user', select: 'firstName lastName phone profilePhoto' },
            { path: 'servicesOffered.service' }
          ]
        },
        { path: 'service' },
        { path: 'job' },
        { path: 'payment' },
        { path: 'chatThread' }
      ]);

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    // Check if user has access to this booking
    const userId = req.user._id;
    const userRole = req.user.role;
    // Be defensive: booking.fundi or booking.client may be objects or populated differently.
    const clientIdStr = booking.client?._id ? booking.client._id.toString() : null
    let fundiUserIdStr = null
    try {
      if (booking.fundi) {
        // booking.fundi might be a Fundi doc with nested user, or a plain user id.
        if (booking.fundi.user && booking.fundi.user._id) fundiUserIdStr = booking.fundi.user._id.toString()
        else if (booking.fundi._id) fundiUserIdStr = booking.fundi._id.toString()
        else if (typeof booking.fundi === 'string') fundiUserIdStr = booking.fundi
      }
    } catch (e) {
      // If unexpected shape, log and continue (no access)
      logger.warn('Unexpected booking.fundi shape while checking access', { bookingId: booking._id, error: e?.message })
    }

    const hasAccess = (
      (clientIdStr && clientIdStr === userId.toString()) ||
      (fundiUserIdStr && fundiUserIdStr === userId.toString()) ||
      userRole === 'admin' ||
      userRole === 'super_admin'
    );

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to access this booking'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        booking
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update booking status
// @route   PATCH /api/v1/bookings/:id/status
// @access  Private
export const updateBookingStatus = async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    const bookingId = req.params.id;
    const userId = req.user._id;
    const userRole = req.user.role;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    // Check if user has permission to update status
    let canUpdate = false;
    let notificationRecipient = null;
    let notificationMessage = '';

    // Determine current fundi id safely
    let currentFundiId = null;
    if (req.user?.fundiProfile?._id) currentFundiId = req.user.fundiProfile._id.toString();
    else {
      const f = await Fundi.findOne({ user: req.user._id }).select('_id');
      if (f) currentFundiId = f._id.toString();
    }

    switch (status) {
      case 'confirmed':
  if (userRole === 'fundi' && currentFundiId && booking.fundi.toString() === currentFundiId) {
          canUpdate = true;
          notificationRecipient = booking.client;
          notificationMessage = `Fundi has confirmed your booking for ${booking.serviceDescription}`;
        }
        break;

      case 'cancelled':
        if (
          (userRole === 'client' && booking.client.toString() === userId.toString()) ||
          (userRole === 'fundi' && currentFundiId && booking.fundi.toString() === currentFundiId) ||
          userRole === 'admin'
        ) {
          canUpdate = true;
          notificationRecipient = userRole === 'client' ? booking.fundi : booking.client;
          notificationMessage = `Booking has been cancelled by ${userRole}`;
        }
        break;

      case 'in_progress':
  if (userRole === 'fundi' && currentFundiId && booking.fundi.toString() === currentFundiId) {
          canUpdate = true;
          booking.actualStartTime = new Date();
          notificationRecipient = booking.client;
          notificationMessage = 'Fundi has started the job';
        }
        break;

      case 'completed':
  if (userRole === 'fundi' && currentFundiId && booking.fundi.toString() === currentFundiId) {
          canUpdate = true;
          booking.actualEndTime = new Date();
          booking.completion.completedByFundi = true;
          notificationRecipient = booking.client;
          notificationMessage = 'Fundi has marked the job as completed. Please confirm completion.';
        }
        break;

      default:
        canUpdate = userRole === 'admin';
    }

    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update booking status'
      });
    }

    // Update booking status
    booking.status = status;
    if (notes) {
      booking.workflow.push({
        status,
        timestamp: new Date(),
        changedBy: userId,
        notes
      });
    }

    await booking.save();

    // Create notification if recipient exists
    if (notificationRecipient) {
      await Notification.create({
        recipient: notificationRecipient,
        recipientType: userRole === 'client' ? 'fundi' : 'client',
        title: `Booking ${status.charAt(0).toUpperCase() + status.slice(1)}`,
        message: notificationMessage,
        notificationType: `booking_${status}`,
        action: 'navigate',
        actionData: {
          screen: 'BookingDetails',
          params: { bookingId: booking._id }
        }
      });
    }

    // Populate updated booking
    await booking.populate([
      { path: 'client', select: 'firstName lastName' },
      { path: 'fundi', populate: { path: 'user', select: 'firstName lastName' } },
      { path: 'service' }
    ]);

    res.status(200).json({
      success: true,
      message: `Booking status updated to ${status}`,
      data: {
        booking
      }
    });

    logger.info(`Booking status updated: ${bookingId} - ${status} by ${userRole}`);
  } catch (error) {
    next(error);
  }
};

// @desc    Client confirms job completion
// @route   PATCH /api/v1/bookings/:id/confirm-completion
// @access  Private/Client
export const confirmCompletion = async (req, res, next) => {
  try {
    const { clientNotes, rating, comment } = req.body;
    const bookingId = req.params.id;
    const clientId = req.user._id;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    // Check if client owns this booking
    if (booking.client.toString() !== clientId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to confirm this booking'
      });
    }

    // Check if fundi has marked as completed
    if (!booking.completion.completedByFundi) {
      return res.status(400).json({
        success: false,
        error: 'Fundi has not marked the job as completed yet'
      });
    }

    // Update completion details
    booking.completion.completedByClient = true;
    booking.completion.completionDate = new Date();
    booking.completion.clientNotes = clientNotes;
    booking.status = 'completed';

    // Add rating if provided
    if (rating) {
      booking.rating.byClient = {
        score: rating,
        comment: comment,
        timestamp: new Date()
      };

      // Update fundi's average rating
      const fundi = await Fundi.findById(booking.fundi);
      if (fundi) {
        const totalRatings = fundi.stats.totalJobs * fundi.stats.rating;
        fundi.stats.totalJobs += 1;
        fundi.stats.rating = (totalRatings + rating) / fundi.stats.totalJobs;
        await fundi.save();
      }
    }

    await booking.save();

    // Create notification for fundi
    await Notification.create({
      recipient: booking.fundi,
      recipientType: 'fundi',
      title: 'Job Completed',
      message: `Client has confirmed completion of your job. Payment will be processed shortly.`,
      notificationType: 'booking_completed',
      action: 'navigate',
      actionData: {
        screen: 'BookingDetails',
        params: { bookingId: booking._id }
      }
    });

    res.status(200).json({
      success: true,
      message: 'Job completion confirmed successfully',
      data: {
        booking
      }
    });

    logger.info(`Job completion confirmed: ${bookingId} by client ${clientId}`);
  } catch (error) {
    next(error);
  }
};

// @desc    Initiate payment for booking
// @route   POST /api/v1/bookings/:id/payment
// @access  Private/Client
export const initiatePayment = async (req, res, next) => {
  try {
    const { phoneNumber = 'mpesa' } = req.body;
    const bookingId = req.params.id;
    const clientId = req.user._id;

    const booking = await Booking.findById(bookingId).populate('service');
    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    // Check if client owns this booking
    if (booking.client.toString() !== clientId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to pay for this booking'
      });
    }

    // Check if booking is in a payable state
    if (!['pending', 'confirmed', 'scheduled'].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        error: 'Booking is not in a payable state'
      });
    }

    // Check if payment already exists
    const existingPayment = await Payment.findOne({ booking: bookingId });
    if (existingPayment) {
      return res.status(400).json({
        success: false,
        error: 'Payment already exists for this booking'
      });
    }

    // Sanitize phone number
    const sanitizedPhone = mpesaService.sanitizePhoneNumber(phoneNumber);

    // Generate payment reference
    const paymentReference = mpesaService.generateTransactionReference('PAY');

    // Initiate M-Pesa STK Push
    const stkResult = await mpesaService.initiateSTKPush(
      sanitizedPhone,
      booking.agreedPrice,
      paymentReference,
      `Payment for ${booking.serviceDescription}`
    );

    if (!stkResult.success) {
      return res.status(400).json({
        success: false,
        error: stkResult.error?.errorMessage || 'Failed to initiate payment'
      });
    }

    // Create payment record
    const payment = await Payment.create({
      booking: bookingId,
      client: clientId,
      fundi: booking.fundi,
      amount: booking.agreedPrice,
      paymentMethod: 'mpesa',
      reference: paymentReference,
      mpesa: {
        phoneNumber: sanitizedPhone,
        merchantRequestID: stkResult.merchantRequestID,
        checkoutRequestID: stkResult.checkoutRequestID
      },
      status: 'processing',
      escrowStatus: 'pending'
    });

    // Update booking with payment reference
    booking.payment = payment._id;
    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Payment initiated successfully',
      data: {
        payment: {
          _id: payment._id,
          paymentId: payment.paymentId,
          amount: payment.amount,
          status: payment.status,
          mpesa: {
            checkoutRequestID: payment.mpesa.checkoutRequestID,
            customerMessage: stkResult.customerMessage
          }
        }
      }
    });

    logger.info(`Payment initiated: ${payment._id} for booking ${bookingId}`);
  } catch (error) {
    next(error);
  }
};

// @desc    Process payment callback from M-Pesa
// @route   POST /api/v1/payments/callback/mpesa
// @access  Public (called by M-Pesa)
export const processPaymentCallback = async (req, res, next) => {
  try {
    const callbackData = req.body;

    // Process STK callback
    const callbackResult = await mpesaService.processSTKCallback(callbackData);

    if (!callbackResult.success) {
      logger.error('Payment callback failed:', callbackResult);
      return res.status(400).json(callbackResult);
    }

    // Find payment by checkout request ID
    const payment = await Payment.findOne({
      'mpesa.checkoutRequestID': callbackResult.checkoutRequestID
    }).populate('booking');

    if (!payment) {
      logger.error('Payment not found for checkout request:', callbackResult.checkoutRequestID);
      return res.status(404).json({
        success: false,
        error: 'Payment not found'
      });
    }

    // Validate payment amount
    const amountValid = mpesaService.validatePaymentAmount(
      callbackResult.amount,
      payment.amount
    );

    if (!amountValid) {
      logger.error('Payment amount mismatch:', {
        expected: payment.amount,
        received: callbackResult.amount,
        paymentId: payment._id
      });

      payment.status = 'failed';
      payment.error = {
        code: 'AMOUNT_MISMATCH',
        message: `Payment amount mismatch. Expected: ${payment.amount}, Received: ${callbackResult.amount}`
      };
      await payment.save();

      return res.status(400).json({
        success: false,
        error: 'Payment amount mismatch'
      });
    }

    // Update payment with M-Pesa details
    payment.mpesa.transactionCode = callbackResult.mpesaReceiptNumber;
    payment.mpesa.receiptNumber = callbackResult.mpesaReceiptNumber;
    payment.mpesa.resultCode = callbackResult.resultCode;
    payment.mpesa.resultDesc = callbackResult.resultDesc;
    payment.status = 'completed';
    payment.processedAt = new Date();
    payment.escrowStatus = 'held';

    // Update booking status
    if (payment.booking) {
      payment.booking.status = 'confirmed';
      payment.booking.escrowStatus = 'funded';
      await payment.booking.save();
    }

    await payment.save();

    // Create notifications
    await Notification.create([
      {
        recipient: payment.client,
        recipientType: 'client',
        title: 'Payment Successful',
        message: `Your payment of KES ${payment.amount} was successful.`,
        notificationType: 'payment_received',
        action: 'navigate',
        actionData: {
          screen: 'BookingDetails',
          params: { bookingId: payment.booking._id }
        }
      },
      {
        recipient: payment.fundi,
        recipientType: 'fundi',
        title: 'Payment Received',
        message: `Client has paid KES ${payment.amount} for your service.`,
        notificationType: 'payment_received',
        action: 'navigate',
        actionData: {
          screen: 'BookingDetails',
          params: { bookingId: payment.booking._id }
        }
      }
    ]);

    logger.info(`Payment completed successfully: ${payment._id}, Amount: ${payment.amount}`);

    res.status(200).json({
      success: true,
      message: 'Payment processed successfully'
    });
  } catch (error) {
    logger.error('Payment callback processing error:', error);
    next(error);
  }
};

// @desc    Release payment to fundi
// @route   POST /api/v1/bookings/:id/release-payment
// @access  Private/Admin
export const releasePayment = async (req, res, next) => {
  try {
    const bookingId = req.params.id;
    // const adminId = req.user._id;

    const booking = await Booking.findById(bookingId)
      .populate('payment')
      .populate('fundi');

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    if (!booking.payment) {
      return res.status(400).json({
        success: false,
        error: 'No payment found for this booking'
      });
    }

    // Check if payment can be released
    if (booking.payment.escrowStatus !== 'held') {
      return res.status(400).json({
        success: false,
        error: 'Payment is not in a releasable state'
      });
    }

    if (booking.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Booking must be completed before releasing payment'
      });
    }

    // Update payment status
    booking.payment.escrowStatus = 'released';
    booking.payment.status = 'completed';
    booking.payment.completedAt = new Date();
    await booking.payment.save();

    // Update booking escrow status
    booking.escrowStatus = 'released';
    await booking.save();

    // Update fundi earnings
    const fundi = await Fundi.findById(booking.fundi);
    if (fundi) {
      fundi.earnings.available += booking.payment.fundiAmount;
      fundi.earnings.pending -= booking.payment.fundiAmount;
      fundi.stats.totalEarnings += booking.payment.fundiAmount;
      await fundi.save();
    }

    // Create notifications
    await Notification.create([
      {
        recipient: booking.fundi,
        recipientType: 'fundi',
        title: 'Payment Released',
        message: `KES ${booking.payment.fundiAmount} has been released to your account.`,
        notificationType: 'payment_received',
        action: 'navigate',
        actionData: {
          screen: 'Earnings'
        }
      },
      {
        recipient: booking.client,
        recipientType: 'client',
        title: 'Payment Processed',
        message: 'Payment has been released to the fundi.',
        notificationType: 'payment_received'
      }
    ]);

    res.status(200).json({
      success: true,
      message: 'Payment released successfully',
      data: {
        payment: booking.payment,
        fundiAmount: booking.payment.fundiAmount
      }
    });

    logger.info(`Payment released: ${booking.payment._id} to fundi ${booking.fundi}`);
  } catch (error) {
    next(error);
  }
};

// @desc    Assign fundi to booking (Admin)
// @route   POST /api/v1/bookings/:id/assign-fundi
// @access  Private/Admin
export const assignFundiToBooking = async (req, res, next) => {
  try {
    const { fundiId, agreedPrice } = req.body;
    const bookingId = req.params.id;

    const booking = await Booking.findById(bookingId)
      .populate('client')
      .populate('service');

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    // Validate fundi
    const fundi = await Fundi.findById(fundiId)
      .populate('user', 'firstName lastName phone');

    if (!fundi) {
      return res.status(404).json({
        success: false,
        error: 'Fundi not found'
      });
    }

    if (fundi.verification?.overallStatus !== 'verified') {
      return res.status(400).json({
        success: false,
        error: 'Fundi is not verified'
      });
    }

    // Check for scheduling conflicts
    const conflictingBooking = await Booking.findOne({
      fundi: fundiId,
      scheduledDate: booking.scheduledDate,
      status: { $in: ['confirmed', 'scheduled', 'in_progress'] }
    });

    if (conflictingBooking) {
      return res.status(400).json({
        success: false,
        error: 'Fundi is already booked for this date'
      });
    }

    // Update booking with fundi and price
    booking.fundi = fundiId;
    booking.agreedPrice = agreedPrice;
    booking.status = 'confirmed';

    // Update job
    await Job.findByIdAndUpdate(booking.job, {
      assignedFundi: fundiId,
      status: 'assigned',
      'timeline.assigned': new Date()
    });

    // Update fundi stats
    fundi.stats = fundi.stats || {};
    fundi.stats.ongoingJobs = (fundi.stats.ongoingJobs || 0) + 1;
    await fundi.save();

    // Create notifications
    await Notification.create([
      {
        recipient: booking.client,
        recipientType: 'client',
        title: 'Fundi Assigned',
        message: `A fundi has been assigned to your booking: ${fundi.user.firstName} ${fundi.user.lastName}`,
        notificationType: 'fundi_assigned',
        action: 'navigate',
        actionData: {
          screen: 'BookingDetails',
          params: { bookingId: booking._id }
        }
      },
      {
        recipient: fundi.user._id,
        recipientType: 'fundi',
        title: 'New Job Assigned',
        message: `You have been assigned to a new job: ${booking.serviceDescription}`,
        notificationType: 'job_assigned',
        action: 'navigate',
        actionData: {
          screen: 'BookingDetails',
          params: { bookingId: booking._id }
        }
      }
    ]);

    await booking.save();

    // Populate updated booking
    await booking.populate([
      { path: 'client', select: 'firstName lastName phone' },
      { path: 'fundi', populate: { path: 'user', select: 'firstName lastName phone' } },
      { path: 'service' }
    ]);

    res.status(200).json({
      success: true,
      message: 'Fundi assigned successfully',
      data: {
        booking
      }
    });

    logger.info(`Fundi assigned: ${fundiId} to booking ${bookingId}`);
  } catch (error) {
    next(error);
  }
};

// @desc    Find matching fundis for booking (Admin)
// @route   GET /api/v1/bookings/:id/matching-fundis
// @access  Private/Admin
export const findMatchingFundis = async (req, res, next) => {
  try {
    const bookingId = req.params.id;
    
    const booking = await Booking.findById(bookingId)
      .populate('service')
      .populate('location');

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    // Build flexible matching criteria: prefer same county, then same town, then geo-near if coordinates available
    const baseCriteria = {
      'servicesOffered.service': booking.service._id,
      'verification.overallStatus': 'verified',
      availability: 'available'
    }

    let matchingFundis = []

    // 1) Try same county
    matchingFundis = await Fundi.find({
      ...baseCriteria,
      'location.county': booking.location.county
    })
    .populate('user', 'firstName lastName phone profilePhoto')
    .populate('servicesOffered.service')
    .select('user servicesOffered location rating stats');

    // 2) If none, try same town within county
    if ((!matchingFundis || matchingFundis.length === 0) && booking.location?.town) {
      matchingFundis = await Fundi.find({
        ...baseCriteria,
        'location.town': booking.location.town
      })
      .populate('user', 'firstName lastName phone profilePhoto')
      .populate('servicesOffered.service')
      .select('user servicesOffered location rating stats');
    }

    // 3) If still none and coordinates provided, try a geo-near search within 25km
    if ((!matchingFundis || matchingFundis.length === 0) && booking.location?.coordinates && Array.isArray(booking.location.coordinates)) {
      try {
        const [lng, lat] = booking.location.coordinates
        matchingFundis = await Fundi.find({
          ...baseCriteria,
          'location.coordinates': {
            $near: {
              $geometry: {
                type: 'Point',
                coordinates: [lng, lat]
              },
              $maxDistance: 25000 // 25km
            }
          }
        })
        .populate('user', 'firstName lastName phone profilePhoto')
        .populate('servicesOffered.service')
        .select('user servicesOffered location rating stats');
      } catch (geErr) {
        logger.warn('Geo search failed for matching fundis', { bookingId, error: geErr })
      }
    }

    logger.info('findMatchingFundis search', { bookingId, serviceId: booking.service._id, location: booking.location, matches: (matchingFundis||[]).length })

  // Calculate match score for each fundi
    const fundisWithScore = matchingFundis.map(fundi => {
      let score = 0;
      
      // Base score for service match
      score += 40;
      
      // Location match (same town gets higher score)
      if (fundi.location.town === booking.location.town) {
        score += 30;
      } else {
        score += 15;
      }
      
      // Rating bonus
      if (fundi.rating > 4) score += 20;
      else if (fundi.rating > 3) score += 10;
      
      // Experience bonus
      if (fundi.stats?.completedJobs > 50) score += 10;
      else if (fundi.stats?.completedJobs > 20) score += 5;

      return {
        ...fundi.toObject(),
        matchScore: Math.min(score, 100)
      };
    }).sort((a, b) => b.matchScore - a.matchScore);

    res.status(200).json({
      success: true,
      data: {
        booking,
        matchingFundis: fundisWithScore
      }
    });
  } catch (error) {
    next(error);
  }
};


// @desc    Push booking to matching fundis (notify them so they can apply)
// @route   POST /api/v1/bookings/:id/push-to-fundis
// @access  Private/Admin
export const pushBookingToFundis = async (req, res, next) => {
  try {
    const bookingId = req.params.id;

    const booking = await Booking.findById(bookingId)
      .populate('service')
      .populate('client', 'firstName lastName');
    
    if (!booking) {
      return res.status(404).json({ 
        success: false, 
        error: 'Booking not found' 
      });
    }

    // Ensure booking is in pending status for fundis to see
    if (booking.status !== 'pending') {
      booking.status = 'pending';
      await booking.save();
    }

    // Use broader matching criteria to find fundis
    const baseCriteria = {
      'servicesOffered.service': booking.service._id,
      'verification.overallStatus': 'verified',
      availability: 'available'
    };

    let matchingFundis = [];

    // Try multiple location matching strategies
    // 1. Same county
    matchingFundis = await Fundi.find({
      ...baseCriteria,
      'location.county': booking.location.county
    }).populate('user', 'firstName lastName phone');

    // 2. If none found in same county, try same town
    if (matchingFundis.length === 0 && booking.location?.town) {
      matchingFundis = await Fundi.find({
        ...baseCriteria,
        'location.town': booking.location.town
      }).populate('user', 'firstName lastName phone');
    }

    // 3. If still none, try any fundis with the same service (broader search)
    if (matchingFundis.length === 0) {
      matchingFundis = await Fundi.find(baseCriteria)
        .populate('user', 'firstName lastName phone');
    }

    console.log(`Found ${matchingFundis.length} matching fundis for booking ${bookingId}`);

    if (matchingFundis.length === 0) {
      return res.status(200).json({ 
        success: true, 
        message: 'No matching fundis found for this booking',
        data: { pushed: 0 }
      });
    }

    // Create notifications for each matching fundi
    const notificationPromises = matchingFundis.map(async (fundi) => {
      try {
        const notification = await Notification.create({
          recipient: fundi.user._id,
          recipientType: 'fundi',
          title: 'New Job Available in Your Area!',
          message: `New ${booking.service?.name} job in ${booking.location.town}. Click to view details.`,
          notificationType: 'job_available',
          action: 'navigate',
          actionData: {
            screen: 'BookingDetails',
            params: { bookingId: booking._id }
          },
          metadata: {
            bookingId: booking._id,
            serviceName: booking.service?.name,
            location: booking.location.town,
            scheduledDate: booking.scheduledDate
          }
        });

        // Emit real-time notification via socket
        if (req.app.get('io')) {
          req.app.get('io').to(`user_${fundi.user._id}`).emit('notification', {
            type: 'job_available',
            data: notification
          });
        }

        return { success: true, fundiId: fundi._id };
      } catch (error) {
        console.error(`Failed to create notification for fundi ${fundi._id}:`, error);
        return { success: false, fundiId: fundi._id, error: error.message };
      }
    });

    const results = await Promise.all(notificationPromises);
    const successCount = results.filter(r => r.success).length;

    // Log the push activity
    console.log(`Pushed booking ${bookingId} to ${successCount} fundis`);

    res.status(200).json({
      success: true,
      message: `Job pushed to ${successCount} fundis successfully`,
      data: {
        pushed: successCount,
        total: matchingFundis.length,
        booking: {
          _id: booking._id,
          service: booking.service?.name,
          location: booking.location.town
        }
      }
    });

  } catch (error) {
    console.error('Error in pushBookingToFundis:', error);
    next(error);
  }
};