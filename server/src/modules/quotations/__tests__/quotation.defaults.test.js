import { describe, it, expect } from 'vitest';
import { buildQuotationDefaults } from '../quotation.defaults.js';

describe('quotation defaults', () => {
  it('provides text and pricing defaults without a client or project', () => {
    const defaults = buildQuotationDefaults();

    expect(defaults.salutation).toBe('');
    expect(defaults.letterSignoff).toBe('Warm Regards,\nRudhram Enterprises');
    expect(defaults.deliverables.split('\n').length - 1).toBeGreaterThanOrEqual(3);
    expect(defaults.note).toContain('Payment Terms');
    expect(defaults.price).toBe(0);
    expect(new Date(defaults.validUntil).getTime() - new Date(defaults.issueDate).getTime())
      .toBe(30 * 86400000);
  });

  it('prefills client and project details when provided', () => {
    const defaults = buildQuotationDefaults({
      client: { companyName: 'Yashvi Organics' },
      project: { title: 'Brand Kit', budget: 250000 },
    });

    expect(defaults.salutation).toBe('Dear Yashvi Organics,');
    expect(defaults.subject).toContain('Brand Kit');
    expect(defaults.budget).toBe(250000);
    expect(defaults.price).toBe(250000);
    expect(defaults.scopeTitle).toBe('Brand Kit');
  });

  it.each(['aghori', 'house_of_joggi', 'damrru', 'tandavs', 'kapaalik', 'kalyannam'])(
    'keeps generic defaults when the client brand is %s', (brand) => {
      const generic = buildQuotationDefaults();
      const defaults = buildQuotationDefaults({ client: { brand } });

      expect(defaults.templateId).toBe('standard');
      expect(defaults.letterBody).toBe(generic.letterBody);
      expect(defaults.scopeOfWork).toEqual(generic.scopeOfWork);
      expect(defaults.note).toBe(generic.note);
    },
  );

  it('selects wedding copy when the client brand is Panigrahna', () => {
    const generic = buildQuotationDefaults();
    const defaults = buildQuotationDefaults({ client: { brand: 'panigrahna' } });

    expect(defaults.templateId).toBe('panigrahna');
    expect(defaults.letterBody).not.toBe(generic.letterBody);
    expect(defaults.scopeOfWork).not.toEqual(generic.scopeOfWork);
    expect(defaults.paymentTerms.length).toBeGreaterThan(0);
    expect(defaults.conditions.length).toBeGreaterThan(0);
    expect(defaults.price).toBe(0);
  });

  it.each([
    ['panigrahna', 'standard'],
    ['aghori', 'panigrahna'],
  ])('honors the explicit %s client template override %s', (brand, templateId) => {
    const defaults = buildQuotationDefaults({ client: { brand }, templateId });
    const selected = buildQuotationDefaults({ client: { brand: templateId } });

    expect(defaults.templateId).toBe(templateId);
    expect(defaults.letterBody).toBe(selected.letterBody);
    expect(defaults.scopeOfWork).toEqual(selected.scopeOfWork);
  });

  it('snapshots the actual recipient and printed references when details exist', () => {
    const client = {
      companyName: 'Wedding Client', email: 'client@example.com', phone: '1234567890',
      gstNumber: 'CLIENT-GST', clientId: 'RE-PG-TEST', brand: 'panigrahna',
      address: { street: 'Client Street', city: 'Pune', state: 'Maharashtra', pincode: '411001', country: 'India' },
    };
    const defaults = buildQuotationDefaults({ client, project: { projectCode: 'PROJECT-TEST', budget: 12345 } });

    expect(defaults).toMatchObject({
      recipientName: client.companyName, recipientEmail: client.email, recipientPhone: client.phone,
      recipientGst: client.gstNumber, clientReference: client.clientId, projectReference: 'PROJECT-TEST',
      recipientAddress: 'Client Street, Pune, Maharashtra, 411001, India', price: 12345,
      issuerName: 'RUDHRAM ENTERPRISES PVT. LTD', bankName: 'HDFC Bank',
      bankAccountNumber: '50200095934904', bankIfsc: 'HDFC0006679',
    });
    expect(defaults.bankGst).toBe(defaults.issuerGst);
  });
});
