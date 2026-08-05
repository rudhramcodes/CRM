import { Router } from 'express';
import * as settingsController from './settings.controller.js';
import { verifyToken, authorize } from '../../middleware/auth.js';
import validate from '../../middleware/validate.js';
import { updateNotifPrefsSchema, updateOrgSchema, updateRolesSchema, updateSecuritySchema, updateIntegrationSchema } from './settings.validation.js';
import { ROLES } from '../../constants/index.js';

const router = Router();

// Public: Zoho OAuth callback (Zoho redirects here with ?code=, no app JWT)
router.get('/zoho/callback', settingsController.zohoCallback);

router.use(verifyToken);

// Zoho Meetings OAuth 2.0 (admin+)
router.get('/zoho/auth-url', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), settingsController.getZohoAuthUrl);
router.post('/zoho/disconnect', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), settingsController.disconnectZoho);

// Notification preferences (any authenticated user)
router.get('/notifications', settingsController.getNotifPrefs);
router.put('/notifications', validate(updateNotifPrefsSchema), settingsController.updateNotifPrefs);

// Organization settings (admin+)
router.get('/organization', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EMPLOYEE), settingsController.getOrgSettings);
router.put('/organization', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), validate(updateOrgSchema), settingsController.updateOrgSettings);

// Roles & Permissions (super_admin only)
router.get('/roles', authorize(ROLES.SUPER_ADMIN), settingsController.getRolesPermissions);
router.put('/roles', authorize(ROLES.SUPER_ADMIN), validate(updateRolesSchema), settingsController.updateRolePermissions);

// Security settings (admin+)
router.get('/security', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), settingsController.getSecuritySettings);
router.put('/security', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), validate(updateSecuritySchema), settingsController.updateSecuritySettings);

// Integration settings (admin+)
router.get('/integrations', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), settingsController.getIntegrationSettings);
router.put('/integrations', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), validate(updateIntegrationSchema), settingsController.updateIntegrationSettings);

export default router;
