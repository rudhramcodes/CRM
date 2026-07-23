import Lead from '../leads/lead.model.js';
import Client from '../clients/client.model.js';
import Invoice from '../invoices/invoice.model.js';
import Payment from '../payments/payment.model.js';
import Task from '../tasks/task.model.js';

const buildDateFilter = (from, to) => {
  const filter = {};
  if (from) filter.$gte = new Date(from);
  if (to) filter.$lte = new Date(to);
  return Object.keys(filter).length ? filter : undefined;
};

// ── Revenue Report ──
export const getRevenueReport = async (from, to) => {
  const dateFilter = buildDateFilter(from, to);
  const matchStage = dateFilter ? { createdAt: dateFilter } : {};

  // Monthly revenue breakdown
  const monthlyRevenue = await Invoice.aggregate([
    { $match: { ...matchStage, status: { $ne: 'draft' } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$issueDate' } },
        invoiced: { $sum: '$total' },
        collected: { $sum: '$paidAmount' },
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
        outstanding: { $round: ['$outstanding', 2] },
        count: 1,
      },
    },
  ]);

  // Revenue by payment method
  const byMethod = await Payment.aggregate([
    { $match: { ...matchStage, status: 'completed' } },
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

  // Summary
  const summary = await Invoice.aggregate([
    { $match: { status: { $in: ['paid', 'sent', 'overdue', 'partially_paid'] } } },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$paidAmount' },
        totalOutstanding: { $sum: '$balanceDue' },
        totalInvoiced: { $sum: '$total' },
      },
    },
  ]);

  const s = summary[0] || { totalRevenue: 0, totalOutstanding: 0, totalInvoiced: 0 };
  const collectionRate = s.totalInvoiced > 0
    ? Math.round((s.totalRevenue / s.totalInvoiced) * 100)
    : 0;

  return {
    summary: { ...s, collectionRate },
    charts: { monthlyRevenue, byMethod },
  };
};

// ── Pipeline Report ──
export const getPipelineReport = async (from, to) => {
  const dateFilter = buildDateFilter(from, to);
  const matchStage = dateFilter ? { createdAt: dateFilter } : {};

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

  // Avg conversion time (days from createdAt to convertedAt for converted leads)
  const convTime = await Lead.aggregate([
    { $match: { ...matchStage, convertedToClient: { $ne: null } } },
    {
      $project: {
        days: {
          $divide: [{ $subtract: ['$updatedAt', '$createdAt'] }, 1000 * 60 * 60 * 24],
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
  const matchStage = dateFilter ? { createdAt: dateFilter } : {};

  // By status
  const byStatus = await Client.aggregate([
    { $match: matchStage },
    { $group: { _id: '$status', count: { $sum: 1 } } },
    { $project: { _id: 0, status: '$_id', count: 1 } },
  ]);

  // By brand
  const byBrand = await Client.aggregate([
    { $match: matchStage },
    { $group: { _id: '$brand', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $project: { _id: 0, brand: '$_id', count: 1 } },
  ]);

  // Monthly new clients
  const monthly = await Client.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, month: '$_id', count: 1 } },
  ]);

  const total = await Client.countDocuments(matchStage);
  const converted = await Client.countDocuments({ ...matchStage, convertedFrom: { $ne: null } });

  return {
    summary: { total, active: byStatus.find(s => s.status === 'active')?.count || 0, converted },
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

  // Aging buckets (for unpaid invoices)
  const now = new Date();
  const agingBuckets = [
    { label: '0-30 days', min: 0, max: 30 },
    { label: '31-60 days', min: 31, max: 60 },
    { label: '61-90 days', min: 61, max: 90 },
    { label: '90+ days', min: 91, max: Infinity },
  ];

  const aging = [];
  for (const bucket of agingBuckets) {
    const daysAgoMin = new Date(now.getTime() - bucket.max * 24 * 60 * 60 * 1000);
    const daysAgoMax = new Date(now.getTime() - bucket.min * 24 * 60 * 60 * 1000);
    const result = await Invoice.aggregate([
      {
        $match: {
          ...matchStage,
          status: { $in: ['sent', 'overdue', 'partially_paid'] },
          dueDate: { $lte: daysAgoMax, $gte: bucket.max === Infinity ? new Date(0) : daysAgoMin },
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
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$issueDate' } },
        total: { $sum: '$total' },
        paid: { $sum: '$paidAmount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, month: '$_id', total: { $round: ['$total', 2] }, paid: { $round: ['$paid', 2] }, count: 1 } },
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
