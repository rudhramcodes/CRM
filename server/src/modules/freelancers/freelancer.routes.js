import { Router } from 'express';
import * as controller from './freelancer.controller.js';
import validate, { validateQuery } from '../../middleware/validate.js';
import { verifyToken, authorize } from '../../middleware/auth.js';
import { ROLES } from '../../constants/index.js';
import { createFreelancerSchema, updateFreelancerSchema, freelancersQuerySchema } from './freelancer.validation.js';

const router = Router();
const managers = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER];

router.use(verifyToken);
router.get('/stats', authorize(...managers), controller.stats);
router.get('/', authorize(...managers), validateQuery(freelancersQuerySchema), controller.list);
router.get('/:id', authorize(...managers), controller.getById);
router.post('/', authorize(...managers), validate(createFreelancerSchema), controller.create);
router.patch('/:id', authorize(...managers), validate(updateFreelancerSchema), controller.update);
router.delete('/:id', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), controller.archive);

export default router;
