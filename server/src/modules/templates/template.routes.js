import { Router } from 'express';
import { verifyToken, authorize } from '../../middleware/auth.js';
import { ROLES } from '../../constants/index.js';
import Template from './template.model.js';
import ApiResponse from '../../utils/ApiResponse.js';

const router = Router();

router.use(verifyToken);

router.get('/', async (req, res, next) => {
  try {
    const templates = await Template.find({ isActive: true })
      .populate('createdBy', 'name email')
      .sort('venture');
    ApiResponse.success(res, 200, { templates });
  } catch (error) {
    next(error);
  }
});

router.get('/:venture', async (req, res, next) => {
  try {
    let template = await Template.findOne({ venture: req.params.venture })
      .populate('createdBy', 'name email');
    if (!template) {
      template = { venture: req.params.venture, isActive: true, config: {} };
    }
    ApiResponse.success(res, 200, { template });
  } catch (error) {
    next(error);
  }
});

router.patch(
  '/:venture',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  async (req, res, next) => {
    try {
      const template = await Template.findOneAndUpdate(
        { venture: req.params.venture },
        { ...req.body, createdBy: req.user._id },
        { new: true, upsert: true, runValidators: true },
      );
      ApiResponse.success(res, 200, { template }, 'Template updated');
    } catch (error) {
      next(error);
    }
  },
);

export default router;
