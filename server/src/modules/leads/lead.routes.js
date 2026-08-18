import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import * as leadController from './lead.controller.js';
import validate, { validateQuery } from '../../middleware/validate.js';
import { verifyToken, authorize } from '../../middleware/auth.js';
import ApiError from '../../utils/ApiError.js';
import { ROLES } from '../../constants/index.js';
import {
  createLeadSchema,
  updateLeadSchema,
  addNoteSchema,
  leadsQuerySchema,
  bulkDeleteSchema,
  bulkUpdateSchema,
} from './lead.validation.js';

const router = Router();

router.use(verifyToken);

router.get('/stats', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER), leadController.stats);

// Bulk routes MUST be registered before any '/:id' route so 'bulk' isn't captured as an id.
router.delete(
  '/bulk',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  validate(bulkDeleteSchema),
  leadController.bulkDelete,
);

router.patch(
  '/bulk',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE),
  validate(bulkUpdateSchema),
  leadController.bulkUpdate,
);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.xlsx', '.xls', '.csv'].includes(ext)) cb(null, true);
    else cb(ApiError.badRequest('Only .xlsx, .xls or .csv files are allowed'));
  },
});

const uploadLeadFile = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      return next(err instanceof multer.MulterError ? ApiError.badRequest('File too large. Maximum size is 5MB.') : err);
    }
    next();
  });
};

router.post(
  '/import',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  uploadLeadFile,
  leadController.importLeads,
);

router.get(
  '/',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE),
  validateQuery(leadsQuerySchema),
  leadController.list,
);

router.get(
  '/:id',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE),
  leadController.getById,
);

router.post(
  '/',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE),
  validate(createLeadSchema),
  leadController.create,
);

router.post(
  '/:id/notes',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE),
  validate(addNoteSchema),
  leadController.addNote,
);

router.patch(
  '/:id',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE),
  validate(updateLeadSchema),
  leadController.update,
);

router.delete(
  '/:id',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  leadController.remove,
);

export default router;
