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

  const companyFields = {
    issuerName: 'RUDHRAM ENTERTAINMENT',
    issuerAddress: 'HD-563, 2ND FLOOR, 264-265, Vaswani Chamber,',
    issuerEmail: 'billing@rudhramenterprises.com',
    issuerPhone: '8655695623',
    issuerGst: '27CYSPG6483K1ZK',
    bankName: 'HDFC Bank',
    bankAccountName: 'Rudhram Entertainment',
    bankAccountNumber: '50200095934904',
    bankIfsc: 'HDFC0006679',
    bankGst: '27CYSPG6483K1ZK',
    bankUpi: '7285833101@hdfcbank',
    signatoryName: 'Rudhram Entertainment',
  };

  it.each([undefined, null, '', '   '])('uses company defaults for empty printed fields (%s)', (blank) => {
    const html = generateInvoiceHtml({
      ...invoice,
      ...Object.fromEntries(Object.keys(companyFields).map((field) => [field, blank])),
    });
    for (const value of Object.values(companyFields)) expect(html).toContain(value);
    expect(html).toContain('Worli Road, Near WeWork, Worli,');
    expect(html).toContain('Mumbai, Maharastra, 400018');
  });

  it('preserves every non-empty company override alongside blank defaults', () => {
    for (const field of Object.keys(companyFields)) {
      const html = generateInvoiceHtml({
        ...invoice,
        ...Object.fromEntries(Object.keys(companyFields).map((key) => [key, ''])),
        [field]: 'Custom printed value',
      });
      expect(html).toContain('Custom printed value');
    }
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
