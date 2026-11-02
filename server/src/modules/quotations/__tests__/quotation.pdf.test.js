import { describe, it, expect } from 'vitest';
import { generateQuotationHtml } from '../../../services/pdfService.js';

const quotation = {
  quotationNumber: 'QTN-AG-0001',
  issueDate: new Date('2026-09-12'),
  validUntil: new Date('2026-10-12'),
  salutation: 'Dear Yashvi Group,',
  subject: 'Submission of Quotation for Professional Brand Kit.',
  letterBody: 'Hello from Rudhram.\n\nThank you for your trust.',
  letterSignoff: 'Warm Regards,\nRudhram Enterprises',
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
  it('preserves line breaks in the letter sign-off', () => {
    const html = generateQuotationHtml(quotation);
    expect(html).toContain('Warm Regards,<br>Rudhram Enterprises');
  });

  it('preserves line breaks in summary deliverables', () => {
    const html = generateQuotationHtml({
      ...quotation,
      deliverables: 'Brand Identity Design\nLogo & Visual Assets',
    });
    const summaryHtml = html.split('<section class="page page-summary">')[1];
    expect(summaryHtml).toContain('Brand Identity Design<br>Logo &amp; Visual Assets');
  });

  it('renders the three required pages', () => {
    const html = generateQuotationHtml(quotation);
    expect(html.match(/class="page /g)).toHaveLength(3);
    expect(html).toContain('COVER LETTER');
    expect(html).toContain('SCOPE OF WORK');
    expect(html).toContain('QUOTATION');
  });

  it('renders the authorized signature on the cover letter page', () => {
    const html = generateQuotationHtml(quotation);
    const coverLetter = html.split('<!-- PAGE 2: SCOPE OF WORK -->')[0];
    expect(coverLetter).toContain('class="letter-signature"');
    expect(coverLetter).toContain('AUTHORIZED SIGNATURE');
    expect(coverLetter).toContain('For, <strong>RUDHRAM ENTERTAINMENT</strong>');
  });

  it('includes the cover-letter pagination guard', () => {
    const html = generateQuotationHtml(quotation);
    expect(html).toContain('__quotationPaginationPending');
    expect(html).toContain('__quotationPaginationDone');
    expect(html).toContain("document.querySelector('.page-letter')");
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

  it('preserves line breaks in the scope summary', () => {
    const html = generateQuotationHtml({
      ...quotation,
      scopeTitle: 'Brand Kit\nBrand Identity System',
    });
    const summaryHtml = html.split('<section class="page page-summary">')[1];
    expect(summaryHtml).toContain('Brand Kit<br>Brand Identity System');
  });

  it('preserves line breaks inside scope bullets', () => {
    const html = generateQuotationHtml({
      ...quotation,
      scopeOfWork: ['Logo Identity\nPrimary and secondary marks', 'Brand Guidelines'],
    });
    expect(html).toContain('Logo Identity<br>Primary and secondary marks');
  });

  it('uses the four-page Panigrahna layout for a Panigrahna client', () => {
    const html = generateQuotationHtml({
      ...quotation,
      client: { ...quotation.client, brand: 'panigrahna' },
      paymentTerms: '50% on booking',
      conditions: 'Dates must be confirmed',
    });

    expect(html.match(/class="pg-page /g)).toHaveLength(4);
    expect(html).toContain('class="pg-page pg-letter-page"');
    expect(html).toContain('class="pg-page pg-deliverables-page"');
    expect(html).toContain('class="pg-page pg-terms-page"');
    expect(html).toContain('class="pg-page pg-summary-page"');
    expect(html).toContain('50% on booking');
    expect(html).toContain('Dates must be confirmed');
  });

  it('keeps an explicit standard template even for a Panigrahna client', () => {
    const html = generateQuotationHtml({
      ...quotation,
      templateId: 'standard',
      client: { ...quotation.client, brand: 'panigrahna' },
    });

    expect(html).toContain('class="page page-letter"');
    expect(html).not.toContain('class="pg-page ');
  });

  it('renders editable printed details without interpreting HTML', () => {
    const html = generateQuotationHtml({
      ...quotation,
      templateId: 'panigrahna',
      recipientName: 'Edited <Client>',
      recipientAddress: 'Street & City',
      issuerName: 'Edited Issuer',
      bankName: 'Edited Bank',
      signatoryName: 'Edited Signatory',
      conditions: '<script>alert(1)</script>',
    });

    expect(html).toContain('Edited &lt;Client&gt;');
    expect(html).toContain('Street &amp; City');
    expect(html).toContain('Edited Issuer');
    expect(html).toContain('Edited Bank');
    expect(html).toContain('Edited Signatory');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('<script>alert(1)</script>');
  });

  it('uses edited recipient, issuer and bank details in the standard template too', () => {
    const html = generateQuotationHtml({
      ...quotation,
      templateId: 'standard',
      recipientName: 'Edited Client',
      issuerName: 'Edited Issuer',
      issuerEmail: 'issuer@example.com',
      bankName: 'Edited Bank',
      signatoryName: 'Edited Signatory',
    });

    expect(html).toContain('class="to-name">Edited Client</div>');
    expect(html).toContain('class="company-name">Edited Issuer</div>');
    expect(html).toContain('issuer@example.com');
    expect(html).toContain('Bank Name: Edited Bank');
    expect(html).toContain('class="sig-company">Edited Signatory</div>');
  });
});
