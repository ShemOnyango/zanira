import Job from '../models/Job.js';
import Fundi from '../models/Fundi.js';
import Notification from '../models/Notification.js';
import logger from '../middleware/logger.js';

export const placeBid = async (req, res, next) => {
  try {
    const { jobId, amount, proposal, timeline } = req.body;
    const userId = req.user._id;

    const fundi = await Fundi.findOne({ user: userId });
    if (!fundi) {
      return res.status(404).json({
        success: false,
        error: 'Fundi profile not found'
      });
    }

    if (fundi.verification.overallStatus !== 'verified') {
      return res.status(403).json({
        success: false,
        error: 'Only verified fundis can place bids'
      });
    }

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    if (!['posted', 'bidding'].includes(job.status)) {
      return res.status(400).json({
        success: false,
        error: 'Job is not accepting bids'
      });
    }

    const existingBid = job.bids.find(bid => bid.fundi.toString() === fundi._id.toString());
    if (existingBid) {
      return res.status(400).json({
        success: false,
        error: 'You have already placed a bid on this job'
      });
    }

    job.bids.push({
      fundi: fundi._id,
      amount,
      proposal,
      timeline,
      submittedAt: new Date(),
      status: 'pending'
    });

    if (job.status === 'posted') {
      job.status = 'bidding';
    }

    await job.save();

    await Notification.create({
      recipient: job.client,
      recipientType: 'client',
      title: 'New Bid Received',
      message: `${fundi.user.firstName} has placed a bid on your job`,
      notificationType: 'new_bid',
      actionData: { jobId, bidAmount: amount }
    });

    res.status(201).json({
      success: true,
      message: 'Bid placed successfully',
      data: {
        bid: job.bids[job.bids.length - 1]
      }
    });

    logger.info(`Bid placed on job ${jobId} by fundi ${fundi._id}`);
  } catch (error) {
    next(error);
  }
};

export const getJobBids = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const userId = req.user._id;

    const job = await Job.findById(jobId)
      .populate({
        path: 'bids.fundi',
        populate: {
          path: 'user',
          select: 'firstName lastName profilePhoto'
        }
      });

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    if (job.client.toString() !== userId.toString() && !['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view bids'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        job: {
          id: job._id,
          title: job.title,
          status: job.status,
          budget: job.budget
        },
        bids: job.bids.sort((a, b) => a.amount - b.amount)
      }
    });
  } catch (error) {
    next(error);
  }
};

export const acceptBid = async (req, res, next) => {
  try {
    const { jobId, bidId } = req.params;
    const userId = req.user._id;

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    if (job.client.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to accept bids'
      });
    }

    const bid = job.bids.id(bidId);
    if (!bid) {
      return res.status(404).json({
        success: false,
        error: 'Bid not found'
      });
    }

    bid.status = 'accepted';
    job.assignedFundi = bid.fundi;
    job.status = 'assigned';
    job.timeline.assigned = new Date();
    job.assignmentMethod = 'bid';

    job.bids.forEach(b => {
      if (b._id.toString() !== bidId) {
        b.status = 'rejected';
      }
    });

    await job.save();

    await Notification.create([
      {
        recipient: bid.fundi,
        recipientType: 'fundi',
        title: 'Bid Accepted',
        message: `Your bid for ${job.title} has been accepted`,
        notificationType: 'bid_accepted',
        actionData: { jobId }
      }
    ]);

    job.bids.forEach(async (b) => {
      if (b._id.toString() !== bidId && b.status === 'rejected') {
        await Notification.create({
          recipient: b.fundi,
          recipientType: 'fundi',
          title: 'Bid Not Selected',
          message: `Your bid for ${job.title} was not selected`,
          notificationType: 'bid_rejected',
          actionData: { jobId }
        });
      }
    });

    res.status(200).json({
      success: true,
      message: 'Bid accepted successfully',
      data: { job }
    });

    logger.info(`Bid ${bidId} accepted for job ${jobId}`);
  } catch (error) {
    next(error);
  }
};

export const rejectBid = async (req, res, next) => {
  try {
    const { jobId, bidId } = req.params;
    const { reason } = req.body;
    const userId = req.user._id;

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    if (job.client.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to reject bids'
      });
    }

    const bid = job.bids.id(bidId);
    if (!bid) {
      return res.status(404).json({
        success: false,
        error: 'Bid not found'
      });
    }

    bid.status = 'rejected';
    await job.save();

    await Notification.create({
      recipient: bid.fundi,
      recipientType: 'fundi',
      title: 'Bid Rejected',
      message: `Your bid for ${job.title} was rejected. ${reason || ''}`,
      notificationType: 'bid_rejected',
      actionData: { jobId }
    });

    res.status(200).json({
      success: true,
      message: 'Bid rejected successfully'
    });

    logger.info(`Bid ${bidId} rejected for job ${jobId}`);
  } catch (error) {
    next(error);
  }
};
