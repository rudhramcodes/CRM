import { uploadBuffer, uploadFile as cloudinaryUploadFile } from './cloudinaryService.js';
import logger from '../utils/logger.js';

export const uploadFile = async (file, folder = 'crm/general') => {
  if (file.buffer) {
    try {
      return await uploadBuffer(file.buffer, { folder });
    } catch (err) {
      logger.warn('Cloudinary upload failed, using local fallback', { error: err.message });
    }
  }
  return {
    url: `/uploads/${folder}/${Date.now()}-${file.originalname}`,
    fileId: `local-${Date.now()}`,
    name: file.originalname,
  };
};

export const deleteFile = async (fileId) => {
  const { deleteFile } = await import('./cloudinaryService.js');
  await deleteFile(fileId);
};

export const getFileUrl = (filePath) => {
  if (filePath?.startsWith('http')) return filePath;
  if (!filePath) return null;
  return filePath;
};
