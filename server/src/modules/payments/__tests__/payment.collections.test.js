import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import '../../auth/auth.model.js';
import Client from '../../clients/client.model.js';
import Invoice from '../../invoices/invoice.model.js';
import Payment from '../payment.model.js';
import { getStats, getTotalByInvoice } from '../payment.repository.js';
import { getRevenueByBrand, getRevenueStats } from '../../invoices/invoice.repository.js';
import { getRevenueReport, getInvoiceReport } from '../../reports/reports.service.js';
import { getOverview, getVentureDashboard } from '../../dashboard/dashboard.service.js';

// Opt in with a local MongoDB URI; every run owns a separate disposable database.
const mongoUri = process.env.CASH_TOTALS_TEST_URI;
describe.skipIf(!mongoUri)('collection totals excluding cash', () => {
  const clientId = new mongoose.Types.ObjectId();
  const bankInvoice = new mongoose.Types.ObjectId();
  const cashInvoice = new mongoose.Types.ObjectId();
  const now = new Date();
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 15, 12));
  const month = date.toISOString().slice(0, 7);

  beforeAll(async () => {
    await mongoose.connect(mongoUri, { dbName: `crm_cash_test_${randomUUID().replaceAll('-', '')}`, serverSelectionTimeoutMS: 3000 });
  });

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    await Promise.all([Client.deleteMany({}), Invoice.deleteMany({}), Payment.deleteMany({})]);
    await Client.collection.insertOne({ _id: clientId, companyName: 'Collection test', brand: 'aghori', status: 'active', createdAt: date });
    await Invoice.collection.insertMany([
      { _id: bankInvoice, invoiceNumber: 'TEST-BANK', client: clientId, status: 'partially_paid', total: 767000, paidAmount: 10000, balanceDue: 757000, issueDate: date, dueDate: date },
      { _id: cashInvoice, invoiceNumber: 'TEST-CASH', client: clientId, status: 'paid', total: 37760, paidAmount: 37760, balanceDue: 0, issueDate: date, dueDate: date },
    ]);
    await Payment.collection.insertMany([
      { invoice: bankInvoice, client: clientId, amount: 10000, paymentMethod: 'upi', status: 'completed', paymentDate: date, createdAt: date },
      { invoice: cashInvoice, client: clientId, amount: 37760, paymentMethod: 'cash', status: 'completed', paymentDate: date, createdAt: date },
      { invoice: bankInvoice, client: clientId, amount: 900, paymentMethod: 'cash', status: 'pending', paymentDate: date, createdAt: date },
      { invoice: bankInvoice, client: clientId, amount: 500, paymentMethod: 'bank_transfer', status: 'failed', paymentDate: date, createdAt: date },
    ]);
  });

  it('excludes cash from collection and venture totals while retaining the cash breakdown', async () => {
    const stats = await getStats();
    expect(stats.totalCollected).toBe(10000);
    expect(stats.byBrand).toEqual([{ brand: 'aghori', total: 10000, count: 1 }]);
    expect(stats.byMethod.find((item) => item._id === 'cash').total).toBe(37760);
    expect(stats.pendingAmount).toBe(757000);
  });

  it('counts cash toward invoice settlement', async () => {
    const paid = await getTotalByInvoice(cashInvoice);
    expect(paid).toBe(37760);
    expect(await Invoice.findById(cashInvoice).lean()).toMatchObject({ paidAmount: 37760, balanceDue: 0, status: 'paid' });
  });

  it('excludes cash from invoice revenue statistics without reducing gross invoiced value', async () => {
    const stats = await getRevenueStats();
    expect(stats).toMatchObject({ totalPaid: 10000, totalRevenue: 10000, totalInvoiced: 804760, cashCollected: 37760, totalPending: 757000 });
    expect(await getRevenueByBrand()).toEqual([expect.objectContaining({ _id: 'aghori', totalPaid: 10000, totalPending: 757000 })]);
  });

  it('excludes cash from dated revenue reports and their method chart', async () => {
    const report = await getRevenueReport(`${month}-01`, date.toISOString().slice(0, 10));
    expect(report.summary).toMatchObject({ totalRevenue: 10000, totalOutstanding: 757000, totalInvoiced: 804760 });
    expect(report.charts.monthlyRevenue).toEqual([expect.objectContaining({ month, collected: 10000 })]);
    expect(report.charts.byMethod).toEqual([{ method: 'upi', amount: 10000, count: 1 }]);
  });

  it('excludes cash from invoice report collection trends while retaining paid invoice counts', async () => {
    const report = await getInvoiceReport();
    expect(report.charts.monthly).toEqual([expect.objectContaining({ month, paid: 10000, total: 804760 })]);
    expect(report.summary.paidInvoices).toBe(1);
  });

  it('excludes cash from overview KPIs, monthly charts and payment method totals', async () => {
    const overview = await getOverview();
    expect(overview.kpis.totalRevenue).toBe(10000);
    expect(overview.kpis.cashCollected).toBe(37760);
    expect(overview.revenue.monthly.find((item) => item.month === month).collected).toBe(10000);
    expect(overview.revenue.byMethod).toEqual([{ method: 'upi', amount: 10000, count: 1 }]);
  });

  it('excludes cash from venture dashboard KPIs and monthly charts', async () => {
    const dashboard = await getVentureDashboard('aghori');
    expect(dashboard.kpis).toMatchObject({ totalRevenue: 10000, cashCollected: 37760, totalOutstanding: 757000 });
    expect(dashboard.revenue.monthly.find((item) => item.month === month).collected).toBe(10000);
    expect((await getVentureDashboard('panigrahna')).kpis.totalRevenue).toBe(0);
  });

  it('counts only the bank portion of a split payment', async () => {
    await Payment.updateOne({ invoice: cashInvoice, status: 'completed' }, { $set: { amount: 30000 } });
    await Payment.collection.insertOne({ invoice: cashInvoice, client: clientId, amount: 7760, paymentMethod: 'bank_transfer', status: 'completed', paymentDate: date });
    expect((await getRevenueStats()).totalPaid).toBe(17760);
    expect((await getStats()).totalCollected).toBe(17760);
    expect(await getTotalByInvoice(cashInvoice)).toBe(37760);
  });

  it('does not turn stale invoice paid amounts into revenue', async () => {
    await Invoice.updateOne({ _id: bankInvoice }, { $set: { paidAmount: 280000 } });
    expect((await getOverview()).kpis.totalRevenue).toBe(10000);
    expect((await getVentureDashboard('aghori')).kpis.totalRevenue).toBe(10000);
    expect((await getRevenueStats()).totalRevenue).toBe(10000);
    const report = await getRevenueReport();
    expect(report.summary).toMatchObject({ totalRevenue: 10000, cashCollected: 37760 });
    expect(report.charts.cashByMethod).toEqual([{ method: 'cash', amount: 37760, count: 1 }]);
    expect(report.charts.monthlyRevenue[0].cashCollected).toBe(37760);
  });

  it('updates reporting totals when a payment method changes without changing settlement', async () => {
    await Payment.updateOne({ invoice: cashInvoice, status: 'completed' }, { $set: { paymentMethod: 'bank_transfer' } });
    expect((await getRevenueStats()).totalPaid).toBe(47760);
    expect((await getStats()).totalCollected).toBe(47760);
    expect(await getTotalByInvoice(cashInvoice)).toBe(37760);
  });

  it('returns zero collection for cash-only payments and empty reporting periods', async () => {
    await Payment.deleteMany({ invoice: bankInvoice });
    await Invoice.deleteOne({ _id: bankInvoice });
    expect((await getStats()).totalCollected).toBe(0);
    expect((await getRevenueStats()).totalPaid).toBe(0);
    expect((await getRevenueReport('2000-01-01', '2000-01-31')).summary.totalRevenue).toBe(0);
  });

  it('keeps paise precision when subtracting a cash portion', async () => {
    await Invoice.updateOne({ _id: cashInvoice }, { $set: { paidAmount: 3.3 } });
    await Payment.updateOne({ invoice: cashInvoice, status: 'completed' }, { $set: { amount: 1.1 } });
    await Payment.collection.insertOne({ invoice: cashInvoice, client: clientId, amount: 2.2, paymentMethod: 'upi', status: 'completed', paymentDate: date });
    expect((await getRevenueStats()).totalPaid).toBe(10002.2);
    expect((await getStats()).totalCollected).toBe(10002.2);
  });
});
