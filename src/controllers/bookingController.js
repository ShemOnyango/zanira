import Booking from '../models/Booking.js';
import Job from '../models/Job.js';
import Payment from '../models/Payment.js';
import Fundi from '../models/Fundi.js';
import Client from '../models/Client.js';
import Notification from '../models/Notification.js';
import mpesaService from '../config/mpesa.js';
import { generateToken } from '../utils/authUtils.js';
import logger from '../middleware/logger.js';

// @desc    Create booking request
// @route   POST /api/v1/bookings
// @access  Private/Client
export const createBooking = async (req, res, next) => {
  try {
    const {
      serviceId,
      fundiId,
      scheduledDate,
      scheduledTime,
      location,
      description,
      specialRequirements,
      emergencyContact
    } = req.body;

    const clientId = req.user._id;

    // Validate client exists
    const client = await Client.findOne({ user: clientId });
    if (!client) {
      return res.status(404).json({
        success: false,
        error: 'Client profile not found'
      });
    }

    // Validate fundi exists and is available
    const fundi = await Fundi.findById(fundiId)
      .populate('user', 'firstName lastName phone county town');
    
    if (!fundi) {
      return res.status(404).json({
        success: false,
        error: 'Fundi not found'
      });
    }

    if (fundi.verification.overallStatus !== 'verified') {
      return res.status(400).json({
        success: false,
        error: 'Fundi is not verified'
      });
    }

    if (fundi.availability !== 'available') {
      return res.status(400).json({
        success: false,
        error: 'Fundi is not currently available'
      });
    }

    // Check if fundi offers the requested service
    const fundiService = fundi.servicesOffered.find(
      service => service.service.toString() === serviceId
    );

    if (!fundiService) {
      return res.status(400).json({
        success: false,
        error: 'Fundi does not offer this service'
      });
    }

    // Check for scheduling conflicts
    const conflictingBooking = await Booking.findOne({
      fundi: fundiId,
      scheduledDate: new Date(scheduledDate),
      status: { $in: ['confirmed', 'scheduled', 'in_progress'] }
    });

    if (conflictingBooking) {
      return res.status(400).json({
        success: false,
        error: 'Fundi is already booked for this date'
      });
    }

    // Create job first
    const job = await Job.create({
      title: `${fundiService.service.name} Service`,
      description: description || `Booking for ${fundiService.service.name}`,
      serviceCategory: serviceId,
      serviceType: fundi.profession,
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
      assignedFundi: fundiId,
      status: 'assigned',
      timeline: {
        posted: new Date(),
        assigned: new Date()
      }
    });

    // Create booking
    const booking = await Booking.create({
      job: job._id,
      client: clientId,
      fundi: fundiId,
      service: serviceId,
      serviceDescription: fundiService.description,
      agreedPrice: fundiService.basePrice,
      pricingType: 'fixed',
      commissionRate: 10, // 10% platform commission
      scheduledDate: new Date(scheduledDate),
      scheduledTime: scheduledTime,
      estimatedDuration: 120, // Default 2 hours
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

    // Update fundi stats
    fundi.stats.ongoingJobs += 1;
    await fundi.save();

    // Update client stats
    client.stats.totalBookings += 1;
    await client.save();

    // Create notifications
    await Notification.create([
      {
        recipient: clientId,
        recipientType: 'client',
        title: 'Booking Request Sent',
        message: `Your booking request for ${fundiService.service.name} has been sent to ${fundi.user.firstName}.`,
        notificationType: 'booking_created',
        action: 'navigate',
        actionData: {
          screen: 'BookingDetails',
          params: { bookingId: booking._id }
        }
      },
      {
        recipient: fundi.user._id,
        recipientType: 'fundi',
        title: 'New Booking Request',
        message: `You have a new booking request from ${req.user.firstName} for ${fundiService.service.name}.`,
        notificationType: 'booking_created',
        action: 'navigate',
        actionData: {
          screen: 'BookingDetails',
          params: { bookingId: booking._id }
        }
      }
    ]);

    // Populate booking details
    await booking.populate([
      { path: 'client', select: 'firstName lastName phone' },
      { path: 'fundi', populate: { path: 'user', select: 'firstName lastName phone' } },
      { path: 'service' },
      { path: 'job' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: {
        booking
      }
    });

    logger.info(`Booking created: ${booking._id} - Client: ${clientId}, Fundi: ${fundiId}`);
  } catch (error) {
    next(error);
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
      // req.user may not have a populated `fundiProfile`; fetch Fundi record if needed
      let fundiId = null;
      if (req.user.fundiProfile && req.user.fundiProfile._id) {
        fundiId = req.user.fundiProfile._id;
      } else {
        const fundiRecord = await Fundi.findOne({ user: userId }).select('_id');
        fundiId = fundiRecord?._id;
      }

      if (!fundiId) {
        return res.status(404).json({ success: false, error: 'Fundi profile not found' });
      }

      filter.fundi = fundiId;
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
    const bookings = await Booking.find(filter)
      .populate([
        { 
          path: 'client', 
          select: 'firstName lastName phone profilePhoto',
          populate: { path: 'user' }
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
          select: 'firstName lastName phone profilePhoto',
          populate: { path: 'user' }
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
    
    const hasAccess = 
      booking.client._id.toString() === userId.toString() ||
      booking.fundi.user._id.toString() === userId.toString() ||
      userRole === 'admin' ||
      userRole === 'super_admin';

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
    const { phoneNumber, paymentMethod = 'mpesa' } = req.body;
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
    const adminId = req.user._id;

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