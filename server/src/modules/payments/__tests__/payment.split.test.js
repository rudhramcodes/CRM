import { describe, expect, it } from 'vitest';
import { createSplitPaymentSchema } from '../payment.validation.js';
import { splitTotal } from '../payment.split.js';

const invoice = '507f1f77bcf86cd799439011';

describe('split payment', () => {
  it('accepts one bank and one cash part on the same invoice', () => {
    const result = createSplitPaymentSchema.safeParse({
      invoice,
      payments: [
        { amount: 5000, paymentMethod: 'bank_transfer', referenceNo: 'UTR123' },
        { amount: 2500, paymentMethod: 'cash' },
      ],
    });

    expect(result.success).toBe(true);
  });

  it('rejects duplicate methods', () => {
    const result = createSplitPaymentSchema.safeParse({
      invoice,
      payments: [
        { amount: 5000, paymentMethod: 'cash' },
        { amount: 2500, paymentMethod: 'cash' },
      ],
    });

    expect(result.success).toBe(false);
  });

  it('sums paise correctly', () => {
    expect(splitTotal([{ amount: 0.1 }, { amount: 0.2 }])).toBe(0.3);
  });
});
