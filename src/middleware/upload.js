import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary.js';
import path from 'path';

// Configure Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: (req, file) => {
      let folder = 'zanira-buildlink';
      
      // Determine folder based on file type and user role
      if (file.fieldname === 'profilePhoto') {
        folder += '/profile-photos';
      } else if (file.fieldname.includes('document')) {
        folder += '/documents';
      } else if (file.fieldname.includes('video')) {
        folder += '/videos';
      } else if (file.fieldname.includes('portfolio')) {
        folder += '/portfolio';
      } else {
        folder += '/misc';
      }

      return folder;
    },
    format: async (req, file) => {
      const ext = path.extname(file.originalname).toLowerCase();
      
      if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(ext)) {
        return 'jpg';
      } else if (['.mp4', '.avi', '.mov', '.wmv'].includes(ext)) {
        return 'mp4';
      } else if (['.pdf', '.doc', '.docx'].includes(ext)) {
        return 'pdf';
      }
      
      return null; // Let Cloudinary determine format
    },
    public_id: (req, file) => {
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 15);
      return `${file.fieldname}-${timestamp}-${random}`;
    },
    resource_type: (req, file) => {
      const ext = path.extname(file.originalname).toLowerCase();
      
      if (['.mp4', '.avi', '.mov', '.wmv'].includes(ext)) {
        return 'video';
      } else if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(ext)) {
        return 'image';
      } else if (['.pdf', '.doc', '.docx'].includes(ext)) {
        return 'raw';
      }
      
      return 'auto';
    }
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  // Check file types
  const allowedImageTypes = /jpeg|jpg|png|gif|bmp|webp/;
  const allowedVideoTypes = /mp4|avi|mov|wmv/;
  const allowedDocumentTypes = /pdf|doc|docx/;
  
  const extname = path.extname(file.originalname).toLowerCase();
  
  if (file.fieldname === 'profilePhoto' || file.fieldname.includes('photo')) {
    if (allowedImageTypes.test(extname)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, JPG, PNG, GIF, BMP, WEBP) are allowed for photos'), false);
    }
  } else if (file.fieldname.includes('video')) {
    if (allowedVideoTypes.test(extname)) {
      cb(null, true);
    } else {
      cb(new Error('Only video files (MP4, AVI, MOV, WMV) are allowed for videos'), false);
    }
  } else if (file.fieldname.includes('document')) {
    if (allowedDocumentTypes.test(extname)) {
      cb(null, true);
    } else {
      cb(new Error('Only document files (PDF, DOC, DOCX) are allowed for documents'), false);
    }
  } else {
    // For other files, allow common types
    if (allowedImageTypes.test(extname) || allowedDocumentTypes.test(extname)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'), false);
    }
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
    files: 10 // Maximum 10 files
  }
});

// Specific upload configurations
export const uploadProfilePhoto = upload.single('profilePhoto');
export const uploadDocuments = upload.fields([
  { name: 'nationalIdFront', maxCount: 1 },
  { name: 'nationalIdBack', maxCount: 1 },
  { name: 'ncaCertificate', maxCount: 1 },
  { name: 'businessRegistration', maxCount: 1 },
  { name: 'businessPermit', maxCount: 1 }
]);
export const uploadVerification = upload.fields([
  { name: 'video', maxCount: 1 },
  { name: 'photoWithTools', maxCount: 1 },
  { name: 'nationalIdFront', maxCount: 1 },
  { name: 'nationalIdBack', maxCount: 1 },
  { name: 'ncaCertificate', maxCount: 1 },
  { name: 'otherCertificates', maxCount: 5 }
]);
export const uploadPortfolio = upload.array('portfolio', 10); // Max 10 portfolio items
export const uploadChatFiles = upload.array('attachments', 5); // Max 5 files per message

// Error handling middleware for multer
export const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large. Maximum size is 10MB.'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: 'Too many files. Please check the maximum allowed files.'
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        error: 'Unexpected field in file upload.'
      });
    }
  } else if (err) {
    return res.status(400).json({
      success: false,
      error: err.message
    });
  }
  
  next();
};

export default upload;