import ApiResponse from '../../utils/ApiResponse.js';
import ApiError from '../../utils/ApiError.js';
import * as leadService from './lead.service.js';
import User from '../auth/auth.model.js';

export const createPublicLead = async (req, res, next) => {
  try {
    // Find a default system user or super_admin to act as the creator/assignee
    let systemUser = await User.findOne({ role: 'super_admin', isActive: true });
    
    if (!systemUser) {
      systemUser = await User.findOne({ role: 'admin', isActive: true });
    }

    if (!systemUser) {
      throw ApiError.internal('System configuration error: No admin found to assign the lead.');
    }

    // Force some fields for public leads
    const leadData = {
      ...req.body,
      source: 'website',
      status: 'new',
    };

    const lead = await leadService.createLead(leadData, systemUser);
    
    ApiResponse.created(res, { lead: { id: lead._id, name: lead.name } }, 'Inquiry submitted successfully');
  } catch (error) {
    next(error);
  }
};
