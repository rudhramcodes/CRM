import ApiError from '../../utils/ApiError.js';
import generateClientId from '../../utils/generateClientId.js';
import * as clientRepository from './client.repository.js';
import * as leadRepository from '../leads/lead.repository.js';
import * as notificationService from '../notifications/notification.service.js';
import User from '../auth/auth.model.js';
import { sendClientOnboardingEmail } from '../../services/emailService.js';
import logger from '../../utils/logger.js';

export const create = async (data, user) => {
  if (data.gstNumber) {
    const existingGst = await clientRepository.findByGst(data.gstNumber);
    if (existingGst) {
      throw ApiError.conflict('A client with this GST number already exists');
    }
  }

  const clientId = await generateClientId(data.brand);

  const payload = {
    clientId,
    brand: data.brand,
    companyName: data.companyName,
    contactPerson: data.contactPerson,
    email: data.email,
    phone: data.phone || null,
    gstNumber: data.gstNumber || null,
    panNumber: data.panNumber || null,
    address: data.address || {},
    status: data.status || 'active',
    createdBy: user._id,
  };

  if (data.notes) {
    payload.notes = [{ text: data.notes, createdBy: user._id }];
  }

  const client = await clientRepository.create(payload);

  sendClientOnboardingEmail(data.email, {
    clientName: data.contactPerson,
    companyName: data.companyName,
    clientId: client.clientId,
    brand: data.brand,
  }).catch((err) => logger.error(`[create-client] Welcome email failed: ${err.message}`));

  return client;
};

export const convertFromLead = async (leadId, user) => {
  const lead = await leadRepository.findById(leadId);
  if (!lead) {
    throw ApiError.notFound('Lead not found');
  }

  if (lead.convertedToClient) {
    throw ApiError.conflict('This lead has already been converted to a client');
  }

  const brand = lead.brand || 'panigrahna';
  const clientId = await generateClientId(brand);

  const client = await clientRepository.create({
    clientId,
    brand,
    companyName: lead.company || `${lead.name}'s Company`,
    contactPerson: lead.name,
    email: lead.email,
    phone: lead.phone,
    convertedFrom: lead._id,
    status: 'active',
    createdBy: user._id,
  });

  await leadRepository.updateById(leadId, {
    convertedToClient: client._id,
    convertedAt: new Date(),
  });

  const allMembers = await User.find({ isActive: true, role: { $ne: 'client' } }).select('_id');
  const memberIds = allMembers
    .map((u) => String(u._id))
    .filter((uid) => uid !== String(user._id));

  const notif = notificationService.buildNotification('lead_converted', {
    leadName: lead.name,
  });
  notificationService.createAndSendBulk(memberIds, {
    referenceId: client._id, referenceModel: 'Client',
    actionBy: user._id, link: `/clients/${client._id}`,
    ...notif,
  }).catch(() => {});

  sendClientOnboardingEmail(lead.email, {
    clientName: lead.name,
    companyName: lead.company || `${lead.name}'s Company`,
    clientId: client.clientId,
    brand,
  }).catch((err) => logger.error(`[convert-lead] Welcome email failed: ${err.message}`));

  return client;
};

export const getAll = async (query, options) => {
  return clientRepository.findAll(query, options);
};

export const getById = async (id) => {
  const client = await clientRepository.findById(id);
  if (!client) {
    throw ApiError.notFound('Client not found');
  }
  return client;
};

export const update = async (id, data) => {
  const client = await clientRepository.findById(id);
  if (!client) {
    throw ApiError.notFound('Client not found');
  }

  if (data.gstNumber && data.gstNumber !== client.gstNumber) {
    const existingGst = await clientRepository.findByGst(data.gstNumber);
    if (existingGst) {
      throw ApiError.conflict('A client with this GST number already exists');
    }
  }

  return clientRepository.updateById(id, data);
};

export const remove = async (id) => {
  const client = await clientRepository.findById(id);
  if (!client) {
    throw ApiError.notFound('Client not found');
  }
  return clientRepository.deleteById(id);
};

export const getStats = async () => {
  const [statusCounts, brandCounts, total] = await Promise.all([
    clientRepository.countByStatus(),
    clientRepository.countByBrand(),
    clientRepository.countAll(),
  ]);

  const stats = { total, active: 0, inactive: 0 };
  statusCounts.forEach(({ _id, count }) => {
    stats[_id] = count;
  });

  const byBrand = {};
  brandCounts.forEach(({ _id, count }) => {
    byBrand[_id || 'unassigned'] = count;
  });

  return { ...stats, byBrand };
};

export const getMyProfile = async (user, clientProfile) => {
  const client = clientProfile || (await clientRepository.findOneByUser(user._id));
  if (!client) {
    throw ApiError.forbidden('Client profile not found');
  }

  const [Project, Meeting] = await Promise.all([
    import('../projects/project.model.js').then((m) => m.default),
    import('../meetings/meeting.model.js').then((m) => m.default),
  ]);

  const [projectsByStatus, totalProjects, upcomingMeetings] = await Promise.all([
    Project.aggregate([
      { $match: { client: client._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Project.countDocuments({ client: client._id }),
    Meeting.countDocuments({
      $or: [{ client: client._id }, { attendees: user._id }],
      status: 'scheduled',
      date: { $gte: new Date() },
    }),
  ]);

  return {
    client: {
      _id: client._id,
      companyName: client.companyName,
      contactPerson: client.contactPerson,
      email: client.email,
      phone: client.phone,
      brand: client.brand,
      status: client.status,
      address: client.address,
    },
    stats: {
      projectsByStatus,
      totalProjects,
      upcomingMeetings,
    },
  };
};
