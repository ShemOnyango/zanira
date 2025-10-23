import cloudinary from '../config/cloudinary.js';
import Fundi from '../models/Fundi.js';
import User from '../models/User.js';
import Verification from '../models/Verification.js';
//import { protect, authorize } from '../middleware/auth.js';
import logger from '../middleware/logger.js';

// @desc    Upload profile photo
// @route   POST /api/v1/files/upload-profile-photo
// @access  Private
export const uploadProfilePhoto = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const user = await User.findById(req.user._id);
    
    // Delete old profile photo if exists
    if (user.profilePhoto) {
      try {
        const publicId = user.profilePhoto.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`zanira-buildlink/profile-photos/${publicId}`);
      } catch (error) {
        logger.warn('Error deleting old profile photo:', error);
      }
    }

    // Update user with new profile photo
    user.profilePhoto = req.file.path;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile photo uploaded successfully',
      data: {
        profilePhoto: user.profilePhoto
      }
    });

    logger.info(`Profile photo uploaded for user: ${user._id}`);
  } catch (error) {
    next(error);
  }
};

// @desc    Upload verification documents
// @route   POST /api/v1/files/upload-verification
// @access  Private
export const uploadVerificationDocuments = async (req, res, next) => {
  try {
    const { documentType } = req.body;
    
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files uploaded'
      });
    }

    const verification = await Verification.findOne({
      applicant: req.user._id,
      applicantType: req.user.role === 'fundi' ? 'fundi' : 'client'
    });

    if (!verification) {
      return res.status(404).json({
        success: false,
        error: 'Verification record not found'
      });
    }

    const uploadedFiles = {};

    // Process each uploaded file
    for (const [fieldName, files] of Object.entries(req.files)) {
      const fileArray = Array.isArray(files) ? files : [files];
      
      for (const file of fileArray) {
  const documentField = mapFieldToDocument(fieldName);
        
        if (documentField) {
          if (Array.isArray(verification.documents[documentField])) {
            // For array fields like otherCertificates
            verification.documents[documentField].push({
              name: documentType || fieldName,
              url: file.path,
              uploadedAt: new Date(),
              status: 'pending'
            });
          } else {
            // For single document fields
            verification.documents[documentField] = {
              url: file.path,
              uploadedAt: new Date(),
              status: 'pending'
            };
          }

          uploadedFiles[fieldName] = file.path;
        }
      }
    }

    // Update verification status
    verification.status = 'submitted';
    verification.submissionDate = new Date();
    
    await verification.save();

    res.status(200).json({
      success: true,
      message: 'Verification documents uploaded successfully',
      data: {
        verificationId: verification._id,
        uploadedFiles,
        status: verification.status
      }
    });

    logger.info(`Verification documents uploaded for user: ${req.user._id}`);
  } catch (error) {
    next(error);
  }
};

// @desc    Upload portfolio items
// @route   POST /api/v1/files/upload-portfolio
// @access  Private/Fundi
export const uploadPortfolio = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files uploaded'
      });
    }

    const fundi = await Fundi.findOne({ user: req.user._id });
    if (!fundi) {
      return res.status(404).json({
        success: false,
        error: 'Fundi profile not found'
      });
    }

    const portfolioItems = [];

    for (const file of req.files) {
      const portfolioItem = {
        title: req.body.title || `Portfolio ${fundi.portfolio.length + 1}`,
        description: req.body.description || '',
        beforeImage: file.fieldname === 'beforeImage' ? file.path : null,
        afterImage: file.fieldname === 'afterImage' ? file.path : null,
        dateCompleted: req.body.dateCompleted || new Date(),
        category: req.body.category || 'general'
      };

      // If this is an after image, find the corresponding before image
      if (file.fieldname === 'afterImage' && fundi.portfolio.length > 0) {
        const lastItem = fundi.portfolio[fundi.portfolio.length - 1];
        if (lastItem.beforeImage && !lastItem.afterImage) {
          lastItem.afterImage = file.path;
          await fundi.save();
          continue;
        }
      }

      portfolioItems.push(portfolioItem);
    }

    // Add new portfolio items
    fundi.portfolio.push(...portfolioItems);
    await fundi.save();

    res.status(200).json({
      success: true,
      message: 'Portfolio items uploaded successfully',
      data: {
        portfolio: fundi.portfolio
      }
    });

    logger.info(`Portfolio uploaded for fundi: ${fundi._id}`);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete file
// @route   DELETE /api/v1/files/delete
// @access  Private
export const deleteFile = async (req, res, next) => {
  try {
    const { publicId, documentType, itemId } = req.body;

    if (!publicId) {
      return res.status(400).json({
        success: false,
        error: 'Public ID is required'
      });
    }

    let hasPermission = false;
    let updateQuery = {};

    // Verify ownership and build update query - fix case blocks
    switch (documentType) {
      case 'profile_photo': {
        const user = await User.findById(req.user._id);
        if (user.profilePhoto && user.profilePhoto.includes(publicId)) {
          hasPermission = true;
          updateQuery = { $unset: { profilePhoto: 1 } };
        }
        break;
      }

      case 'verification_document': {
        const verification = await Verification.findOne({
          applicant: req.user._id
        });
        
        if (verification) {
          // Check if document belongs to user
          const documentFields = Object.keys(verification.documents);
          for (const field of documentFields) {
            const doc = verification.documents[field];
            if (doc && doc.url && doc.url.includes(publicId)) {
              hasPermission = true;
              updateQuery[`documents.${field}`] = null;
              break;
            }
          }
        }
        break;
      }

      case 'portfolio_item': {
        const fundi = await Fundi.findOne({ user: req.user._id });
        if (fundi && itemId) {
          const portfolioItem = fundi.portfolio.id(itemId);
          if (portfolioItem && 
              (portfolioItem.beforeImage?.includes(publicId) || 
               portfolioItem.afterImage?.includes(publicId))) {
            hasPermission = true;
            
            if (portfolioItem.beforeImage?.includes(publicId)) {
              portfolioItem.beforeImage = null;
            }
            if (portfolioItem.afterImage?.includes(publicId)) {
              portfolioItem.afterImage = null;
            }
          }
        }
        break;
      }

      default: {
        return res.status(400).json({
          success: false,
          error: 'Invalid document type'
        });
      }
    }


    if (!hasPermission && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this file'
      });
    }

    // Delete from Cloudinary
    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result !== 'ok') {
      return res.status(400).json({
        success: false,
        error: 'Failed to delete file from storage'
      });
    }

    // Update database
    switch (documentType) {
      case 'profile_photo': {
        await User.findByIdAndUpdate(req.user._id, updateQuery);
        break;
      }
      case 'verification_document': {
        await Verification.findOneAndUpdate(
          { applicant: req.user._id },
          updateQuery
        );
        break;
      }
      case 'portfolio_item': {
        const fundi = await Fundi.findOne({ user: req.user._id });
        if (fundi) await fundi.save();
        break;
      }
    }

    res.status(200).json({
      success: true,
      message: 'File deleted successfully'
    });

    logger.info(`File deleted: ${publicId} by user ${req.user._id}`);
  } catch (error) {
    next(error);
  }
};

// @desc    Get file information
// @route   GET /api/v1/files/info/:publicId
// @access  Private
export const getFileInfo = async (req, res, next) => {
  try {
    const { publicId } = req.params;

    const result = await cloudinary.api.resource(publicId, {
      image_metadata: true
    });

    // Check if user has permission to access this file
  const hasPermission = await verifyFileAccess(req.user._id, publicId);
    
    if (!hasPermission && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to access this file'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        file: {
          publicId: result.public_id,
          format: result.format,
          size: result.bytes,
          width: result.width,
          height: result.height,
          url: result.secure_url,
          createdAt: result.created_at,
          metadata: result.image_metadata
        }
      }
    });
  } catch (error) {
    if (error.http_code === 404) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }
    next(error);
  }
};

// @desc    Generate secure upload URL
// @route   POST /api/v1/files/generate-upload-url
// @access  Private
export const generateUploadUrl = async (req, res, next) => {
  try {
    const { folder = 'zanira-buildlink/misc', resourceType = 'image' } = req.body;

    const timestamp = Math.round(new Date().getTime() / 1000);
    const signature = cloudinary.utils.api_sign_request(
      {
        timestamp: timestamp,
        folder: folder,
        resource_type: resourceType
      },
      process.env.CLOUDINARY_API_SECRET
    );

    res.status(200).json({
      success: true,
      data: {
        url: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`,
        params: {
          api_key: process.env.CLOUDINARY_API_KEY,
          timestamp: timestamp,
          signature: signature,
          folder: folder
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Helper method to map field names to document fields
const mapFieldToDocument = (fieldName) => {
  const fieldMap = {
    'nationalIdFront': 'nationalIdFront',
    'nationalIdBack': 'nationalIdBack',
    'ncaCertificate': 'ncaCertificate',
    'video': 'video',
    'photoWithTools': 'photoWithTools',
    'businessRegistration': 'businessRegistration',
    'businessPermit': 'businessPermit',
    'otherCertificates': 'otherCertificates'
  };

  return fieldMap[fieldName];
};

// Helper method to verify file access
const verifyFileAccess = async (userId, publicId) => {
  // Check user documents
  const user = await User.findById(userId);
  if (user.profilePhoto && user.profilePhoto.includes(publicId)) {
    return true;
  }

  // Check verification documents
  const verification = await Verification.findOne({ applicant: userId });
  if (verification) {
    const documents = Object.values(verification.documents).flat();
    for (const doc of documents) {
      if (doc && doc.url && doc.url.includes(publicId)) {
        return true;
      }
    }
  }

  // Check fundi portfolio
  if (user.role === 'fundi') {
    const fundi = await Fundi.findOne({ user: userId });
    if (fundi) {
      for (const item of fundi.portfolio) {
        if ((item.beforeImage && item.beforeImage.includes(publicId)) ||
            (item.afterImage && item.afterImage.includes(publicId))) {
          return true;
        }
      }
    }
  }

  return false;
};

// Individual functions are exported above using `export const` declarations.