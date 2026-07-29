import ApiError from '../../utils/ApiError.js';
import * as leadRepository from './lead.repository.js';
import * as clientRepository from '../clients/client.repository.js';
import * as notificationService from '../notifications/notification.service.js';

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

  if (data.assignedTo && String(data.assignedTo) !== String(user._id)) {
    const notif = notificationService.buildNotification('lead_created', {
      leadName: lead.name, source: lead.source || 'manual',
    });
    notificationService.createAndSend({
      recipient: data.assignedTo, referenceId: lead._id, referenceModel: 'Lead',
      actionBy: user._id, link: `/leads/${lead._id}`, ...notif,
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
    data.statusChangedAt = new Date();
    data.statusChangedBy = user._id;

    // If status is changed to 'won', auto-convert to client
    if (data.status === 'won') {
      data.convertedAt = new Date();

      if (!lead.convertedToClient) {
        const existingClient = await clientRepository.findByEmail(lead.email);
        if (!existingClient) {
          const client = await clientRepository.create({
            companyName: lead.company || `${lead.name}'s Company`,
            contactPerson: lead.name,
            email: lead.email,
            phone: lead.phone,
            convertedFrom: lead._id,
            status: 'active',
            createdBy: user._id,
          });
          data.convertedToClient = client._id;
        }
      }
    }
  }

  if (data.assignedTo && lead.assignedTo &&
      String(data.assignedTo) !== String(lead.assignedTo._id || lead.assignedTo) &&
      String(data.assignedTo) !== String(user._id)) {
    const notif = notificationService.buildNotification('lead_assigned', {
      leadName: lead.name, actorName: user.name,
    });
    notificationService.createAndSend({
      recipient: data.assignedTo, referenceId: lead._id, referenceModel: 'Lead',
      actionBy: user._id, link: `/leads/${lead._id}`,
      ...notif,
    }).catch(() => {});
  }

  if (data.followUpDate) {
    data.followUpDate = new Date(data.followUpDate);
  }

  const updated = await leadRepository.updateById(id, data);

  if (data.status === 'won' && lead.assignedTo && !lead.assignedTo.equals(user._id)) {
    const notif = notificationService.buildNotification('lead_converted', {
      leadName: lead.name,
    });
    notificationService.createAndSend({
      recipient: lead.assignedTo, referenceId: updated._id, referenceModel: 'Lead',
      actionBy: user._id, link: `/clients/${updated.convertedToClient}`, ...notif,
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
