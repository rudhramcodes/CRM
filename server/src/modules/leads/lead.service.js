import ApiError from '../../utils/ApiError.js';
import logger from '../../utils/logger.js';
import * as leadRepository from './lead.repository.js';
import * as clientRepository from '../clients/client.repository.js';
import * as notificationService from '../notifications/notification.service.js';
import generateClientId from '../../utils/generateClientId.js';
import * as XLSX from 'xlsx';
import { LEAD_STATUS, LEAD_BRANDS } from '../../constants/index.js';
import { sendClientOnboardingEmail, sendClientCredentialsEmail } from '../../services/emailService.js';
import User from '../auth/auth.model.js';

const CLIENT_DEFAULT_PASSWORD = 'client@rudhram';

const LEAD_SOURCES = ['google_ads', 'referral', 'instagram', 'linkedin', 'website', 'email', 'call', 'other'];
const MAX_IMPORT_ROWS = 1000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+]?[\d\s()-]{7,15}$/;

const HEADER_ALIASES = {
  name: ['name', 'leadname', 'fullname', 'lead_name', 'full_name'],
  email: ['email', 'emailaddress', 'email_address'],
  phone: ['phone', 'phonenumber', 'phone_number', 'mobile', 'contactnumber', 'contact_number'],
  company: ['company', 'companyname', 'company_name', 'organization', 'organisation'],
  brand: ['brand', 'venture'],
  source: ['source', 'leadsource', 'lead_source'],
  status: ['status', 'leadstatus', 'lead_status'],
  notes: ['notes', 'note', 'comments', 'comment'],
  followUpDate: ['followupdate', 'follow_up_date', 'followup', 'follow_up'],
};

const normalizeHeader = (header) =>
  String(header || '').trim().toLowerCase().replace(/[\s-]+/g, '_').replace(/_+/g, '_');

const buildHeaderMap = (rawRow) => {
  const aliasToField = {};
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    for (const alias of aliases) aliasToField[normalizeHeader(alias)] = field;
  }
  const map = {};
  for (const rawHeader of Object.keys(rawRow)) {
    const field = aliasToField[normalizeHeader(rawHeader)];
    if (field) map[field] = rawRow[rawHeader];
  }
  return map;
};

const normalizeEnum = (value, allowed) => {
  const raw = String(value ?? '').trim();
  if (!raw) return undefined;
  const normalized = raw.toLowerCase().replace(/[\s-]+/g, '_');
  if (allowed.includes(normalized)) return normalized;
  return null;
};

const isValidPhone = (value) => {
  if (!value) return true;
  if (!PHONE_RE.test(value)) return false;
  const raw = String(value);
  const national = raw.startsWith('+') ? raw.replace(/^\+?\d{1,3}\s*/, '') : raw;
  const digits = national.replace(/[^\d]/g, '');
  return digits.length >= 10;
};

const parseDate = (value) => {
  const raw = String(value ?? '').trim();
  if (!raw) return undefined;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
};

export const createLead = async (data, user) => {
  const existing = await leadRepository.findByEmail(data.email);
  if (existing) {
    throw ApiError.conflict('A lead with this email already exists');
  }

  const leadData = {
    ...data,
    createdBy: user._id,
    assignedTo: data.assignedTo || user._id,
  };

  if (data.notes?.length) {
    leadData.notes = data.notes.map((n) => ({
      text: n.text,
      createdBy: user._id,
    }));
  }

  if (data.followUpDate) {
    leadData.followUpDate = new Date(data.followUpDate);
  }

  const lead = await leadRepository.create(leadData);

  const { default: User } = await import('../auth/auth.model.js');
  const allUsers = await User.find({ isActive: true }).select('_id');
  const recipientIds = allUsers
    .map((u) => String(u._id))
    .filter((uid) => uid !== String(user._id));

  const notif = notificationService.buildNotification('lead_created', {
    leadName: lead.name, source: lead.source || 'manual',
  });
  notificationService.createAndSendBulk(recipientIds, {
    referenceId: lead._id, referenceModel: 'Lead',
    actionBy: user._id, link: `/leads/${lead._id}`, ...notif,
  }).catch(() => {});

  if (data.assignedTo && String(data.assignedTo) !== String(user._id)) {
    const assignedNotif = notificationService.buildNotification('lead_assigned', {
      leadName: lead.name, actorName: user.name,
    });
    notificationService.createAndSend({
      recipient: data.assignedTo, referenceId: lead._id, referenceModel: 'Lead',
      actionBy: user._id, link: `/leads/${lead._id}`,
      ...assignedNotif,
    }).catch(() => {});
  }

  return lead;
};

export const getLeads = async (query) => {
  const { page, limit, search, status, source, assignedTo, brand, sortBy, sortOrder } = query;

  return leadRepository.findAll(
    { search, status, source, assignedTo, brand },
    { page, limit, sortBy, sortOrder: sortOrder === 'asc' ? 'asc' : 'desc' },
  );
};

export const getLeadById = async (id) => {
  const lead = await leadRepository.findById(id);
  if (!lead) {
    throw ApiError.notFound('Lead not found');
  }
  return lead;
};

export const updateLead = async (id, data, user) => {
  const lead = await leadRepository.findById(id);
  if (!lead) {
    throw ApiError.notFound('Lead not found');
  }

  if (data.email && data.email !== lead.email) {
    const existing = await leadRepository.findByEmail(data.email);
    if (existing && existing._id.toString() !== id) {
      throw ApiError.conflict('A lead with this email already exists');
    }
  }

  if (data.status && data.status !== lead.status) {
    // If status is changed to 'won', auto-convert to client FIRST
    // Client creation must succeed before we mark the lead as won
    if (data.status === 'won' && !lead.convertedToClient) {
      let existingClient = await clientRepository.findByEmail(data.email || lead.email);
      if (existingClient) {
        data.convertedToClient = existingClient._id;
      } else {
        const brand = lead.brand || 'panigrahna';
        const clientEmail = data.email || lead.email;
        try {
          const client = await clientRepository.create({
            clientId: await generateClientId(brand),
            companyName: lead.company || `${lead.name}'s Company`,
            contactPerson: lead.name,
            email: clientEmail,
            phone: lead.phone,
            brand,
            convertedFrom: lead._id,
            status: 'active',
            createdBy: user._id,
          });
          data.convertedToClient = client._id;

          sendClientOnboardingEmail(clientEmail, {
            clientName: lead.name,
            companyName: lead.company || `${lead.name}'s Company`,
            clientId: client.clientId,
            brand,
          }).catch((err) => logger.error(`[lead-convert] Onboarding email failed: ${err.message}`));

          const existingUser = await User.findOne({ email: clientEmail });
          let portalUserCreated = false;
          if (!existingUser) {
            try {
              await User.create({
                name: lead.name,
                email: clientEmail,
                password: CLIENT_DEFAULT_PASSWORD,
                role: 'client',
                mustChangePassword: true,
                createdBy: user._id,
              });
              portalUserCreated = true;
              logger.info(`[lead-convert] Portal user created for ${clientEmail}`);
            } catch (userErr) {
              logger.error(`[lead-convert] Portal user creation failed: ${userErr.message}`);
            }
          } else {
            portalUserCreated = true;
          }

          if (portalUserCreated) {
            new Promise((resolve) => setTimeout(resolve, 45000))
              .then(() => sendClientCredentialsEmail(clientEmail, {
                clientName: lead.name,
                email: clientEmail,
                password: CLIENT_DEFAULT_PASSWORD,
              }))
              .then(() => logger.info(`[lead-convert] Credentials email sent to ${clientEmail}`))
              .catch((err) => logger.error(`[lead-convert] Credentials email failed: ${err.message}`));
          }
        } catch (err) {
          if (err.code === 11000) {
            const duplicateField = Object.keys(err.keyValue || {})[0] || 'unknown';
            logger.warn(`[lead-convert] E11000 on field "${duplicateField}" for lead ${lead._id}`);

            existingClient = await clientRepository.findByEmail(clientEmail);
            if (existingClient) {
              data.convertedToClient = existingClient._id;
            } else if (duplicateField === 'clientId') {
              const retryClientId = await generateClientId(brand);
              const retryClient = await clientRepository.create({
                clientId: retryClientId,
                companyName: lead.company || `${lead.name}'s Company`,
                contactPerson: lead.name,
                email: clientEmail,
                phone: lead.phone,
                brand,
                convertedFrom: lead._id,
                status: 'active',
                createdBy: user._id,
              });
              data.convertedToClient = retryClient._id;
            } else {
              throw ApiError.conflict(`Duplicate key on "${duplicateField}" — a client with this ${duplicateField} already exists`);
            }
          } else {
            throw err;
          }
        }
      }
      data.convertedAt = new Date();
    }

    data.statusChangedAt = new Date();
    data.statusChangedBy = user._id;
  }

  if (data.assignedTo) {
    const currentAssigned = lead.assignedTo
      ? String(lead.assignedTo._id || lead.assignedTo)
      : null;
    const newAssigned = String(data.assignedTo);

    if (newAssigned !== currentAssigned && newAssigned !== String(user._id)) {
      const notif = notificationService.buildNotification('lead_assigned', {
        leadName: lead.name, actorName: user.name,
      });
      notificationService.createAndSend({
        recipient: data.assignedTo, referenceId: lead._id, referenceModel: 'Lead',
        actionBy: user._id, link: `/leads/${lead._id}`,
        ...notif,
      }).catch(() => {});
    }

    if (currentAssigned && currentAssigned !== newAssigned && currentAssigned !== String(user._id)) {
      const notif = notificationService.buildNotification('lead_assigned', {
        leadName: lead.name, actorName: user.name,
      });
      notificationService.createAndSend({
        recipient: currentAssigned, referenceId: lead._id, referenceModel: 'Lead',
        actionBy: user._id, link: `/leads/${lead._id}`,
        title: `${user.name} reassigned a lead`,
        message: `${user.name} reassigned "${lead.name}" to another team member`,
        ...notif,
      }).catch(() => {});
    }
  }

  if (data.followUpDate) {
    data.followUpDate = new Date(data.followUpDate);  
  }

  const updated = await leadRepository.updateById(id, data);

  if (data.status === 'won') {
    const { default: User } = await import('../auth/auth.model.js');
    const allMembers = await User.find({ isActive: true, role: { $ne: 'client' } }).select('_id');
    const memberIds = allMembers
      .map((u) => String(u._id))
      .filter((uid) => uid !== String(user._id));

    const clientId = data.convertedToClient || updated.convertedToClient;
    const notif = notificationService.buildNotification('lead_converted', {
      leadName: lead.name,
    });
    notificationService.createAndSendBulk(memberIds, {
      referenceId: clientId || updated._id, referenceModel: 'Client',
      actionBy: user._id, link: clientId ? `/clients/${clientId}` : `/leads/${updated._id}`,
      ...notif,
    }).catch(() => {});
  }

  return updated;
};

export const addNote = async (id, noteData, user) => {
  const lead = await leadRepository.findById(id);
  if (!lead) {
    throw ApiError.notFound('Lead not found');
  }

  lead.notes.push({
    text: noteData.text,
    createdBy: user._id,
  });

  await lead.save();
  return lead;
};

export const deleteLead = async (id) => {
  const lead = await leadRepository.findById(id);
  if (!lead) {
    throw ApiError.notFound('Lead not found');
  }

  await leadRepository.deleteById(id);
};

export const bulkDelete = async (ids) => {
  return leadRepository.deleteMany(ids);
};

export const bulkUpdateStatus = async (ids, data, user) => {
  return leadRepository.updateMany(ids, {
    status: data.status,
    statusChangedAt: new Date(),
    statusChangedBy: user._id,
  });
};

export const importLeads = async (file, user) => {
  let workbook;
  try {
    workbook = XLSX.read(file.buffer, { type: 'buffer' });
  } catch {
    throw ApiError.badRequest('Could not read the file. Please upload a valid .xlsx, .xls or .csv file.');
  }

  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw ApiError.badRequest('The file has no data sheet.');

  const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
  if (rawRows.length === 0) throw ApiError.badRequest('The file has no data rows.');
  if (rawRows.length > MAX_IMPORT_ROWS) {
    throw ApiError.badRequest(`Too many rows (${rawRows.length}). Maximum is ${MAX_IMPORT_ROWS} leads per file.`);
  }

  const fileEmails = rawRows
    .map((r) => buildHeaderMap(r).email)
    .filter(Boolean)
    .map((e) => String(e).trim().toLowerCase());
  const existing = await leadRepository.findEmails(fileEmails);
  const existingEmails = new Set(existing.map((l) => l.email.toLowerCase()));

  const errors = [];
  const validLeads = [];
  const seenEmails = new Set();

  rawRows.forEach((rawRow, index) => {
    const row = buildHeaderMap(rawRow);
    const rowNumber = index + 2;
    const skip = (reason) => errors.push({ row: rowNumber, reason });

    if (Object.values(row).every((v) => String(v ?? '').trim() === '')) return;

    const name = String(row.name ?? '').trim();
    if (!name) return skip('Name is required');

    const email = String(row.email ?? '').trim().toLowerCase();
    if (!email) return skip('Email is required');
    if (!EMAIL_RE.test(email)) return skip('Invalid email address');
    if (seenEmails.has(email)) return skip('Duplicate email within the file');
    if (existingEmails.has(email)) return skip('Email already exists in the CRM');
    seenEmails.add(email);

    const phone = String(row.phone ?? '').trim();
    if (phone && !isValidPhone(phone)) return skip('Invalid phone number');

    const brand = normalizeEnum(row.brand, LEAD_BRANDS);
    if (brand === null) return skip(`Invalid brand. Allowed: ${LEAD_BRANDS.join(', ')}`);

    const source = normalizeEnum(row.source, LEAD_SOURCES);
    if (source === null) return skip(`Invalid source. Allowed: ${LEAD_SOURCES.join(', ')}`);

    const status = normalizeEnum(row.status, Object.values(LEAD_STATUS));
    if (status === null) return skip('Invalid status');

    const followUpDate = parseDate(row.followUpDate);
    if (followUpDate === null) return skip('Invalid follow up date. Use YYYY-MM-DD');

    const notes = String(row.notes ?? '').trim();
    if (notes.length > 2000) return skip('Notes must not exceed 2000 characters');

    validLeads.push({
      name,
      email,
      phone: phone || null,
      company: String(row.company ?? '').trim() || null,
      brand: brand || null,
      source: source || 'other',
      status: status || LEAD_STATUS.NEW,
      notes: notes ? [{ text: notes, createdBy: user._id }] : [],
      followUpDate: followUpDate || null,
      assignedTo: null,
      createdBy: user._id,
    });
  });

  let imported = 0;
  if (validLeads.length > 0) {
    const result = await leadRepository.insertMany(validLeads);
    imported = result.length;
  }

  return { imported, skipped: errors.length, errors };
};

export const getLeadStats = async () => {
  const statusCounts = await leadRepository.countByStatus();

  const stats = {
    total: 0,
    new: 0,
    contacted: 0,
    meeting_scheduled: 0,
    proposal_sent: 0,
    won: 0,
    lost: 0,
  };

  for (const item of statusCounts) {
    stats[item._id] = item.count;
    stats.total += item.count;
  }

  return stats;
};
