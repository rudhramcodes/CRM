import ApiError from '../../utils/ApiError.js';
import crypto from 'crypto';
import generateClientId from '../../utils/generateClientId.js';
import * as clientRepository from './client.repository.js';
import * as leadRepository from '../leads/lead.repository.js';
import * as notificationService from '../notifications/notification.service.js';
import User from '../auth/auth.model.js';
import { ROLES, ROLE_PERMISSIONS } from '../../constants/index.js';
import { sendPortalInviteEmail, sendClientOnboardingEmail, sendClientCredentialsEmail } from '../../services/emailService.js';
import logger from '../../utils/logger.js';

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const PORTAL_INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const CLIENT_DEFAULT_PASSWORD = 'client@rudhram';

export const sendPortalInvite = async (clientId) => {
  const client = await clientRepository.findById(clientId);
  if (!client) {
    throw ApiError.notFound('Client not found');
  }

  if (client.user) {
    const existing = await User.findById(client.user);
    if (existing?.isActive) {
      throw ApiError.conflict('Portal account already active for this client');
    }
  } else {
    const emailTaken = await User.findOne({ email: client.email });
    if (emailTaken) {
      throw ApiError.conflict('A user with this email already exists');
    }

    const portalUser = await User.create({
      name: client.contactPerson,
      email: client.email,
      password: crypto.randomBytes(16).toString('hex'),
      role: ROLES.CLIENT,
      permissions: ROLE_PERMISSIONS[ROLES.CLIENT],
      isActive: false,
      isEmailVerified: false,
    });
    client.user = portalUser._id;
  }

  const inviteToken = crypto.randomBytes(32).toString('hex');
  client.portalInviteToken = hashToken(inviteToken);
  client.portalInviteExpires = new Date(Date.now() + PORTAL_INVITE_TTL_MS);
  await client.save();

  sendPortalInviteEmail(client.email, inviteToken).catch((err) =>
    logger.error(`Portal invite email failed: ${err.message}`),
  );

  return {
    clientId: client._id,
    email: client.email,
    expiresAt: client.portalInviteExpires,
  };
};

export const create = async (data, user) => {
  const existing = await clientRepository.findByEmail(data.email);
  if (existing) {
    throw ApiError.conflict('A client with this email already exists');
  }

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

  // Auto-create portal user account for the client
  let portalUserCreated = false;
  const existingUser = await User.findOne({ email: data.email });
  if (!existingUser) {
    try {
      const portalUser = await User.create({
        name: data.contactPerson,
        email: data.email,
        password: CLIENT_DEFAULT_PASSWORD,
        role: ROLES.CLIENT,
        permissions: ROLE_PERMISSIONS[ROLES.CLIENT],
        isActive: true,
        isEmailVerified: true,
        mustChangePassword: true,
      });

      client.user = portalUser._id;
      await client.save();
      portalUserCreated = true;
    } catch (err) {
      logger.error(`[create-client] Failed to create portal user: ${err.message}`);
    }
  } else {
    portalUserCreated = true;
  }

  if (portalUserCreated) {
    sendClientOnboardingEmail(data.email, {
      clientName: data.contactPerson,
      companyName: data.companyName,
      clientId: client.clientId,
      brand: data.brand,
    }).catch((err) => logger.error(`[create-client] Onboarding email failed: ${err.message}`));

    const delayMs = 45000;
    new Promise((resolve) => setTimeout(resolve, delayMs)).then(() => {
      return sendClientCredentialsEmail(data.email, {
        clientName: data.contactPerson,
        email: data.email,
        password: CLIENT_DEFAULT_PASSWORD,
      });
    }).catch((err) => logger.error(`[create-client] Credentials email failed: ${err.message}`));
  }

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

  const existing = await clientRepository.findByEmail(lead.email);
  if (existing) {
    throw ApiError.conflict('A client with this email already exists');
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
  }).catch((err) => logger.error(`[convert-lead] Onboarding email failed: ${err.message}`));

  let portalUserCreated = false;
  const existingUser = await User.findOne({ email: lead.email });
  if (!existingUser) {
    try {
      const portalUser = await User.create({
        name: lead.name,
        email: lead.email,
        password: CLIENT_DEFAULT_PASSWORD,
        role: ROLES.CLIENT,
        permissions: ROLE_PERMISSIONS[ROLES.CLIENT],
        isActive: true,
        isEmailVerified: true,
        mustChangePassword: true,
      });

      client.user = portalUser._id;
      await client.save();
      portalUserCreated = true;
    } catch (err) {
      logger.error(`[convert-lead] Failed to create portal user: ${err.message}`);
    }
  } else {
    portalUserCreated = true;
  }

  if (portalUserCreated) {
    new Promise((resolve) => setTimeout(resolve, 45000)).then(() => {
      return sendClientCredentialsEmail(lead.email, {
        clientName: lead.name,
        email: lead.email,
        password: CLIENT_DEFAULT_PASSWORD,
      });
    }).catch((err) => logger.error(`[convert-lead] Credentials email failed: ${err.message}`));
  }

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

  if (data.email && data.email !== client.email) {
    const existing = await clientRepository.findByEmail(data.email);
    if (existing) {
      throw ApiError.conflict('A client with this email already exists');
    }
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
