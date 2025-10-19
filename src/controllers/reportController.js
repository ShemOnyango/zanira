import Report from '../models/Report.js';
import logger from '../middleware/logger.js';

export const getReportTemplates = async (req, res, next) => {
  try {
    // Simple static templates list; can be extended to read from DB or filesystem
    const templates = [
      { id: 'revenue', name: 'Revenue Report', description: 'Summary of platform revenue over a period' },
      { id: 'bookings', name: 'Bookings Report', description: 'Bookings by status and time' },
      { id: 'users', name: 'User Growth', description: 'New users and activity' }
    ];

    return res.status(200).json({ success: true, data: templates });
  } catch (error) {
    logger.error('getReportTemplates error', error);
    next(error);
  }
};

export const generateReport = async (req, res, next) => {
  try {
    const { templateId, params, title, reportType } = req.body || {};

    // Accept frontend's `reportType` as an alias for templateId
    const template = templateId || reportType || (req.body && (req.body.type || req.body.template));

    // Basic validation
    if (!template) {
      return res.status(400).json({ success: false, error: 'templateId (or reportType) is required' });
    }

    // Create a report record (processing can be handled by a worker in future)
    const report = await Report.create({
      title: title || `Report - ${template}`,
      template: template,
      params: params || {},
      status: 'processing',
      createdBy: req.user ? req.user._id : null
    });

    // For now, mark ready immediately (synchronous simplified generation)
    report.status = 'ready';
    report.resultUrl = `/api/v1/reports/${report._id}/download?format=pdf`;
    await report.save();

    return res.status(201).json({ success: true, data: report });
  } catch (error) {
    logger.error('generateReport error', error);
    next(error);
  }
};

export const getReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const report = await Report.findById(id);
    if (!report) return res.status(404).json({ success: false, error: 'Report not found' });
    return res.status(200).json({ success: true, data: report });
  } catch (error) {
    logger.error('getReport error', error);
    next(error);
  }
};

export const downloadReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { format = 'pdf' } = req.query;
    const report = await Report.findById(id);
    if (!report) return res.status(404).json({ success: false, error: 'Report not found' });

    // In a real implementation we'd stream a file from storage. For now, return a placeholder JSON or 204.
    return res.status(200).json({ success: true, data: { message: 'Report available', reportId: id, format } });
  } catch (error) {
    logger.error('downloadReport error', error);
    next(error);
  }
};
