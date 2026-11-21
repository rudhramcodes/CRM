import Lead from '../leads/lead.model.js';
import Client from '../clients/client.model.js';
import Invoice from '../invoices/invoice.model.js';
import { invoiceCollectionStages } from '../payments/payment.collections.js';
import Payment from '../payments/payment.model.js';
import Task from '../tasks/task.model.js';
import { AGING_BUCKETS, agingDueFilter, buildDateFilter, monthKey } from './reports.dates.js';

// ── Revenue Report ──
export const getRevenueReport = async (from, to) => {
  const dateFilter = buildDateFilter(from, to);
  const matchStage = dateFilter ? { issueDate: dateFilter } : {};

  // Monthly revenue breakdown
  const monthlyRevenue = await Invoice.aggregate([
    { $match: { ...matchStage, status: { $ne: 'draft' } } },
    ...invoiceCollectionStages(),
    {
      $group: {
        _id: monthKey('$issueDate'),
        invoiced: { $sum: '$total' },
        collected: { $sum: '$nonCashCollected' },
        cashCollected: { $sum: '$cashCollected' },
        outstanding: { $sum: '$balanceDue' },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        _id: 0,
        month: '$_id',
        invoiced: { $round: ['$invoiced', 2] },
        collected: { $round: ['$collected', 2] },
        cashCollected: { $round: ['$cashCollected', 2] },
        outstanding: { $round: ['$outstanding', 2] },
        count: 1,
      },
    },
  ]);

  // Revenue by payment method
  const byMethod = await Payment.aggregate([
    { $match: { status: 'completed', ...(dateFilter ? { paymentDate: dateFilter } : {}) } },
    {
      $group: {
        _id: '$paymentMethod',
        amount: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { amount: -1 } },
    { $project: { _id: 0, method: '$_id', amount: { $round: ['$amount', 2] }, count: 1 } },
  ]);

  // Summary (with date filter applied)
  const summary = await Invoice.aggregate([
    { $match: { ...matchStage, status: { $in: ['paid', 'sent', 'overdue', 'partially_paid'] } } },
    ...invoiceCollectionStages(),
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$nonCashCollected' },
        cashCollected: { $sum: '$cashCollected' },
        totalOutstanding: { $sum: '$balanceDue' },
        totalInvoiced: { $sum: '$total' },
      },
    },
  ]);

  // Same keys whether or not any invoice matched (the empty case used to drop cashCollected).
  const { _id, ...s } = summary[0] || { totalRevenue: 0, cashCollected: 0, totalOutstanding: 0, totalInvoiced: 0 };
  const collectionRate = s.totalInvoiced > 0
    ? Math.round((s.totalRevenue / s.totalInvoiced) * 100)
    : 0;

  return {
    summary: { ...s, collectionRate },
    charts: { monthlyRevenue, byMethod: byMethod.filter((item) => item.method !== 'cash'), cashByMethod: byMethod.filter((item) => item.method === 'cash') },
  };
};

// ── Pipeline Report ──
export const getPipelineReport = async (from, to) => {
  const dateFilter = buildDateFilter(from, to);
  const matchStage = { isDeleted: false, ...(dateFilter ? { createdAt: dateFilter } : {}) };

  // Leads by status
  const byStatus = await Lead.aggregate([
    { $match: matchStage },
    { $group: { _id: '$status', count: { $sum: 1 } } },
    { $project: { _id: 0, status: '$_id', count: 1 } },
  ]);

  // Leads by source
  const bySource = await Lead.aggregate([
    { $match: matchStage },
    { $group: { _id: '$source', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $project: { _id: 0, source: '$_id', count: 1 } },
  ]);

  // Conversion metrics
  const totalLeads = await Lead.countDocuments(matchStage);
  const wonLeads = await Lead.countDocuments({ ...matchStage, status: 'won' });
  const lostLeads = await Lead.countDocuments({ ...matchStage, status: 'lost' });
  const conversionRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;

  // Avg conversion time: days from createdAt to convertedAt. Older converted leads without convertedAt fall back
  // to updatedAt (the previous behaviour), which any later edit pushes out.
  const convTime = await Lead.aggregate([
    { $match: { ...matchStage, convertedToClient: { $ne: null } } },
    {
      $project: {
        days: {
          $divide: [{ $subtract: [{ $ifNull: ['$convertedAt', '$updatedAt'] }, '$createdAt'] }, 1000 * 60 * 60 * 24],
        },
      },
    },
    { $group: { _id: null, avgDays: { $avg: '$days' } } },
  ]);
  const avgConversionDays = convTime[0] ? Math.round(convTime[0].avgDays) : 0;

  return {
    summary: { totalLeads, wonLeads, lostLeads, conversionRate, avgConversionDays },
    charts: { byStatus, bySource },
  };
};

// ── Client Report ──
export const getClientReport = async (from, to) => {
  const dateFilter = buildDateFilter(from, to);

  // By status - NO date filter (shows all-time distribution for pie chart)
  const byStatus = await Client.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
    { $project: { _id: 0, status: '$_id', count: 1 } },
  ]);

  // By brand - NO date filter (shows all-time distribution)
  const byBrand = await Client.aggregate([
    { $group: { _id: '$brand', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $project: { _id: 0, brand: '$_id', count: 1 } },
  ]);

  // Monthly new clients - WITH date filter (shows trend over time)
  const matchStage = dateFilter ? { createdAt: dateFilter } : {};
  const monthly = await Client.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: monthKey('$createdAt'),
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, month: '$_id', count: 1 } },
  ]);

  // Total counts
  const total = await Client.countDocuments();
  const active = await Client.countDocuments({ status: 'active' });
  const converted = await Client.countDocuments({ convertedFrom: { $ne: null } });

  return {
    summary: { total, active, converted },
    charts: { byStatus, byBrand, monthly },
  };
};

// ── Invoice Report ──
export const getInvoiceReport = async (from, to) => {
  const dateFilter = buildDateFilter(from, to);
  const matchStage = dateFilter ? { issueDate: dateFilter } : {};

  // By status
  const byStatus = await Invoice.aggregate([
    { $match: matchStage },
    { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$total' } } },
    { $project: { _id: 0, status: '$_id', count: 1, total: { $round: ['$total', 2] } } },
  ]);

  // Aging: every invoice still unpaid today, by days past its due date. Not limited to the report period,
  // so "This Month" no longer hides older unpaid debt.
  const now = new Date();
  const aging = [];
  for (const bucket of AGING_BUCKETS) {
    const result = await Invoice.aggregate([
      {
        $match: {
          status: { $in: ['sent', 'overdue', 'partially_paid'] },
          dueDate: agingDueFilter(bucket, now),
        },
      },
      { $group: { _id: null, count: { $sum: 1 }, amount: { $sum: '$balanceDue' } } },
    ]);
    aging.push({
      label: bucket.label,
      count: result[0]?.count || 0,
      amount: Math.round((result[0]?.amount || 0) * 100) / 100,
    });
  }

  // Monthly invoice trends
  const monthly = await Invoice.aggregate([
    { $match: matchStage },
    ...invoiceCollectionStages(),
    {
      $group: {
        _id: monthKey('$issueDate'),
        total: { $sum: '$total' },
        paid: { $sum: '$nonCashCollected' },
        cashCollected: { $sum: '$cashCollected' },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, month: '$_id', total: { $round: ['$total', 2] }, paid: { $round: ['$paid', 2] }, cashCollected: { $round: ['$cashCollected', 2] }, count: 1 } },
  ]);

  const totalInvoices = await Invoice.countDocuments(matchStage);
  const paidInvoices = await Invoice.countDocuments({ ...matchStage, status: 'paid' });
  const overdueCount = await Invoice.countDocuments({ ...matchStage, status: 'overdue' });
  const avgValue = totalInvoices > 0
    ? (await Invoice.aggregate([
      { $match: matchStage },
      { $group: { _id: null, avg: { $avg: '$total' } } },
    ]))[0]?.avg || 0
    : 0;

  return {
    summary: { totalInvoices, paidInvoices, overdueCount, avgValue: Math.round(avgValue * 100) / 100 },
    charts: { byStatus, aging, monthly },
  };
};

// ── Productivity Report ──
export const getProductivityReport = async (from, to) => {
  const dateFilter = buildDateFilter(from, to);
  const matchStage = dateFilter ? { createdAt: dateFilter } : {};

  // By status
  const byStatus = await Task.aggregate([
    { $match: matchStage },
    { $group: { _id: '$status', count: { $sum: 1 } } },
    { $project: { _id: 0, status: '$_id', count: 1 } },
  ]);

  // By priority
  const byPriority = await Task.aggregate([
    { $match: matchStage },
    { $group: { _id: '$priority', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $project: { _id: 0, priority: '$_id', count: 1 } },
  ]);

  // By assignee
  const byAssignee = await Task.aggregate([
    { $match: matchStage },
    { $group: { _id: '$assignedTo', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    {
      $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' },
    },
    { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        name: { $ifNull: ['$user.name', 'Unassigned'] },
        count: 1,
      },
    },
  ]);

  const total = await Task.countDocuments(matchStage);
  const done = await Task.countDocuments({ ...matchStage, status: 'done' });
  const overdue = await Task.countDocuments({
    ...matchStage,
    dueDate: { $lt: new Date() },
    status: { $ne: 'done' },
  });
  const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;

  return {
    summary: { total, done, overdue, completionRate },
    charts: { byStatus, byPriority, byAssignee },
  };
};
