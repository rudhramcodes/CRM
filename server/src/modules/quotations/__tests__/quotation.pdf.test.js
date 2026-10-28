import { describe, it, expect } from 'vitest';
import { generateQuotationHtml } from '../../../services/pdfService.js';

const quotation = {
  quotationNumber: 'QTN-AG-0001',
  issueDate: new Date('2026-09-12'),
  validUntil: new Date('2026-10-12'),
  salutation: 'Dear Yashvi Group,',
  subject: 'Submission of Quotation for Professional Brand Kit.',
  letterBody: 'Hello from Rudhram.\n\nThank you for your trust.',
  letterSignoff: 'Warm regards,\nRudhram Enterprises',
  scopeTitle: 'Brand Kit',
  scopeIntro: 'The assignment includes:',
  scopeOfWork: ['Logo Identity', 'Brand Guidelines'],
  deliverables: 'As per the letterhead',
  note: '50% advance to begin.',
  price: 300000,
  taxRate: 18,
  taxAmount: 54000,
  total: 354000,
  client: {
    clientId: 'RE-AG-2026-018',
    companyName: 'YASHVI GROUP',
    email: 'admin@yashvigroup.in',
    phone: '6356861316',
    gstNumber: '',
    brand: 'aghori',
    address: {
      street: '911, 9th Floor, Rio Empire,',
      city: 'Surat',
      state: 'Gujarat',
      pincode: '395009',
    },
  },
  project: {
    projectCode: 'RE-PRJ-AG-2026-001',
    title: 'Brand Kit',
    budget: 300000,
  },
};

describe('quotation PDF template', () => {
  it('renders the three required pages', () => {
    const html = generateQuotationHtml(quotation);
    expect(html.match(/class="page /g)).toHaveLength(3);
    expect(html).toContain('COVER LETTER');
    expect(html).toContain('SCOPE OF WORK');
    expect(html).toContain('QUOTATION');
  });

  it('pulls client and project identifiers into the summary page', () => {
    const html = generateQuotationHtml(quotation);
    expect(html).toContain('RE-AG-2026-018');
    expect(html).toContain('RE-PRJ-AG-2026-001');
    expect(html).toContain('QTN-AG-0001');
  });

  it('uses editable letter, scope, note, and pricing content', () => {
    const html = generateQuotationHtml(quotation);
    expect(html).toContain('Hello from Rudhram.');
    expect(html).toContain('Brand Guidelines');
    expect(html).toContain('50% advance to begin.');
    expect(html).toContain('3,00,000');
    expect(html).toContain('54,000');
    expect(html).toContain('3,54,000');
  });
});
