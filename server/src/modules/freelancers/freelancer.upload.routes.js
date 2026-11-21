import { Router } from 'express';
import multer from 'multer';
import cloudinary from 'cloudinary';
import rateLimit from 'express-rate-limit';
import config from '../../config/index.js';
import logger from '../../utils/logger.js';
import { verifyToken, authorize } from '../../middleware/auth.js';
import { ROLES } from '../../constants/index.js';

cloudinary.v2.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
});

// Stores one profile photo (form field `file`) in Cloudinary and returns its URL.
const storeProfilePhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file provided' });
    }

    const b64 = Buffer.from(req.file.buffer).toString('base64');
    const dataURI = `data:${req.file.mimetype};base64,${b64}`;

    const result = await cloudinary.v2.uploader.upload(dataURI, {
      folder: 'freelancer-portal/profiles',
      resource_type: 'image',
      transformation: [
        { width: 500, height: 500, crop: 'limit', quality: 'auto' },
      ],
    });

    res.json({
      success: true,
      data: {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
      },
    });
  } catch (error) {
    logger.error('Cloudinary upload failed:', error.message);
    res.status(500).json({ success: false, message: 'Failed to upload image' });
  }
};

// Staff upload (freelancer form on web and mobile): POST /api/freelancers/upload/upload, signed-in staff only,
// same roles as the freelancer routes. It used to be open to anyone.
const router = Router();
router.post(
  '/upload',
  verifyToken,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER),
  upload.single('file'),
  storeProfilePhoto,
);

// Public apply form (no login): POST /api/freelancers/public/upload. A few photos per visitor per hour is plenty;
// the cap stops anyone using it as free image hosting.
const publicUploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many uploads. Please try again later.' },
});
export const publicPhotoUpload = [publicUploadLimiter, upload.single('file'), storeProfilePhoto];

export default router;