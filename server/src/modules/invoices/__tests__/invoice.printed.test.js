import { describe, it, expect } from 'vitest';
import { generateInvoiceHtml } from '../../../services/pdfService.js';
import { createInvoiceSchema } from '../invoice.validation.js';

const invoice = {
  invoiceNumber: 'INV-PG-001',
  issueDate: new Date('2026-11-02'),
  dueDate: new Date('2026-12-02'),
  client: { companyName: 'Original Client', address: { street: 'Original Street' }, brand: 'panigrahna' },
  billingAddress: { street: 'Edited Street', city: 'Mumbai', state: 'Maharashtra', pincode: '400001' },
  recipientName: 'Edited Client',
  issuerName: 'Edited Issuer',
  bankName: 'Edited Bank',
  signatoryName: 'Edited Signatory',
  termsConditions: 'Pay within 30 days.',
  items: [{ description: 'Wedding coverage', quantity: 1, unitPrice: 1000, amount: 1000 }],
  subtotal: 1000,
  total: 1180,
  taxRate: 18,
  taxAmount: 180,
};

describe('editable invoice details', () => {
  it('prints reviewed party, address, terms, due date and bank values', () => {
    const html = generateInvoiceHtml(invoice);

    expect(html).toContain('Edited Client');
    expect(html).toContain('Edited Street');
    expect(html).not.toContain('Original Street');
    expect(html).toContain('Edited Issuer');
    expect(html).toContain('Edited Bank');
    expect(html).toContain('Edited Signatory');
    expect(html).toContain('Pay within 30 days.');
    expect(html).toContain('Due Date:');
  });

  it('accepts editable printed fields at the create boundary', () => {
    const parsed = createInvoiceSchema.parse({
      client: 'client-id', dueDate: '2026-12-02',
      items: [{ description: 'Service', quantity: 1, unitPrice: 1000 }],
      issuerName: 'Edited Issuer', bankName: 'Edited Bank', recipientName: 'Edited Client',
    });

    expect(parsed.issuerName).toBe('Edited Issuer');
    expect(parsed.bankName).toBe('Edited Bank');
    expect(parsed.recipientName).toBe('Edited Client');
  });
});
