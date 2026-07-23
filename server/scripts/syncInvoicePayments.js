import '../src/config/index.js';
import mongoose from 'mongoose';
import connectDB from '../src/config/db.js';
import Invoice from '../src/modules/invoices/invoice.model.js';
import Payment from '../src/modules/payments/payment.model.js';
import { INVOICE_STATUS } from '../src/constants/index.js';

async function main() {
  await connectDB();

  const invoices = await Invoice.find({});
  let fixed = 0;

  for (const inv of invoices) {
    const payments = await Payment.find({ invoice: inv._id, status: 'completed' });
    if (payments.length === 0) continue;

    const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
    const capped = Math.min(totalPaid, inv.total);
    if (inv.paidAmount === capped) continue;

    const oldStatus = inv.status;
    inv.paidAmount = capped;

    if (totalPaid <= 0) {
      inv.status = inv.sentAt ? INVOICE_STATUS.SENT : INVOICE_STATUS.DRAFT;
      inv.paidAt = null;
    } else if (totalPaid >= inv.total) {
      inv.status = INVOICE_STATUS.PAID;
      inv.paidAt = inv.paidAt || new Date();
    } else {
      inv.status = INVOICE_STATUS.PARTIALLY_PAID;
      inv.paidAt = null;
    }

    inv.lastPaymentDate =
      payments.map((p) => p.paymentDate).filter(Boolean).sort((a, b) => b - a)[0] || null;

    await inv.save();
    console.log(`  ${inv.invoiceNumber}: paidAmount 0→${capped}, status ${oldStatus}→${inv.status}`);
    fixed++;
  }

  console.log(`\nDone. ${fixed} invoice(s) fixed.`);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
