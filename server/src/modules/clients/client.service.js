import ApiError from '../../utils/ApiError.js';
import * as clientRepository from './client.repository.js';
import * as leadRepository from '../leads/lead.repository.js';

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

  const payload = {
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

  return clientRepository.create(payload);
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

  const client = await clientRepository.create({
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
  const statusCounts = await clientRepository.countByStatus();
  const total = await clientRepository.countAll();

  const stats = { total, active: 0, inactive: 0 };
  statusCounts.forEach(({ _id, count }) => {
    stats[_id] = count;
  });

  return stats;
};
