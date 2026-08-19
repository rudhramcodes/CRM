import ApiError from '../utils/ApiError.js';

/**
 * Factory for the client-profile attach middleware.
 * Staff roles pass through untouched — this middleware is mounted on shared
 * routes where staff must keep existing behavior. Client role loads the linked
 * active Client as `req.clientProfile` (403 if missing/inactive).
 */
export const createAttachClientProfile = (clientModel = null) => {
  return async (req, _res, next) => {
    try {
      if (req.user?.role !== 'client') {
        return next();
      }

      const Client = clientModel ?? (await import('../modules/clients/client.model.js')).default;
      const client = await Client.findOne({ user: req.user._id, status: 'active' });

      if (!client) {
        return next(ApiError.forbidden('Client profile not found or inactive'));
      }

      req.clientProfile = client;
      next();
    } catch (error) {
      next(error);
    }
  };
};

/** Default singleton — routes can `import { attachClientProfile }`. */
export const attachClientProfile = createAttachClientProfile();

export default attachClientProfile;