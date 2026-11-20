import fs from 'node:fs/promises';
import path from 'node:path';
import { uploadBuffer } from './cloudinaryService.js';
import config from '../config/index.js';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';

export const UPLOAD_DIR = path.resolve('uploads');

// Images go to Cloudinary as images, PDFs as raw files (Cloudinary blocks PDF delivery as images on most plans).
// shortcut: without Cloudinary, files are written to ./uploads for local dev only; production refuses instead of
// storing on a disk that is wiped on deploy.
export const uploadFile = async (file, folder = 'crm/general') => {
  const resourceType = file.mimetype?.startsWith('image/') ? 'image' : 'raw';
  try {
    const r = await uploadBuffer(file.buffer, { folder, resourceType });
    return { url: r.url, fileId: r.fileId };
  } catch (err) {
    if (config.nodeEnv === 'production') {
      logger.error('Upload failed', { error: err.message });
      throw new ApiError(503, "Couldn't upload the file, try again");
    }
    const name = `${Date.now()}-${file.originalname.replace(/[^\w.-]+/g, '_')}`;
    await fs.mkdir(path.join(UPLOAD_DIR, folder), { recursive: true });
    await fs.writeFile(path.join(UPLOAD_DIR, folder, name), file.buffer);
    return { url: `/uploads/${folder}/${name}`, fileId: `local-${name}` };
  }
};

export const deleteFile = async (fileId) => {
  if (!fileId || fileId.startsWith('local-')) return;
  const { deleteFile: del } = await import('./cloudinaryService.js');
  await del(fileId);
};

export const getFileUrl = (filePath) => {
  if (filePath?.startsWith('http')) return filePath;
  if (!filePath) return null;
  return filePath;
};
