import mongoose from 'mongoose';
import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { z } from 'zod';
import config from '../../config/index.js';
import ApiError from '../../utils/ApiError.js';
import { renderQuotationEmail } from '../../services/emailService.js';
import { readArtifact } from '../../services/quotationArtifacts.js';
import Quotation from './quotation.model.js';
import { getFamily, requireVersioned, conflict, parseRevisionInput } from './quotationRevision.service.js';
import { revisionStatusSchema } from './quotationRevision.validation.js';

const providerSend = async (message) => {
  const from = `"${config.smtp.fromName}" <${config.smtp.fromEmail}>`;
  if (config.smtp.user && config.smtp.pass) {
    const transport = nodemailer.createTransport({
      host: config.smtp.host, port: config.smtp.port, secure: config.smtp.secure,
      auth: { user: config.smtp.user, pass: config.smtp.pass },
      connectionTimeout: 15000, greetingTimeout: 15000, socketTimeout: 30000,
    });
    try {
      const result = await transport.sendMail({ ...message, from });
      if (!result.accepted?.some((address) => String(address).toLowerCase() === message.to.toLowerCase())) {
        throw new ApiError(502, 'Email provider did not accept recipient');
      }
      return { provider: 'smtp', providerId: result.messageId };
    } finally {
      transport.close();
    }
  }
  if (config.resend.apiKey) {
    const { data, error } = await new Resend(config.resend.apiKey).emails.send({
      ...message, from: `"${config.resend.fromName}" <${config.resend.fromEmail}>`,
      attachments: message.attachments.map((attachment) => ({ ...attachment, content: attachment.content.toString('base64') })),
    });
    if (error || !data?.id) throw new ApiError(502, 'Email provider did not accept message');
    return { provider: 'resend', providerId: data.id };
  }
  throw new ApiError(502, 'No email delivery provider is configured');
};

const revisionIn = (family, version) => {
  requireVersioned(family);
  if (family.archivedAt) throw conflict();
  const revision = family.revisions.find((item) => item.version === Number(version));
  if (!revision) throw ApiError.notFound('Saved quotation revision not found');
  return revision;
};

const applyLifecycle = async (revision, mutation) => {
  const { filter, update, root, options = {} } = mutation;
  const latest = await Quotation.findOneAndUpdate({ ...filter, latestVersion: revision.version }, {
    ...update, $set: { ...update.$set, ...root },
  }, { ...options, new: true }).lean();
  if (latest) return latest;
  const historical = await Quotation.findOneAndUpdate({ ...filter, latestVersion: { $ne: revision.version } }, update, {
    ...options, new: true,
  }).lean();
  if (!historical) throw conflict();
  return historical;
};

export const sendRevision = async (id, version, user, resend = false) => {
  const family = await getFamily(id);
  const revision = revisionIn(family, version);
  if (resend ? !revision.sentAt : revision.status !== 'draft') {
    throw ApiError.conflict(resend ? 'Only previously sent revisions can be resent' : 'Only draft revisions can be sent');
  }
  const to = revision.content.recipientEmail === undefined ? revision.content.client?.email : revision.content.recipientEmail;
  if (!z.string().email().safeParse(to).success) throw ApiError.badRequest('Frozen recipient email is invalid');
  const attemptId = new mongoose.Types.ObjectId();
  const attempt = { _id: attemptId, status: 'pending', kind: resend ? 'resend' : 'send', actor: user._id, createdAt: new Date(), recipient: to };
  const locked = await Quotation.findOneAndUpdate({
    _id: id, archivedAt: null, revisions: { $elemMatch: { _id: revision._id, status: revision.status, inFlightSend: null } },
  }, { $set: { 'revisions.$.inFlightSend': attemptId }, $push: { 'revisions.$.sendAttempts': attempt } });
  if (!locked) throw conflict();
  let receipt;
  try {
    const pdf = await readArtifact(revision.artifacts.pdf);
    receipt = await providerSend({
      to, subject: `Quotation ${family.quotationNumber} V${revision.version} from Rudhram Enterprises`,
      html: renderQuotationEmail({
        clientName: revision.content.recipientName || 'Client', quotationNumber: `${family.quotationNumber} V${revision.version}`,
        total: revision.content.total, validUntil: revision.content.validUntil,
      }),
      attachments: [{ filename: `${family.quotationNumber}-V${revision.version}.pdf`, content: pdf, contentType: 'application/pdf' }],
    });
  } catch (error) {
    if (!(error instanceof Error) && typeof error !== 'object') throw error;
    const errorMessage = error instanceof ApiError ? error.message : 'Email delivery failed; provider acceptance was not confirmed';
    await Quotation.updateOne({ _id: id }, { $set: {
      'revisions.$[revision].inFlightSend': null,
      'revisions.$[revision].sendAttempts.$[attempt].status': 'failed',
      'revisions.$[revision].sendAttempts.$[attempt].completedAt': new Date(),
      'revisions.$[revision].sendAttempts.$[attempt].error': errorMessage,
    } }, { arrayFilters: [{ 'revision._id': revision._id, 'revision.inFlightSend': attemptId }, { 'attempt._id': attemptId }] });
    throw new ApiError(502, errorMessage);
  }
  const now = new Date();
  const lifecycle = resend ? {} : { 'revisions.$[revision].status': 'sent', 'revisions.$[revision].sentAt': now };
  const quotation = await applyLifecycle(revision, { filter: { _id: id, 'revisions.inFlightSend': attemptId }, update: { $set: {
    ...lifecycle, 'revisions.$[revision].inFlightSend': null,
    'revisions.$[revision].sendAttempts.$[attempt].status': 'accepted',
    'revisions.$[revision].sendAttempts.$[attempt].completedAt': now,
    'revisions.$[revision].sendAttempts.$[attempt].provider': receipt.provider,
    'revisions.$[revision].sendAttempts.$[attempt].providerId': receipt.providerId,
  }, $push: { 'revisions.$[revision].statusEvents': { status: resend ? revision.status : 'sent', actor: user._id, createdAt: now, kind: attempt.kind } } }, options: {
    arrayFilters: [{ 'revision._id': revision._id, 'revision.inFlightSend': attemptId }, { 'attempt._id': attemptId }],
  }, root: resend ? {} : { status: 'sent', sentAt: now } });
  return quotation;
};

export const setRevisionStatus = async (id, version, input, user) => {
  const { status, expectedStatus } = parseRevisionInput(revisionStatusSchema, input);
  const family = await getFamily(id);
  const revision = revisionIn(family, version);
  if (revision.status !== expectedStatus) throw conflict();
  const transitions = { draft: ['accepted', 'rejected', 'expired'], sent: ['accepted', 'rejected', 'expired'], accepted: [], rejected: [], expired: [] };
  if (!transitions[expectedStatus].includes(status)) throw ApiError.badRequest('Invalid status transition; use the send endpoint for delivery');
  const now = new Date();
  const timeField = `${status}At`;
  return applyLifecycle(revision, { filter: {
    _id: id, archivedAt: null, revisions: { $elemMatch: { _id: revision._id, status: expectedStatus, inFlightSend: null } },
  }, update: { $set: { 'revisions.$.status': status, [`revisions.$.${timeField}`]: now },
    $push: { 'revisions.$.statusEvents': { status, actor: user._id, createdAt: now, kind: 'manual' } },
  }, root: { status, [timeField]: now } });
};
