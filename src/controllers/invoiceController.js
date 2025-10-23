import Invoice from '../models/Invoice.js';
import Booking from '../models/Booking.js';
import User from '../models/User.js';
import Fundi from '../models/Fundi.js';
// Payment model not used in this controller
import Dispute from '../models/Dispute.js';
import { sendEmail } from '../utils/emailUtils.js';
import notificationService from '../services/notificationService.js';
import logger from '../middleware/logger.js';

// @desc    Generate invoice for booking
// @route   POST /api/v1/invoices/generate
// @access  Private/Admin
export const generateInvoice = async (req, res, next) => {
  try {
    const {
      bookingId,
      invoiceType = 'booking',
      additionalItems = [],
      notes = {},
      discount = {}
    } = req.body;

    const adminId = req.user._id;

    // Validate booking exists
    const booking = await Booking.findById(bookingId)
      .populate('client', 'firstName lastName email phone')
      .populate('fundi', 'user')
      .populate('service')
      .populate('payment');

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    // Check if invoice already exists for this booking
    const existingInvoice = await Invoice.findOne({ booking: bookingId });
    if (existingInvoice) {
      return res.status(400).json({
        success: false,
        error: 'Invoice already exists for this booking'
      });
    }

    // Get fundi details
    const fundi = await Fundi.findById(booking.fundi._id)
      .populate('user', 'firstName lastName email phone');

    // Build invoice items
    const items = [
      {
        description: `${booking.serviceDescription || booking.service?.name}`,
        quantity: 1,
        unitPrice: booking.agreedPrice,
        amount: booking.agreedPrice,
        category: 'service',
        metadata: {
          bookingId: booking.bookingId,
          serviceType: booking.serviceType
        }
      },
      {
        description: 'Platform Service Fee',
        quantity: 1,
        unitPrice: booking.platformFee || (booking.agreedPrice * 0.1), // 10% default
        amount: booking.platformFee || (booking.agreedPrice * 0.1),
        category: 'platform_fee',
        taxRate: 0
      }
    ];

    // Add additional items
    if (additionalItems && additionalItems.length > 0) {
      items.push(...additionalItems);
    }

    // Build billing information
    const billingInfo = {
      client: {
        name: `${booking.client.firstName} ${booking.client.lastName}`,
        email: booking.client.email,
        phone: booking.client.phone,
        address: booking.location ? {
          street: booking.location.address,
          city: booking.location.town,
          county: booking.location.county,
          country: 'Kenya'
        } : {}
      },
      fundi: {
        name: `${fundi.user.firstName} ${fundi.user.lastName}`,
        email: fundi.user.email,
        phone: fundi.user.phone,
        businessNumber: fundi.ncaLicenseNumber,
        address: {
          county: fundi.operatingCounties[0] || 'Nairobi',
          country: 'Kenya'
        }
      }
    };

    // Create invoice
    const invoice = await Invoice.create({
      booking: bookingId,
      client: booking.client._id,
      fundi: booking.fundi._id,
      invoiceType,
      items,
      discount,
      notes,
      billingInfo,
      status: 'issued',
      paymentTerms: 'upon_receipt',
      history: [{
        action: 'invoice_created',
        description: `Invoice generated for booking ${booking.bookingId}`,
        performedBy: adminId
      }]
    });

    // Link payment if exists
    if (booking.payment) {
      invoice.payment = booking.payment._id;
      invoice.paymentMethod = booking.payment.paymentMethod;
      invoice.amountPaid = booking.payment.amount;
      await invoice.save();
    }

    res.status(201).json({
      success: true,
      message: 'Invoice generated successfully',
      data: {
        invoice
      }
    });

    logger.info(`Invoice generated for booking ${bookingId} by admin ${adminId}`);
  } catch (error) {
    next(error);
  }
};

// @desc    Generate penalty invoice from dispute
// @route   POST /api/v1/invoices/generate-penalty
// @access  Private/Admin
export const generatePenaltyInvoice = async (req, res, next) => {
  try {
    const {
      disputeId,
      penaltyType, // 'client' or 'fundi'
      description,
      amount,
      dueDate
    } = req.body;

    const adminId = req.user._id;

    // Validate dispute exists
    const dispute = await Dispute.findById(disputeId)
      .populate('booking')
      .populate('raisedBy')
      .populate('raisedAgainst');

    if (!dispute) {
      return res.status(404).json({
        success: false,
        error: 'Dispute not found'
      });
    }

    // Determine who gets the penalty invoice
    const penaltyRecipient = penaltyType === 'client' ? dispute.raisedBy : dispute.raisedAgainst;
    const recipientRole = penaltyType === 'client' ? dispute.raisedByRole : 
                         (dispute.raisedByRole === 'client' ? 'fundi' : 'client');

    // Get recipient details
    const recipient = await User.findById(penaltyRecipient);
    // recipientDetails not required here; recipient lookup above provides needed fields

    // Create penalty invoice
    const invoice = await Invoice.create({
      dispute: disputeId,
      client: penaltyRecipient,
      invoiceType: 'penalty',
      items: [{
        description: description || `Penalty for dispute ${dispute.disputeId}`,
        quantity: 1,
        unitPrice: amount,
        amount: amount,
        category: 'penalty',
        metadata: {
          disputeId: dispute.disputeId,
          penaltyType: penaltyType
        }
      }],
      dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days default
      status: 'issued',
      paymentTerms: 'net_7',
      billingInfo: {
        client: {
          name: `${recipient.firstName} ${recipient.lastName}`,
          email: recipient.email,
          phone: recipient.phone
        }
      },
      notes: {
        internal: `Penalty invoice generated from dispute ${dispute.disputeId}`,
        client: 'This is a penalty invoice resulting from a dispute resolution.'
      },
      history: [{
        action: 'penalty_invoice_created',
        description: `Penalty invoice generated for ${penaltyType} from dispute ${dispute.disputeId}`,
        performedBy: adminId
      }]
    });

    // Send notification to recipient
    await notificationService.sendNotification({
      recipient: penaltyRecipient,
      recipientType: recipientRole,
      title: 'Penalty Invoice Issued',
      message: `A penalty invoice of KES ${amount} has been issued to you. Please check your invoices.`,
      notificationType: 'system_alert',
      action: 'navigate',
      actionData: {
        screen: 'InvoiceDetails',
        params: { invoiceId: invoice._id }
      },
      priority: 'high'
    });

    res.status(201).json({
      success: true,
      message: 'Penalty invoice generated successfully',
      data: {
        invoice
      }
    });

    logger.info(`Penalty invoice generated for ${penaltyType} from dispute ${disputeId}`);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all invoices with filters
// @route   GET /api/v1/invoices
// @access  Private/Admin
export const getInvoices = async (req, res, next) => {
  try {
    const {
      status,
      invoiceType,
      clientId,
      fundiId,
      startDate,
      endDate,
      page = 1,
      limit = 20,
      sort = '-issueDate'
    } = req.query;

    // Build filter
    const filter = {};
    if (status) filter.status = status;
    if (invoiceType) filter.invoiceType = invoiceType;
    if (clientId) filter.client = clientId;
    if (fundiId) filter.fundi = fundiId;
    
    // Date range filter
    if (startDate || endDate) {
      filter.issueDate = {};
      if (startDate) filter.issueDate.$gte = new Date(startDate);
      if (endDate) filter.issueDate.$lte = new Date(endDate);
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get invoices with population
    const invoices = await Invoice.find(filter)
      .populate('client', 'firstName lastName email phone')
      .populate('fundi', 'user')
      .populate('booking', 'bookingId serviceDescription')
      .populate('dispute', 'disputeId title')
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    // Get total count and amounts
    const total = await Invoice.countDocuments(filter);
    const totalAmount = await Invoice.aggregate([
      { $match: filter },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        invoices,
        summary: {
          totalInvoices: total,
          totalAmount: totalAmount[0]?.total || 0
        },
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

// @desc    Get single invoice
// @route   GET /api/v1/invoices/:id
// @access  Private
export const getInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('client', 'firstName lastName email phone profilePhoto')
      .populate('fundi', 'user')
      .populate('booking', 'bookingId serviceDescription location')
      .populate('dispute', 'disputeId title')
      .populate('payment')
      .populate('history.performedBy', 'firstName lastName');

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found'
      });
    }

    // Check authorization
    const userId = req.user._id;
    const userRole = req.user.role;
    
    const hasAccess = 
      invoice.client._id.toString() === userId.toString() ||
      (invoice.fundi && invoice.fundi.user._id.toString() === userId.toString()) ||
      userRole === 'admin' ||
      userRole === 'super_admin';

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to access this invoice'
      });
    }

    // Increment download count if client is viewing
    if (invoice.client._id.toString() === userId.toString()) {
      invoice.delivery.downloadCount += 1;
      await invoice.save();
    }

    res.status(200).json({
      success: true,
      data: {
        invoice
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update invoice status
// @route   PATCH /api/v1/invoices/:id/status
// @access  Private/Admin
export const updateInvoiceStatus = async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    const invoiceId = req.params.id;
    const adminId = req.user._id;

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found'
      });
    }

    const previousStatus = invoice.status;
    invoice.status = status;

    if (notes) {
      invoice.notes.internal = notes;
    }

    // Add to history
    invoice.history.push({
      action: 'status_updated',
      description: `Status changed from ${previousStatus} to ${status}${notes ? `: ${notes}` : ''}`,
      performedBy: adminId
    });

    await invoice.save();

    res.status(200).json({
      success: true,
      message: 'Invoice status updated successfully',
      data: {
        invoice
      }
    });

    logger.info(`Invoice ${invoiceId} status updated from ${previousStatus} to ${status} by admin ${adminId}`);
  } catch (error) {
    next(error);
  }
};

// @desc    Send invoice to client
// @route   POST /api/v1/invoices/:id/send
// @access  Private/Admin
export const sendInvoice = async (req, res, next) => {
  try {
    const { method = 'email', customMessage } = req.body;
    const invoiceId = req.params.id;
    const adminId = req.user._id;

    const invoice = await Invoice.findById(invoiceId)
      .populate('client', 'firstName lastName email phone')
      .populate('booking', 'bookingId');

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found'
      });
    }

    // Generate PDF (in production, this would create an actual PDF)
    const pdfUrl = await invoice.generatePDF();

    // Send via email
    if (method === 'email' || method === 'both') {
      try {
        const emailResult = await sendEmail({
          email: invoice.client.email,
          subject: `Invoice ${invoice.invoiceNumber} - Zanira BuildLink`,
          html: this.generateInvoiceEmail(invoice, pdfUrl, customMessage)
        });

        invoice.delivery.sentVia = method === 'both' ? 'both' : 'email';
        invoice.delivery.sentAt = new Date();
        invoice.delivery.emailStatus.sent = true;
        invoice.delivery.emailStatus.delivered = emailResult.success;

        if (!emailResult.success) {
          invoice.delivery.emailStatus.error = emailResult.error;
        }
      } catch (emailError) {
        invoice.delivery.emailStatus.error = emailError.message;
        logger.error('Error sending invoice email:', emailError);
      }
    }

    // Add to history
    invoice.history.push({
      action: 'invoice_sent',
      description: `Invoice sent to client via ${method}`,
      performedBy: adminId
    });

    await invoice.save();

    // Send notification to client
    await notificationService.sendNotification({
      recipient: invoice.client._id,
      recipientType: 'client',
      title: 'Invoice Sent',
      message: `Invoice ${invoice.invoiceNumber} has been sent to you.`,
      notificationType: 'system_alert',
      action: 'navigate',
      actionData: {
        screen: 'InvoiceDetails',
        params: { invoiceId: invoice._id }
      }
    });

    res.status(200).json({
      success: true,
      message: 'Invoice sent successfully',
      data: {
        invoice,
        delivery: invoice.delivery
      }
    });

    logger.info(`Invoice ${invoiceId} sent to client via ${method} by admin ${adminId}`);
  } catch (error) {
    next(error);
  }
};

// @desc    Record invoice payment
// @route   POST /api/v1/invoices/:id/payment
// @access  Private/Admin
export const recordPayment = async (req, res, next) => {
  try {
    const {
      amount,
      paymentMethod,
      reference,
      paymentDate
    } = req.body;

    const invoiceId = req.params.id;
    const adminId = req.user._id;

    const invoice = await Invoice.findById(invoiceId)
      .populate('client', 'firstName lastName');

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found'
      });
    }

    // Record payment
    await invoice.addPayment(
      amount,
      paymentMethod,
      reference,
      null // paymentId would be linked if from platform payment
    );

    // Add to history
    invoice.history.push({
      action: 'manual_payment_recorded',
      description: `Manual payment of ${invoice.currency} ${amount} recorded via ${paymentMethod}`,
      performedBy: adminId
    });

    await invoice.save();

    // Send payment confirmation
    await notificationService.sendNotification({
      recipient: invoice.client._id,
      recipientType: 'client',
      title: 'Payment Received',
      message: `Payment of KES ${amount} for invoice ${invoice.invoiceNumber} has been received.`,
      notificationType: 'payment_received'
    });

    res.status(200).json({
      success: true,
      message: 'Payment recorded successfully',
      data: {
        invoice,
        payment: {
          amount,
          method: paymentMethod,
          reference,
          date: paymentDate
        }
      }
    });

    logger.info(`Payment of ${amount} recorded for invoice ${invoiceId} by admin ${adminId}`);
  } catch (error) {
    next(error);
  }
};

// @desc    Get invoice statistics
// @route   GET /api/v1/invoices/stats/overview
// @access  Private/Admin
export const getInvoiceStats = async (req, res, next) => {
  try {
    const { period = '30d' } = req.query;

    const stats = await Invoice.getInvoiceStats(period);

    // Additional statistics
    const overdueInvoices = await Invoice.findOverdueInvoices();
    const totalOverdueAmount = overdueInvoices.reduce((sum, inv) => sum + inv.balanceDue, 0);

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalInvoices: await Invoice.countDocuments(),
          paidInvoices: await Invoice.countDocuments({ status: 'paid' }),
          overdueInvoices: overdueInvoices.length,
          totalOverdueAmount,
          collectionRate: stats.byStatus.find(s => s._id === 'paid')?.totalPaid / 
                         stats.byStatus.reduce((sum, s) => sum + s.totalAmount, 0) || 0
        },
        detailedStats: stats,
        period
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user invoices
// @route   GET /api/v1/invoices/my-invoices
// @access  Private
export const getUserInvoices = async (req, res, next) => {
  try {
    const {
      status,
      page = 1,
      limit = 10,
      sort = '-issueDate'
    } = req.query;

    const userId = req.user._id;
    const userRole = req.user.role;

    // Build filter based on user role
    const filter = { client: userId }; // Clients see their invoices
    
    if (userRole === 'fundi') {
      // Fundis see invoices where they are the service provider
      filter.fundi = req.user.fundiProfile._id;
    }

    if (status) filter.status = status;

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const invoices = await Invoice.find(filter)
      .populate('booking', 'bookingId serviceDescription')
      .populate('fundi', 'user')
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    const total = await Invoice.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        invoices,
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

// Helper method to generate invoice email HTML
const generateInvoiceEmail = (invoice, pdfUrl, customMessage) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .invoice-details { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Invoice ${invoice.invoiceNumber}</h1>
          <p>Zanira BuildLink</p>
        </div>
        <div class="content">
          <h2>Hello ${invoice.billingInfo.client.name},</h2>
          <p>Your invoice <strong>${invoice.invoiceNumber}</strong> is ready.</p>
          
          ${customMessage ? `<p>${customMessage}</p>` : ''}
          
          <div class="invoice-details">
            <h3>Invoice Summary</h3>
            <p><strong>Amount Due:</strong> KES ${invoice.totalAmount.toLocaleString()}</p>
            <p><strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString()}</p>
            <p><strong>Status:</strong> ${invoice.status}</p>
          </div>
          
          <a href="${pdfUrl}" class="button">View Invoice</a>
          
          <p>If you have any questions about this invoice, please contact our support team.</p>
          
          <p>Best regards,<br>The Zanira BuildLink Team</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Zanira BuildLink. All rights reserved.</p>
          <p>Nairobi, Kenya</p>
        </div>
      </div>
    </body>
    </html>
  `;
};
// Export helper for tests or other modules if needed
export { generateInvoiceEmail };

