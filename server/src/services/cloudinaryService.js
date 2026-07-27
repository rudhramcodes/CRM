import { v2 as cloudinary } from 'cloudinary';
import config from '../config/index.js';
import logger from '../utils/logger.js';

let configured = false;

const configure = () => {
  if (configured) return;
  if (config.cloudinary.cloudName && config.cloudinary.apiKey && config.cloudinary.apiSecret) {
    cloudinary.config({
      cloud_name: config.cloudinary.cloudName,
      api_key: config.cloudinary.apiKey,
      api_secret: config.cloudinary.apiSecret,
    });
    configured = true;
    logger.info('Cloudinary configured');
  } else {
    logger.warn('Cloudinary not configured — set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET');
  }
};

export const uploadBuffer = (buffer, { folder = 'crm/messages', publicId } = {}) =>
  new Promise((resolve, reject) => {
    configure();
    if (!configured) {
      return reject(new Error('Cloudinary not configured'));
    }
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, public_id: publicId, resource_type: 'image' },
      (err, result) => {
        if (err) reject(err);
        else resolve({ url: result.secure_url, fileId: result.public_id, name: result.original_filename || 'image' });
      },
    );
    uploadStream.end(buffer);
  });

export const deleteFile = async (publicId) => {
  configure();
  if (!configured) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    logger.error('Cloudinary delete failed', { error: err.message });
  }
};

export const uploadFile = async (file, folder = 'crm/messages') => {
  configure();
  if (!configured) {
    return { url: `/uploads/${Date.now()}-${file.originalname}`, fileId: `local-${Date.now()}`, name: file.originalname };
  }
  const result = await cloudinary.uploader.upload(file.path, { folder, resource_type: 'image' });
  return { url: result.secure_url, fileId: result.public_id, name: file.originalname || 'image' };
};
