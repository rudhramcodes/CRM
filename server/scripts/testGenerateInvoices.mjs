import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';
import { generateInvoiceHtml, generateInvoicePdf } from '../src/services/pdfService.js';

const mockPanigrahnaInvoice = {
  invoiceNumber: 'INV-PG-0012',
  issueDate: new Date('2026-09-12'),
  brand: 'panigrahna',
  client: {
    clientId: 'RE-AG-2026-017',
    companyName: 'YASHVI',
    email: 'yashvi@example.com',
    phone: '+91 98765 43210',
    gstNumber: '24AAAAA0000A1Z5',
    brand: 'panigrahna',
    address: {
      street: 'Rio Empire 905,',
      city: 'Nr. Reliance Mart, Adajan Gam, Pal, Surat',
      state: 'Gujarat',
      pincode: '395009',
    },
  },
  project: {
    projectNumber: 'PRJ-2026-042',
    title: 'Brand Campaign 2026',
  },
  items: [
    { description: 'Creative Development', amount: 12000 },
    { description: 'Pre Production', amount: 54000 },
    { description: 'Production', amount: 85000 },
    { description: 'Post Production', amount: 35000 },
  ],
  subtotal: 186000,
  taxRate: 18,
  taxAmount: 33480,
  total: 219480,
  notes: '',
};

const mockAghoriInvoice = {
  invoiceNumber: 'INV-AG-0008',
  issueDate: new Date('2026-09-12'),
  brand: 'aghori',
  client: {
    clientId: 'RE-AG-2026-017',
    companyName: 'YASHVI',
    email: 'yashvi@example.com',
    phone: '+91 98765 43210',
    gstNumber: '24AAAAA0000A1Z5',
    brand: 'aghori',
    address: {
      street: 'Rio Empire 905,',
      city: 'Nr. Reliance Mart, Adajan Gam, Pal, Surat',
      state: 'Gujarat',
      pincode: '395009',
    },
  },
  project: {
    projectNumber: 'PRJ-2026-042',
    title: 'Aghori Visuals',
  },
  items: [
    { description: 'Creative Development', amount: 12000 },
    { description: 'Pre Production', amount: 54000 },
    { description: 'Production', amount: 85000 },
    { description: 'Post Production', amount: 35000 },
  ],
  subtotal: 186000,
  taxRate: 18,
  taxAmount: 33480,
  total: 219480,
  notes: '',
};

async function run() {
  console.log('Generating PDFs and PNGs...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  // Panigrahna
  const pgHtml = generateInvoiceHtml(mockPanigrahnaInvoice);
  const pgPage = await browser.newPage();
  await pgPage.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });
  await pgPage.setContent(pgHtml, { waitUntil: 'networkidle0' });
  await pgPage.screenshot({ path: path.join(process.cwd(), 'assets', 'verified-panigrahna.png') });
  const pgPdfBuf = await generateInvoicePdf(mockPanigrahnaInvoice);
  fs.writeFileSync(path.join(process.cwd(), 'assets', 'panigrahna-invoice.pdf'), pgPdfBuf);
  console.log('Panigrahna PDF size:', pgPdfBuf.length, 'bytes');

  // Aghori
  const agHtml = generateInvoiceHtml(mockAghoriInvoice);
  const agPage = await browser.newPage();
  await agPage.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });
  await agPage.setContent(agHtml, { waitUntil: 'networkidle0' });
  await agPage.screenshot({ path: path.join(process.cwd(), 'assets', 'verified-aghori.png') });
  const agPdfBuf = await generateInvoicePdf(mockAghoriInvoice);
  fs.writeFileSync(path.join(process.cwd(), 'assets', 'aghori-invoice.pdf'), agPdfBuf);
  console.log('Aghori PDF size:', agPdfBuf.length, 'bytes');

  await browser.close();
  console.log('Done!');
}

run().catch(console.error);
