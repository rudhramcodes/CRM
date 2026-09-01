import mongoose from 'mongoose';
import Lead from '../leads/lead.model.js';
import Client from '../clients/client.model.js';
import Invoice from '../invoices/invoice.model.js';
import Payment from '../payments/payment.model.js';
import Task from '../tasks/task.model.js';
import Meeting from '../meetings/meeting.model.js';
import Project from '../projects/project.model.js';

const ObjectId = (id) => new mongoose.Types.ObjectId(id);

// ── Helper: last N months label array ──
function lastNMonths(n = 12) {
  const months = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return months;
}

// ── Helper: fill missing months with zeros ──
function fillMonths(data, months, key = 'month') {
  const map = new Map(data.map((d) => [d[key], d]));
  return months.map((m) => map.get(m) || { [key]: m, count: 0, invoiced: 0, collected: 0, outstanding: 0 });
}

// ── MAIN OVERVIEW ──
export async function getOverview() {
  const months = lastNMonths(12);
  const monthStart = new Date(`${months[0]}-01`);
  const dateFilter = { $gte: monthStart };

  // KPIs — run in parallel
  const [
    totalLeads,
    activeClients,
    totalProjects,
    activeProjects,
    revenueAgg,
    pendingPayments,
    overdueInvoices,
    wonLeads,
  ] = await Promise.all([
    Lead.countDocuments({ isDeleted: false }),
    Client.countDocuments({ status: 'active' }),
    // eslint-disable-next-line no-undef
    Project.countDocuments(),
    // eslint-disable-next-line no-undef
    Project.countDocuments({ status: 'active' }),
    Invoice.aggregate([
      { $match: { status: { $ne: 'draft' }, issueDate: dateFilter } },
      { $group: { _id: null, totalRevenue: { $sum: '$paidAmount' }, totalOutstanding: { $sum: '$balanceDue' }, totalInvoiced: { $sum: '$total' } } },
    ]),
    Payment.countDocuments({ status: 'pending' }),
    Invoice.countDocuments({ status: 'overdue' }),
    Lead.countDocuments({ isDeleted: false, status: 'won' }),
  ]);

  const s = revenueAgg[0] || { totalRevenue: 0, totalOutstanding: 0, totalInvoiced: 0 };
  const conversionRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;
  const collectionRate = s.totalInvoiced > 0 ? Math.round((s.totalRevenue / s.totalInvoiced) * 100) : 0;

  // Revenue — monthly (parallel with rest)
  const [monthlyRevenue, byMethod, byStatus, bySource, byBrand, clientMonthly, invoiceAging, taskByStatus, taskTotal, taskDone] = await Promise.all([
    Invoice.aggregate([
      { $match: { status: { $ne: 'draft' }, issueDate: dateFilter } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$issueDate' } }, invoiced: { $sum: '$total' }, collected: { $sum: '$paidAmount' }, outstanding: { $sum: '$balanceDue' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, month: '$_id', invoiced: { $round: ['$invoiced', 2] }, collected: { $round: ['$collected', 2] }, outstanding: { $round: ['$outstanding', 2] }, count: 1 } },
    ]),
    Payment.aggregate([
      { $match: { status: 'completed', createdAt: dateFilter } },
      { $group: { _id: '$paymentMethod', amount: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { amount: -1 } },
      { $project: { _id: 0, method: '$_id', amount: { $round: ['$amount', 2] }, count: 1 } },
    ]),
    Lead.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $project: { _id: 0, status: '$_id', count: 1 } },
    ]),
    Lead.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: '$source', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $project: { _id: 0, source: '$_id', count: 1 } },
    ]),
    Client.aggregate([
      { $group: { _id: '$brand', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $project: { _id: 0, brand: '$_id', count: 1 } },
    ]),
    Client.aggregate([
      { $match: { createdAt: dateFilter } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, month: '$_id', count: 1 } },
    ]),
    (async () => {
      const now = new Date();
      const buckets = [
        { label: '0-30 days', min: 0, max: 30 },
        { label: '31-60 days', min: 31, max: 60 },
        { label: '61-90 days', min: 61, max: 90 },
        { label: '90+ days', min: 91, max: Infinity },
      ];
      const aging = [];
      for (const b of buckets) {
        const older = new Date(now.getTime() - b.max * 86400000);
        const newer = new Date(now.getTime() - b.min * 86400000);
        const dueFilter = b.max === Infinity ? { $lte: newer } : { $lte: newer, $gte: older };
        const r = await Invoice.aggregate([
          { $match: { status: { $in: ['sent', 'overdue', 'partially_paid'] }, dueDate: dueFilter } },
          { $group: { _id: null, count: { $sum: 1 }, amount: { $sum: '$balanceDue' } } },
        ]);
        aging.push({ label: b.label, count: r[0]?.count || 0, amount: Math.round((r[0]?.amount || 0) * 100) / 100 });
      }
      return aging;
    })(),
    Task.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $project: { _id: 0, status: '$_id', count: 1 } },
    ]),
    Task.countDocuments(),
    Task.countDocuments({ status: 'done' }),
  ]);

  // Recent activity (last 10 across modules)
  const [recentLeads, recentClients, recentPayments, recentMeetings] = await Promise.all([
    Lead.find({ isDeleted: false }).sort({ createdAt: -1 }).limit(5).select('name company status createdAt createdBy').populate('createdBy', 'name'),
    Client.find().sort({ createdAt: -1 }).limit(5).select('companyName contactPerson brand createdAt').populate('createdBy', 'name'),
    Payment.find({ status: 'completed' }).sort({ createdAt: -1 }).limit(5).select('amount paymentMethod createdAt').populate('createdBy', 'name'),
    Meeting.find().sort({ createdAt: -1 }).limit(5).select('title date startTime status createdAt').populate('createdBy', 'name'),
  ]);

  const activity = [
    ...recentLeads.map((l) => ({ type: 'lead', title: `New lead: ${l.name}`, description: `${l.company || 'Unknown'} — ${l.status}`, timestamp: l.createdAt, user: l.createdBy?.name })),
    ...recentClients.map((c) => ({ type: 'client', title: `Client onboarded: ${c.companyName}`, description: `Brand: ${c.brand}`, timestamp: c.createdAt, user: c.createdBy?.name })),
    ...recentPayments.map((p) => ({ type: 'payment', title: `Payment received`, description: `₹${p.amount.toLocaleString('en-IN')} via ${p.paymentMethod}`, timestamp: p.createdAt, user: p.createdBy?.name })),
    ...recentMeetings.map((m) => ({ type: 'meeting', title: `Meeting: ${m.title}`, description: `${m.date} at ${m.startTime} — ${m.status}`, timestamp: m.createdAt, user: m.createdBy?.name })),
  ]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 10);

  return {
    kpis: {
      totalLeads,
      activeClients,
      totalRevenue: s.totalRevenue,
      pendingPayments,
      overdueInvoices,
      conversionRate,
      totalProjects,
      activeProjects,
      collectionRate,
    },
    revenue: {
      monthly: fillMonths(monthlyRevenue, months),
      byMethod,
      summary: { totalRevenue: s.totalRevenue, totalOutstanding: s.totalOutstanding, totalInvoiced: s.totalInvoiced, collectionRate },
    },
    pipeline: { byStatus, bySource },
    clients: { byBrand, monthly: fillMonths(clientMonthly, months) },
    invoices: {
      aging: invoiceAging,
      summary: {
        totalInvoices: overdueInvoices + (await Invoice.countDocuments({ status: { $in: ['paid', 'sent', 'partially_paid', 'draft'] } })),
        paidInvoices: await Invoice.countDocuments({ status: 'paid' }),
        overdueCount: overdueInvoices,
      },
    },
    tasks: {
      byStatus: taskByStatus,
      total: taskTotal,
      done: taskDone,
      completionRate: taskTotal > 0 ? Math.round((taskDone / taskTotal) * 100) : 0,
    },
    recentActivity: activity,
  };
}

// ── EMPLOYEE DASHBOARD ──
export async function getEmployeeDashboard(userId) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [tasksByStatus, totalTasks, doneTasks, upcomingMeetings, recentTasks, recentLeads] = await Promise.all([
    Task.aggregate([
      { $match: { assignedTo: ObjectId(userId) } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $project: { _id: 0, status: '$_id', count: 1 } },
    ]),
    Task.countDocuments({ assignedTo: ObjectId(userId) }),
    Task.countDocuments({ assignedTo: ObjectId(userId), status: 'done' }),
    Meeting.find({
      attendees: ObjectId(userId),
      date: { $gte: todayStart },
      status: 'scheduled',
    })
      .sort({ date: 1, startTime: 1 })
      .limit(5)
      .select('title date startTime endTime status lead client location meetingLink')
      .populate('lead', 'name company')
      .populate('client', 'companyName contactPerson')
      .lean(),
    Task.find({ assignedTo: ObjectId(userId) })
      .sort({ updatedAt: -1 })
      .limit(5)
      .select('title status priority project dueDate updatedAt')
      .populate('project', 'name')
      .lean(),
    Lead.find({ assignedTo: ObjectId(userId), isDeleted: false })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name company status source createdAt')
      .lean(),
  ]);

  const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const activity = [
    ...recentTasks.map((t) => ({
      type: 'task',
      title: t.title,
      description: `${t.status.replace(/_/g, ' ')} — ${t.project?.name || 'No project'}`,
      timestamp: t.updatedAt,
      priority: t.priority,
    })),
    ...recentLeads.map((l) => ({
      type: 'lead',
      title: l.name,
      description: `${l.company || 'Unknown'} — ${l.status}`,
      timestamp: l.createdAt,
      source: l.source,
    })),
  ]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 10);

  return {
    tasks: {
      byStatus: tasksByStatus,
      total: totalTasks,
      done: doneTasks,
      completionRate,
    },
    meetings: upcomingMeetings,
    activity,
  };
}

// ── VENTURE DASHBOARD ──
export async function getVentureDashboard(brand) {
  const months = lastNMonths(12);
  const monthStart = new Date(`${months[0]}-01`);
  const dateFilter = { $gte: monthStart };

  const brandLeadMatch = { isDeleted: false, brand };
  const brandClientMatch = { brand };

  // Get client IDs for this brand to filter invoices/payments
  const brandClientIds = (await Client.find(brandClientMatch).select('_id').lean()).map((c) => c._id);

  const [
    totalLeads,
    activeClients,
    wonLeads,
    byStatus,
    bySource,
    clientMonthly,
    revenueMonthly,
    aging,
    brandTasks,
    comparisonData,
  ] = await Promise.all([
    Lead.countDocuments(brandLeadMatch),
    Client.countDocuments({ ...brandClientMatch, status: 'active' }),
    Lead.countDocuments({ ...brandLeadMatch, status: 'won' }),
    Lead.aggregate([
      { $match: brandLeadMatch },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $project: { _id: 0, status: '$_id', count: 1 } },
    ]),
    Lead.aggregate([
      { $match: brandLeadMatch },
      { $group: { _id: '$source', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $project: { _id: 0, source: '$_id', count: 1 } },
    ]),
    Client.aggregate([
      { $match: { ...brandClientMatch, createdAt: dateFilter } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, month: '$_id', count: 1 } },
    ]),
    brandClientIds.length > 0
      ? Invoice.aggregate([
          { $match: { client: { $in: brandClientIds }, status: { $ne: 'draft' }, issueDate: dateFilter } },
          { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$issueDate' } }, invoiced: { $sum: '$total' }, collected: { $sum: '$paidAmount' }, outstanding: { $sum: '$balanceDue' }, count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
          { $project: { _id: 0, month: '$_id', invoiced: { $round: ['$invoiced', 2] }, collected: { $round: ['$collected', 2] }, outstanding: { $round: ['$outstanding', 2] }, count: 1 } },
        ])
      : [],
    (async () => {
      if (brandClientIds.length === 0) return [];
      const now = new Date();
      const buckets = [
        { label: '0-30 days', min: 0, max: 30 },
        { label: '31-60 days', min: 31, max: 60 },
        { label: '61-90 days', min: 61, max: 90 },
        { label: '90+ days', min: 91, max: Infinity },
      ];
      const result = [];
      for (const b of buckets) {
        const older = new Date(now.getTime() - b.max * 86400000);
        const newer = new Date(now.getTime() - b.min * 86400000);
        const dueFilter = b.max === Infinity ? { $lte: newer } : { $lte: newer, $gte: older };
        const r = await Invoice.aggregate([
          { $match: { client: { $in: brandClientIds }, status: { $in: ['sent', 'overdue', 'partially_paid'] }, dueDate: dueFilter } },
          { $group: { _id: null, count: { $sum: 1 }, amount: { $sum: '$balanceDue' } } },
        ]);
        result.push({ label: b.label, count: r[0]?.count || 0, amount: Math.round((r[0]?.amount || 0) * 100) / 100 });
      }
      return result;
    })(),
    // Tasks filtered by brand through Project → Client chain
    brandClientIds.length > 0
      ? (async () => {
          const brandProjectIds = (await Project.find({ client: { $in: brandClientIds } }).select('_id').lean()).map((p) => p._id);
          if (brandProjectIds.length === 0) return { byStatus: [], total: 0, done: 0 };
          const [byStatus, total, done] = await Promise.all([
            Task.aggregate([
              { $match: { project: { $in: brandProjectIds } } },
              { $group: { _id: '$status', count: { $sum: 1 } } },
              { $project: { _id: 0, status: '$_id', count: 1 } },
            ]),
            Task.countDocuments({ project: { $in: brandProjectIds } }),
            Task.countDocuments({ project: { $in: brandProjectIds }, status: 'done' }),
          ]);
          return { byStatus, total, done };
        })()
      : { byStatus: [], total: 0, done: 0 },
    // Comparison: leads + clients per brand
    Lead.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: '$brand', leads: { $sum: 1 }, won: { $sum: { $cond: [{ $eq: ['$status', 'won'] }, 1, 0] } } } },
      { $project: { _id: 0, brand: '$_id', leads: 1, won: 1 } },
      { $sort: { leads: -1 } },
    ]),
  ]);

  const conversionRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;

  // Revenue summary for this brand
  let totalRevenue = 0;
  let totalOutstanding = 0;
  if (brandClientIds.length > 0) {
    const revAgg = await Invoice.aggregate([
      { $match: { client: { $in: brandClientIds }, status: { $ne: 'draft' } } },
      { $group: { _id: null, totalRevenue: { $sum: '$paidAmount' }, totalOutstanding: { $sum: '$balanceDue' } } },
    ]);
    totalRevenue = revAgg[0]?.totalRevenue || 0;
    totalOutstanding = revAgg[0]?.totalOutstanding || 0;
  }

  // Top clients for this brand
  const topClients = await Client.find(brandClientMatch)
    .select('clientId companyName contactPerson email status')
    .limit(10)
    .lean();

  return {
    brand,
    kpis: {
      totalLeads,
      activeClients,
      wonLeads,
      conversionRate,
      totalRevenue,
      totalOutstanding,
    },
    pipeline: { byStatus, bySource },
    revenue: {
      monthly: fillMonths(revenueMonthly, months),
      summary: { totalRevenue, totalOutstanding },
    },
    clients: {
      monthly: fillMonths(clientMonthly, months),
      topClients,
    },
    invoices: { aging },
    tasks: {
      byStatus: brandTasks.byStatus,
      total: brandTasks.total,
      done: brandTasks.done,
      completionRate: brandTasks.total > 0 ? Math.round((brandTasks.done / brandTasks.total) * 100) : 0,
    },
    comparison: comparisonData,
  };
}
