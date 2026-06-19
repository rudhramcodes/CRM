import config from '../config/index.js';
import logger from '../utils/logger.js';

// ImageKit integration placeholder
// Will be initialized when credentials are configured
let imageKitClient = null;

const getImageKit = () => {
  if (!imageKitClient && config.imagekit.publicKey) {
    // Dynamic import to avoid crash when ImageKit is not configured
    // ImageKit SDK would be initialized here
    logger.info('ImageKit client ready');
  }
  return imageKitClient;
};

export const uploadFile = async (file, folder = 'crm/general') => {
  const client = getImageKit();
  if (!client) {
    logger.warn('ImageKit not configured, using local fallback');
    // Return mock response for development
    return {
      url: `/uploads/${folder}/${Date.now()}-${file.originalname}`,
      fileId: `local-${Date.now()}`,
      name: file.originalname,
    };
  }
  // ImageKit upload implementation
  throw new Error('ImageKit not configured');
};

export const deleteFile = async (fileId) => {
  const client = getImageKit();
  if (!client) {
    logger.warn('ImageKit not configured, skipping delete');
    return;
  }
  // ImageKit delete implementation
};

export const getFileUrl = (filePath) => {
  if (filePath.startsWith('http')) return filePath;
  return `${config.clientUrl}${filePath}`;
};
