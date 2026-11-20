import { Router } from 'express';
import { z } from 'zod';
import { verifyToken, authorize } from '../../middleware/auth.js';
import validate from '../../middleware/validate.js';
import { ROLES } from '../../constants/index.js';
import ApiResponse from '../../utils/ApiResponse.js';
import ApiError from '../../utils/ApiError.js';
import Team from './team.model.js';

const router = Router();
router.use(verifyToken);

const STAFF = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE];
const EDITORS = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER];
const id = z.string().regex(/^[a-f\d]{24}$/i, 'Pick a person');
const teamSchema = z.object({
  name: z.string().trim().min(2, 'Give the team a name').max(60),
  lead: id.nullable().optional(),
  members: z.array(id).min(1, 'Add at least one person').max(50),
});
const POPULATE = [{ path: 'lead', select: 'name avatar' }, { path: 'members', select: 'name avatar' }];
// The lead is always a member.
const body = (b) => ({ ...b, members: [...new Set([...(b.lead ? [b.lead] : []), ...b.members])] });
const duplicate = (err) => (err?.code === 11000 ? ApiError.conflict('A team with this name already exists') : err);

router.get('/', authorize(...STAFF), async (_req, res, next) => {
  try {
    ApiResponse.success(res, 200, { teams: await Team.find().sort('name').populate(POPULATE) });
  } catch (err) { next(err); }
});

router.post('/', authorize(...EDITORS), validate(teamSchema), async (req, res, next) => {
  try {
    const team = await Team.create({ ...body(req.body), createdBy: req.user._id });
    ApiResponse.created(res, { team: await team.populate(POPULATE) }, 'Team created');
  } catch (err) { next(duplicate(err)); }
});

router.patch('/:id', authorize(...EDITORS), validate(teamSchema), async (req, res, next) => {
  try {
    const team = await Team.findByIdAndUpdate(req.params.id, body(req.body), { new: true, runValidators: true }).populate(POPULATE);
    if (!team) throw ApiError.notFound('Team not found');
    ApiResponse.success(res, 200, { team }, 'Team saved');
  } catch (err) { next(duplicate(err)); }
});

router.delete('/:id', authorize(...EDITORS), async (req, res, next) => {
  try {
    if (!(await Team.findByIdAndDelete(req.params.id))) throw ApiError.notFound('Team not found');
    ApiResponse.success(res, 200, null, 'Team deleted');
  } catch (err) { next(err); }
});

export default router;
