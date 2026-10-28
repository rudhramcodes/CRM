import puppeteer from 'puppeteer';
import { readFileSync } from 'fs';

const loadAssetBase64 = (relativePath) => {
  try {
    return readFileSync(new URL(relativePath, import.meta.url)).toString('base64');
  } catch {
    return '';
  }
};

const APEX_REGULAR_FONT = loadAssetBase64('../../assets/fonts/ApexNewTrial-Book.otf');
const APEX_MEDIUM_FONT = loadAssetBase64('../../assets/fonts/ApexNewTrial-Medium.otf');
const GOLDENBOOK_REGULAR_FONT = loadAssetBase64('../../assets/fonts/Goldenbook-Regular.otf');
const GOLDENBOOK_BOLD_FONT = loadAssetBase64('../../assets/fonts/Goldenbook-Bold.otf');
const CALIFORNIAN_FB_BOLD_FONT = loadAssetBase64('../../assets/fonts/Californian FB Bold.ttf');

const RUDHRAM_EMBLEM_BASE64 = loadAssetBase64('../../assets/rudhram-emblem.png');
const RUDHRAM_LOGO_BASE64 = loadAssetBase64('../../assets/rudhram-logo.png');
const PAPER_GRAIN_TILE_BASE64 = loadAssetBase64('../../assets/paper-grain-tile.jpg');


const RUDHRAM_LOGO_URL = 'https://res.cloudinary.com/dvsrgdyi7/image/upload/v1784621259/rudhram-logo.png';

const VENTURES = {
  panigrahna: {
    code: 'PG',
    name: 'PANIGRAHNA',
    logoUrl: 'https://res.cloudinary.com/dvsrgdyi7/image/upload/v1784704090/pg-logo-with-name.png',
  },
  aghori: {
    code: 'AG',
    name: 'AGHHORI',
    logoUrl: 'https://res.cloudinary.com/dvsrgdyi7/image/upload/v1784535471/ag-logo.avif',
  },
  house_of_joggi: { code: 'HG', name: 'HOUSE OF JOGGI' },
  damrru: { code: 'DM', name: 'DAMRRU' },
  tandavs: { code: 'TD', name: 'TANDAVS' },
  kapaalik: { code: 'KP', name: 'KAPAALIK' },
  kalyannam: { code: 'KL', name: 'KALYANNAM' },
};

const COMPANY = {
  legalName: 'RUDHRAM ENTERPRISES PVT. LTD',
  cin: 'U59111MH2026PTC470019',
  pan: 'AAPCR7787R',
  tan: 'MUMR56059D',
  gstin: '27CYSPG6483K1ZK',
  companyType: 'Private Limited Company',
  email: 'billing@rudhramenterprises.com',
  contact: '7285833101',
  addressLine1: '7th Floor, S-11, 1171, 1172, Solitaire Corporate Park,',
  addressLine2: 'Andheri Ghalkopar Link Road',
  addressLine3: 'Mumbai, Maharashtra, 400093.',
  signatoryLine1: 'AUTHORIZED SIGNATURE',
  signatoryLine2: 'Rudhram Entertainment',
};

const BANK = {
  bankName: 'HDFC Bank',
  accountHolder: 'Rudhram Entertainment',
  accountType: 'Current Account',
  accountNumber: '50200095934904',
  ifscCode: 'HDFC0006679',
  upiId: '7285833101@hdfcbank',
};

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fmt = (val) => `₹${(Number(val) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtPlain = (val) => (Number(val) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (d) => {
  if (!d) return '-';
  const dateObj = new Date(d);
  if (isNaN(dateObj.getTime())) return '-';
  return dateObj.toLocaleDateString('en-GB'); // DD/MM/YYYY
};

function numberToIndianWords(num) {
  if (!num || num === 0) return 'Zero Only';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const b1000 = (n) => {
    if (n === 0) return '';
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + b1000(n % 100) : '');
  };
  const n = Math.round(num);
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const hundred = n % 1000;
  const words = [];
  if (crore) words.push(b1000(crore) + ' Crore');
  if (lakh) words.push(b1000(lakh) + ' Lakh');
  if (thousand) words.push(b1000(thousand) + ' Thousand');
  if (hundred) words.push(b1000(hundred));
  return words.join(' ') + ' Only';
}

const getVentureLogoHtml = (brand) => {
  const b = String(brand || '').toLowerCase();
  const v = VENTURES[b];
  if (v?.logoUrl) {
    return `<img src="${v.logoUrl}" alt="${esc(v.name || b)}" />`;
  }
  if (v?.logoBase64) {
    return `<img src="data:image/png;base64,${v.logoBase64}" alt="${esc(v.name)}" />`;
  }
  const displayName = v?.name || (b ? b.replace(/_/g, ' ').toUpperCase() : 'RUDHRAM');
  return `
    <div style="text-align:right;">
      <div style="font-family:'Goldenbook',serif;font-size:22px;font-weight:700;letter-spacing:0.08em;color:#9E6E38;line-height:1.2;">
        ${esc(displayName)}
      </div>
    </div>
  `;
};

/* ============================================================
   EXACT MASTER INVOICE TEMPLATE (Panigrahna / Aghori / Ventures)
   ============================================================ */
export const generateInvoiceHtml = (invoice) => {
  const client = invoice.client || {};
  const clientAddress = client.address || invoice.billingAddress || {};
  const items = invoice.items && invoice.items.length > 0
    ? invoice.items
    : [{ description: 'Creative Development & Execution', amount: invoice.total || 0 }];

  const brand = invoice.brand || client.brand || invoice.project?.brand;
  const ventureLogoHtml = getVentureLogoHtml(brand);
  const subtotal = invoice.subtotal ?? invoice.total ?? 0;
  const total = invoice.total ?? invoice.totalAmount ?? (subtotal + (invoice.taxAmount || 0) - (invoice.discountAmount || 0));
  const taxRate = invoice.taxRate ?? (invoice.taxAmount ? 18 : 0);
  const taxAmount = invoice.taxAmount ?? (taxRate ? (subtotal * taxRate) / 100 : 0);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Invoice - ${esc(invoice.invoiceNumber || 'INV')}</title>
  <style>
    @font-face {
      font-family: 'Goldenbook';
      src: url(data:font/opentype;base64,${GOLDENBOOK_BOLD_FONT}) format('opentype');
      font-weight: 700;
      font-style: normal;
    }
    @font-face {
      font-family: 'Goldenbook';
      src: url(data:font/opentype;base64,${GOLDENBOOK_REGULAR_FONT}) format('opentype');
      font-weight: 400;
      font-style: normal;
    }

    @font-face {
      font-family: 'Californian FB';
      src: url(data:font/truetype;base64,${CALIFORNIAN_FB_BOLD_FONT}) format('truetype');
      font-weight: 700;
      font-style: normal;
    }
    @font-face {
      font-family: 'Californian FB';
      src: url(data:font/truetype;base64,${CALIFORNIAN_FB_BOLD_FONT}) format('truetype');
      font-weight: 400;
      font-style: normal;
    }

    @page {
      size: A4 portrait;
      margin: 0;
    }

    * {
      box-sizing: border-box;
    }

    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      background-color: #FAF6F0;
      color: #1a1a1a;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      font-family: 'Californian FB', Georgia, serif;
    }

    body {
      background-color: #FAF6F0;
    }

    .grain-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background-image: url('data:image/jpeg;base64,${PAPER_GRAIN_TILE_BASE64}');
      background-size: cover; /* Prevents repeating seams */
      background-position: center;
      opacity: 0.35; /* Lightens the dark texture */
      mix-blend-mode: multiply;
      pointer-events: none;
      z-index: 1;
    }

    /* Screen display vs Print */
    .invoice-page {
      position: relative;
      z-index: 3; /* Sit above the watermark and grain */
      width: 794px;
      margin: 0 auto;
      padding: 24px 36px 36px; /* Padding for web preview */
      background-color: transparent;
    }

    @media print {
      .invoice-page {
        width: 100%;
        margin: 0;
        padding: 0 44px; /* Left and right margins for print */
      }
      body {
        margin: 0; 
      }
    }

    /* Table for repeating header/footer */
    .layout-table {
      width: 100%;
      border-collapse: collapse;
    }
    .layout-table > thead > tr > td {
      padding-top: 44px;
      padding-bottom: 24px;
    }
    .layout-table > tfoot > tr > td {
      padding-top: 24px;
      padding-bottom: 40px;
    }

    /* Centered watermark */
    .watermark-bg {
      position: fixed;
      top: 55%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 600px;
      opacity: 0.12;
      pointer-events: none;
      z-index: 2; /* Sit between grain and content */
      text-align: center;
    }
    .watermark-bg .wm-logo {
      width: 100%;
      height: auto;
      display: block;
      margin: 0 auto;
    }

    /* Top Branding - Centered */
    .top-branding {
      text-align: center;
      margin-bottom: 24px;
    }
    .top-branding .rudhram-logo-full {
      height: 100px;
      width: auto;
      display: block;
      margin: 0 auto 2px;
    }
    .top-branding .rudhram-sub {
      font-family: 'Goldenbook', serif;
      font-size: 14px;
      letter-spacing: 0.24em;
      color: #9E6E38;
      text-transform: lowercase;
      margin-top: 0;
    }

    /* Invoice Meta Row */
    .invoice-meta-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .header-left {
      text-align: left;
    }

    .invoice-heading {
      font-family: 'Goldenbook', serif;
      font-size: 32px;
      font-weight: 700;
      letter-spacing: 0.02em;
      color: #1a1a1a;
      margin: 0 0 12px 0;
      line-height: 1;
    }

    .meta-list {
      font-size: 14.5px;
      line-height: 1.6;
    }
    .meta-item {
      display: flex;
    }
    .meta-lbl {
      width: 90px;
      font-weight: 500;
    }

    .header-right {
      text-align: right;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      justify-content: flex-start;
    }
    .header-right img {
      height: 78px;
      max-width: 190px;
      object-fit: contain;
    }

    /* Parties: Company vs Billed to */
    .parties-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 32px;
      margin-top: 10px;
      margin-bottom: 32px;
      font-size: 13.5px;
      line-height: 1.45;
    }

    .company-title {
      font-size: 18px; /* Specifically increased per rules */
      font-weight: 700;
      text-transform: uppercase;
      color: #1a1a1a;
      margin-bottom: 4px;
    }

    .billed-label {
      font-family: 'Goldenbook', serif;
      font-size: 16px;
      font-weight: 700;
      letter-spacing: 0.05em;
      color: #1a1a1a;
      margin-bottom: 6px;
    }
    .client-name {
      font-size: 16px;
      font-weight: 500;
      text-transform: uppercase;
      color: #1a1a1a;
      margin-bottom: 4px;
    }

    /* Items Table */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
      page-break-inside: auto;
    }
    .items-table thead {
      display: table-header-group;
    }
    .items-table tr {
      page-break-inside: avoid;
      break-inside: avoid;
      page-break-after: auto;
    }
    .items-table th {
      font-family: 'Goldenbook', serif;
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.06em;
      color: #1a1a1a;
      padding: 10px 14px;
      border-top: 1.5px solid #BA8E58;
      border-bottom: 1.5px solid #BA8E58;
    }
    .items-table th.th-desc { text-align: left; }
    .items-table th.th-amount { text-align: right; }

    .items-table td {
      font-size: 14.5px;
      padding: 12px 14px;
      color: #1a1a1a;
      vertical-align: top;
    }
    .items-table td.td-desc { text-align: left; }
    .items-table td.td-amount { 
      text-align: right; 
      font-variant-numeric: tabular-nums;
    }

    .items-table tr.last-row td {
      border-bottom: 1.5px solid #BA8E58;
      padding-bottom: 16px;
    }

    /* Notes & Calculation Section */
    .summary-grid {
      display: grid;
      grid-template-columns: 1fr 300px;
      gap: 32px;
      margin-top: 16px;
      align-items: start;
      page-break-inside: avoid;
    }

    .notes-box {
      font-size: 13.5px;
      line-height: 1.5;
    }
    .notes-box .note-label {
      font-family: 'Goldenbook', serif;
      font-size: 15px;
      font-weight: 700;
      letter-spacing: 0.05em;
      display: block;
      margin-bottom: 4px;
    }

    .calc-stack {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .calc-line {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 2px 14px;
      color: #1a1a1a;
    }
    .calc-line.subtotal-line,
    .calc-line.gst-line {
      font-family: 'Goldenbook', serif;
      font-weight: 700;
      letter-spacing: 0.04em;
      font-size: 14px;
    }
    .calc-line.discount-line {
      font-family: 'Goldenbook', serif;
      font-weight: 700;
      letter-spacing: 0.04em;
      font-size: 14px;
      color: #2e7d32;
    }
    .calc-line .calc-val {
      font-family: 'Californian FB', serif;
      font-size: 15px;
      font-weight: 500;
      font-variant-numeric: tabular-nums;
    }

    .total-bar {
      margin-top: 6px;
      background-color: #C6AD8D !important;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 9px 14px;
      width: 100%;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .total-bar .lbl {
      font-family: 'Goldenbook', serif;
      font-size: 15px;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: #1a1a1a;
    }
    .total-bar .val {
      font-family: 'Californian FB', serif;
      font-size: 16.5px;
      font-weight: 700;
      color: #1a1a1a;
      font-variant-numeric: tabular-nums;
    }

    /* Footer */
    .footer-grid {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 36px;
      padding-bottom: 40px;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .bank-box {
      font-size: 13.5px;
      line-height: 1.5;
      color: #1a1a1a;
    }
    .bank-box .bank-title {
      font-family: 'Goldenbook', serif;
      font-size: 16px;
      font-weight: 700;
      letter-spacing: 0.06em;
      color: #1a1a1a;
      margin-bottom: 6px;
    }

    .sign-box {
      text-align: right;
      color: #1a1a1a;
    }
    .sign-top {
      font-family: 'Goldenbook', serif;
      font-size: 13px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      font-weight: 700;
      color: #1a1a1a;
      margin-bottom: 52px;
    }
    .sign-bottom {
      font-size: 14px;
      font-weight: 500;
      color: #1a1a1a;
    }
  </style>
</head>
<body>
  <!-- Fixed Background Grain -->
  <div class="grain-overlay"></div>

  <!-- Fixed Background Watermark -->
  <div class="watermark-bg">
    <img src="${RUDHRAM_LOGO_BASE64 ? `data:image/png;base64,${RUDHRAM_LOGO_BASE64}` : RUDHRAM_LOGO_URL}" alt="Watermark" class="wm-logo" />
  </div>

  <div class="invoice-page">
    <table class="layout-table">
      <!-- HEADER: Repeats on every page -->
      <thead>
        <tr>
          <td>
            <div class="top-branding">
              <img src="${RUDHRAM_LOGO_BASE64 ? `data:image/png;base64,${RUDHRAM_LOGO_BASE64}` : RUDHRAM_LOGO_URL}" class="rudhram-logo-full" alt="Rudhram" />
              <div class="rudhram-sub">enterprises</div>
            </div>

            <div class="invoice-meta-row">
              <div class="header-left">
                <h1 class="invoice-heading">INVOICE</h1>
                <div class="meta-list">
                  <div class="meta-item"><span class="meta-lbl">Invoice No.</span> <span>${esc(invoice.invoiceNumber || '-')}</span></div>
                  <div class="meta-item"><span class="meta-lbl">Client Id :</span> <span>${esc(client.clientId || '-')}</span></div>
                  <div class="meta-item"><span class="meta-lbl">Project Id :</span> <span>${esc(invoice.project?.projectCode || '-')}</span></div>
                  <div class="meta-item"><span class="meta-lbl">Date:</span> <span>${fmtDate(invoice.issueDate)}</span></div>
                </div>
              </div>

              <div class="header-right">
                ${ventureLogoHtml}
              </div>
            </div>
          </td>
        </tr>
      </thead>

      <!-- BODY: Can span across multiple pages -->
      <tbody>
        <tr>
          <td>
            <!-- Parties -->
            <div class="parties-grid">
              <div>
                <div class="company-title">${COMPANY.legalName}</div>
                <div>${COMPANY.addressLine1}</div>
                <div>${COMPANY.addressLine2}</div>
                <div>${COMPANY.addressLine3}</div>
                <div>${COMPANY.email}</div>
                <div>Mobile: ${COMPANY.contact}</div>
                <div>GST NO: ${COMPANY.gstin}</div>
              </div>

              <div>
                <div class="billed-label">BILLED TO:</div>
                <div class="client-name">${esc(client.companyName || client.contactPerson || '-')}</div>
                ${clientAddress.street ? `<div>${esc(clientAddress.street)}</div>` : '<div>Rio Empire 905,</div>'}
                ${clientAddress.city || clientAddress.state
      ? `<div>${esc(clientAddress.city ? `${clientAddress.city}, ` : '')}${esc(clientAddress.state || '')}${clientAddress.pincode ? ` - ${clientAddress.pincode}` : ''}</div>`
      : '<div>Nr. Reliance Mart, Adajan Gam, Pal,</div><div>Surat, Gujarat - 395009</div>'}
                <div>Email: ${esc(client.email || '')}</div>
                <div>Mobile: ${esc(client.phone || '')}</div>
                <div>GST NO: ${esc(client.gstNumber || '')}</div>
              </div>
            </div>

            <!-- Items Table -->
            <table class="items-table">
              <thead>
                <tr>
                  <th class="th-desc">DESCRIPTION</th>
                  <th class="th-amount">AMOUNT (₹)</th>
                </tr>
              </thead>
              <tbody>
                ${items.map((item, idx, arr) => `
                  <tr class="${idx === arr.length - 1 ? 'last-row' : ''}">
                    <td class="td-desc">${esc(item.description)}</td>
                    <td class="td-amount">${fmtPlain(item.amount || (item.quantity * item.unitPrice))}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <!-- Notes & Totals -->
            <div class="summary-grid">
              <div class="notes-box">
                <span class="note-label">NOTE:</span>
                <span>${esc(invoice.notes || '')}</span>
              </div>

              <div class="calc-stack">
                <div class="calc-line subtotal-line">
                  <span>SUBTOTAL</span>
                  <span class="calc-val">${fmtPlain(subtotal)}</span>
                </div>
                ${taxAmount > 0 || taxRate > 0 ? `
                <div class="calc-line gst-line">
                  <span>GST (${taxRate}%)</span>
                  <span class="calc-val">${fmtPlain(taxAmount)}</span>
                </div>` : ''}
                ${invoice.discountAmount > 0 || invoice.discountPercent > 0 ? `
                <div class="calc-line discount-line">
                  <span>DISCOUNT (${invoice.discountPercent || 0}%)</span>
                  <span class="calc-val">-${fmtPlain(invoice.discountAmount)}</span>
                </div>` : ''}
                <div class="total-bar">
                  <span class="lbl">TOTAL</span>
                  <span class="val">${fmtPlain(total)}</span>
                </div>
                ${invoice.paidAmount > 0 ? `
                <div class="calc-line" style="margin-top:2px;color:#2e7d32;">
                  <span>AMOUNT PAID</span>
                  <span class="calc-val">-${fmtPlain(invoice.paidAmount)}</span>
                </div>
                <div class="calc-line" style="font-weight:700;color:#9E6E38;">
                  <span>BALANCE DUE</span>
                  <span class="calc-val">${fmtPlain(invoice.balanceDue)}</span>
                </div>` : ''}
              </div>
            </div>

            <!-- FOOTER: Appears only on the last page after all items and totals -->
            <div class="footer-grid">
              <div class="bank-box">
                <div class="bank-title">BANK DETAILS</div>
                <div>Bank Name: ${BANK.bankName}</div>
                <div>Account Name: ${BANK.accountHolder}</div>
                <div>Account No: ${BANK.accountNumber}</div>
                <div>IFSC Code: ${BANK.ifscCode}</div>
                <div>GST: ${COMPANY.gstin}</div>
                <div>UPI ID: ${BANK.upiId}</div>
              </div>

              <div class="sign-box">
                <div class="sign-top">AUTHORIZED SIGNATURE</div>
                <div class="sign-bottom">Rudhram Entertainment</div>
              </div>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</body>
</html>`;
};

export const generateInvoicePdf = async (invoice) => {
  const html = generateInvoiceHtml(invoice);
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const raw = await page.pdf({
      format: 'A4',
      // We removed the forced 0 margin to let @page take effect
      printBackground: true,
      preferCSSPageSize: true,
    });
    return Buffer.from(raw);
  } finally {
    await browser.close();
  }
};

/* ============================================================
   QUOTATION TEMPLATE (3 pages: letter / scope / summary)
   ============================================================ */
const QUOTATION_CONTACT = {
  addressLine1: 'Floor No 7th, Building S-11, Unit 1171,1172',
  addressLine2: 'Solitaire Corporate Park, Andheri Ghalkopar',
  addressLine3: 'Link Road Mumbai, Maharashtra, 400093.',
  phone: '+91 7285833101',
  email: 'hello@rudhramenterprises.com',
  website: 'www.rudhramenterprises.com',
};

const quotationIcon = (name) => {
  const icons = {
    location: '<path d="M12 21s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12z"/><circle cx="12" cy="9" r="2.4"/>',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L8 9.6a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.8.3 1.7.5 2.6.6a2 2 0 0 1 2.1 2.4z"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/>',
  };
  return `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#B3712D" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${icons[name] || ''}</svg>`;
};

const quotationAddressLines = (client) => {
  const address = client?.address || {};
  if (typeof address === 'string') return [address].filter(Boolean);
  const cityLine = [address.city, address.state].filter(Boolean).join(', ');
  return [
    address.street,
    cityLine,
    [address.pincode ? `- ${address.pincode}` : '', address.country || ''].filter(Boolean).join(' '),
  ].filter(Boolean);
};

const quotationParagraphs = (value) =>
  String(value || '')
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${esc(paragraph).replace(/\n/g, '<br>')}</p>`)
    .join('');

const quotationMeta = (quotation) => {
  const client = quotation.client || {};
  const project = quotation.project || {};
  return {
    client,
    project,
    brand: client.brand || project.brand,
    quotationNumber: quotation.quotationNumber || '-',
    clientId: client.clientId || '-',
    projectCode: project.projectCode || '-',
    quoteDate: fmtDate(quotation.issueDate),
    validUntil: quotation.validUntil ? fmtDate(quotation.validUntil) : '',
    price: Number(quotation.price || 0),
    taxRate: Number(quotation.taxRate ?? 18),
    taxAmount: Number(quotation.taxAmount || 0),
    total: Number(quotation.total || 0),
    budget: Number(quotation.budget || 0),
    scopeTitle: quotation.scopeTitle || project.title || 'Brand Kit',
    scopeIntro: quotation.scopeIntro || '',
    scopeItems: Array.isArray(quotation.scopeOfWork) ? quotation.scopeOfWork.filter(Boolean) : [],
    deliverables: quotation.deliverables || 'As per the letterhead',
    salutation: quotation.salutation || `Dear ${client.companyName || 'Client'},`,
    subject: quotation.subject || `Submission of Quotation for Professional ${quotation.scopeTitle || project.title || 'Brand Kit'}.`,
    letterBody: quotation.letterBody || '',
    letterSignoff: quotation.letterSignoff || 'Warm regards,\nRudhram Enterprises',
    note: quotation.note || '',
  };
};

const quotationHeader = (brand, variant = 'split') => {
  const ventureLogoHtml = getVentureLogoHtml(brand);
  if (variant === 'summary') {
    return `
      <header class="q-header q-header-summary">
        <div class="summary-rudhram">
          <img src="${RUDHRAM_LOGO_BASE64 ? `data:image/png;base64,${RUDHRAM_LOGO_BASE64}` : RUDHRAM_LOGO_URL}" alt="Rudhram" />
        </div>
        <div class="summary-brand">${ventureLogoHtml}</div>
      </header>`;
  }

  return `
    <header class="q-header">
      <div class="q-brand">${ventureLogoHtml}</div>
      <div class="q-rudhram">
        <img src="${RUDHRAM_LOGO_BASE64 ? `data:image/png;base64,${RUDHRAM_LOGO_BASE64}` : RUDHRAM_LOGO_URL}" alt="Rudhram" />
      </div>
    </header>`;
};

const quotationContactFooter = () => `
  <footer class="q-footer">
    <div class="footer-rail"></div>
    <div class="contact-block">
      <div class="contact-row"><span class="contact-icon">${quotationIcon('location')}</span><div><strong>RUDHRAM ENTERPRISES PVT. LTD</strong><br>${QUOTATION_CONTACT.addressLine1}<br>${QUOTATION_CONTACT.addressLine2}<br>${QUOTATION_CONTACT.addressLine3}</div></div>
      <div class="contact-row"><span class="contact-icon">${quotationIcon('phone')}</span><span>${QUOTATION_CONTACT.phone}</span></div>
      <div class="contact-row"><span class="contact-icon">${quotationIcon('mail')}</span><span>${QUOTATION_CONTACT.email}</span></div>
      <div class="contact-row"><span class="contact-icon">${quotationIcon('globe')}</span><span>${QUOTATION_CONTACT.website}</span></div>
    </div>
    <div class="bottom-mark"></div>
  </footer>`;

const quotationSignature = () => `
  <div class="signature">
    <div class="sig-label">AUTHORIZED SIGNATURE</div>
    <div class="sig-for">For, <strong>RUDHRAM ENTERTAINMENT</strong></div>
    <div class="sig-space"></div>
    <div class="sig-role">PROPRIETOR</div>
    <div class="sig-company">Rudhram Entertainment</div>
  </div>`;

export const generateQuotationHtml = (quotation) => {
  const meta = quotationMeta(quotation);
  const { client } = meta;
  const addressLines = quotationAddressLines(client);
  const scopeItems = meta.scopeItems.length > 0
    ? meta.scopeItems
    : ['As per the scope discussed with the client.'];
  const watermark = RUDHRAM_LOGO_BASE64
    ? `data:image/png;base64,${RUDHRAM_LOGO_BASE64}`
    : RUDHRAM_LOGO_URL;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Quotation - ${esc(meta.quotationNumber)}</title>
  <style>
    @font-face {
      font-family: 'Goldenbook';
      src: url(data:font/opentype;base64,${GOLDENBOOK_BOLD_FONT}) format('opentype');
      font-weight: 700;
      font-style: normal;
    }
    @font-face {
      font-family: 'Goldenbook';
      src: url(data:font/opentype;base64,${GOLDENBOOK_REGULAR_FONT}) format('opentype');
      font-weight: 400;
      font-style: normal;
    }
    @font-face {
      font-family: 'Californian FB';
      src: url(data:font/truetype;base64,${CALIFORNIAN_FB_BOLD_FONT}) format('truetype');
      font-weight: 700;
      font-style: normal;
    }
    @font-face {
      font-family: 'Californian FB';
      src: url(data:font/truetype;base64,${CALIFORNIAN_FB_BOLD_FONT}) format('truetype');
      font-weight: 400;
      font-style: normal;
    }

    @page { size: A4 portrait; margin: 0; }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      background: #FAF6F0;
      color: #2b1d14;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      font-family: 'Californian FB', Georgia, serif;
    }

    .grain-overlay {
      position: fixed;
      inset: 0;
      background-image: url('data:image/jpeg;base64,${PAPER_GRAIN_TILE_BASE64}');
      background-size: cover;
      background-position: center;
      opacity: 0.32;
      mix-blend-mode: multiply;
      pointer-events: none;
      z-index: 1;
    }

    .page {
      position: relative;
      z-index: 3;
      width: 794px;
      min-height: 1123px;
      margin: 0 auto 24px;
      padding: 34px 48px 30px;
      background: transparent;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      page-break-after: always;
      break-after: page;
    }
    .page:last-child { page-break-after: auto; break-after: auto; }

    @media print {
      .page {
        width: 210mm;
        height: 297mm;
        min-height: 297mm;
        margin: 0;
        padding: 12mm 15mm 11mm;
      }
      .q-header::before,
      .footer-rail { left: -15mm; }
    }

    .page-watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 520px;
      transform: translate(-50%, -50%);
      opacity: 0.055;
      pointer-events: none;
      z-index: 0;
    }
    .page-watermark img { width: 100%; height: auto; display: block; }
    .page-summary .page-watermark { width: 460px; opacity: 0.075; }

    .q-header {
      position: relative;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      min-height: 102px;
      padding-bottom: 17px;
      border-bottom: 2px solid #B3712D;
      margin-bottom: 28px;
      z-index: 2;
    }
    .q-header::before {
      content: '';
      position: absolute;
      left: -48px;
      bottom: -2px;
      width: 132px;
      height: 10px;
      background: #B3712D;
      transform: skewX(-34deg);
      transform-origin: left bottom;
    }
    .q-brand img { height: 74px; max-width: 205px; object-fit: contain; }
    .q-rudhram img { height: 80px; max-width: 205px; object-fit: contain; }
    .q-header-summary {
      justify-content: center;
      align-items: center;
      min-height: 118px;
      margin-bottom: 18px;
      border-bottom: 0;
    }
    .q-header-summary::before { display: none; }
    .summary-rudhram img { height: 94px; max-width: 210px; object-fit: contain; }
    .summary-brand {
      position: absolute;
      right: 0;
      top: 50%;
      transform: translateY(-50%);
    }
    .summary-brand img { height: 73px; max-width: 165px; object-fit: contain; }

    .page-body { position: relative; z-index: 2; flex: 1; display: flex; flex-direction: column; }

    /* ---------- Page 1: letter ---------- */
    .letter-body {
      padding: 16px 10px 0;
      font-size: 14.1px;
      line-height: 1.55;
    }
    .letter-body p { margin: 0 0 15px; }
    .letter-body .salutation { margin-bottom: 20px; }
    .letter-body .signoff { margin-top: 18px; }

    .q-footer {
      position: relative;
      z-index: 2;
      margin-top: auto;
      padding: 17px 0 8px 30px;
      border-top: 1px solid rgba(179, 113, 45, 0.18);
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      font-size: 11.8px;
      line-height: 1.48;
    }
    .footer-rail {
      position: absolute;
      left: -48px;
      bottom: 38px;
      width: 22px;
      height: 95px;
      background: #B3712D;
    }
    .contact-row { display: flex; gap: 8px; margin-top: 5px; }
    .contact-row:first-child { margin-top: 0; }
    .contact-icon { width: 13px; flex: 0 0 13px; padding-top: 2px; }
    .contact-row strong { font-family: 'Goldenbook', serif; font-size: 12.4px; letter-spacing: 0.04em; }
    .bottom-mark {
      position: absolute;
      left: 30px;
      right: 0;
      bottom: 0;
      height: 2px;
      background: #B3712D;
    }
    .bottom-mark::after {
      content: '';
      position: absolute;
      right: -8px;
      bottom: 0;
      width: 52px;
      height: 12px;
      background: #B3712D;
      transform: skewX(-35deg);
      transform-origin: right bottom;
    }

    /* ---------- Page 2: scope ---------- */
    .to-block { font-size: 14.3px; line-height: 1.45; margin-bottom: 24px; }
    .to-block .to-label { font-size: 15px; margin-bottom: 2px; }
    .to-block .to-name { font-family: 'Goldenbook', serif; font-size: 18px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; margin-bottom: 5px; }
    .subject-line { font-size: 15.5px; margin-bottom: 22px; }
    .section-rule { border-top: 2px solid #B3712D; border-bottom: 1px solid #B3712D; padding: 8px 0 9px; margin-bottom: 18px; }
    .section-title { font-family: 'Goldenbook', serif; font-size: 15.5px; font-weight: 700; letter-spacing: 0.06em; }
    .scope-intro { font-size: 14.2px; line-height: 1.48; margin: 0 0 8px; }
    .scope-list { margin: 0; padding: 0; list-style: none; font-size: 12.75px; line-height: 1.42; }
    .scope-list li { position: relative; padding-left: 15px; margin-bottom: 4px; }
    .scope-list li::before { content: ''; position: absolute; left: 1px; top: 6px; width: 5px; height: 5px; border-radius: 50%; background: #2b1d14; }
    .scope-footer { margin-top: auto; padding-top: 10px; display: flex; justify-content: flex-end; }
    .signature { text-align: right; font-size: 12.6px; line-height: 1.45; min-width: 245px; }
    .sig-label { font-family: 'Goldenbook', serif; font-size: 11.5px; letter-spacing: 0.08em; }
    .sig-for { font-size: 12px; letter-spacing: 0.05em; margin-top: 1px; }
    .sig-for strong { font-family: 'Goldenbook', serif; color: #5b3a8e; letter-spacing: 0.09em; }
    .sig-space { height: 36px; }
    .sig-role { font-family: 'Goldenbook', serif; font-size: 12.5px; color: #5b3a8e; letter-spacing: 0.04em; }
    .sig-company { font-size: 11.5px; margin-top: 1px; }

    /* ---------- Page 3: summary ---------- */
    .summary-title {
      font-family: 'Goldenbook', serif;
      font-size: 31px;
      font-weight: 700;
      letter-spacing: 0.035em;
      margin: 0 0 16px;
      line-height: 1;
    }
    .summary-meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 34px;
      font-size: 13.2px;
      line-height: 1.46;
    }
    .summary-meta-list { margin-bottom: 18px; }
    .summary-meta-list div { margin-bottom: 5px; }
    .company-name, .billed-name {
      font-family: 'Goldenbook', serif;
      font-size: 17.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.015em;
      margin-bottom: 3px;
    }
    .billed-label { font-family: 'Goldenbook', serif; font-size: 12.5px; font-weight: 700; letter-spacing: 0.05em; margin-bottom: 4px; }
    .summary-rule {
      border-top: 2px solid #B3712D;
      border-bottom: 1px solid #B3712D;
      margin: 18px 0 0;
      padding: 9px 0 8px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      font-family: 'Goldenbook', serif;
      font-size: 14.3px;
      font-weight: 700;
      letter-spacing: 0.055em;
    }
    .summary-rule div:last-child { text-align: right; }
    .summary-scope {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 34px;
      padding: 12px 0 18px;
      font-size: 14px;
      line-height: 1.45;
    }
    .summary-scope div:last-child { text-align: right; }
    .summary-main { flex: 1; display: flex; flex-direction: column; }
    .summary-bottom { margin-top: auto; }
    .summary-lower {
      display: grid;
      grid-template-columns: 1fr 310px;
      gap: 35px;
      align-items: start;
      border-top: 2px solid #B3712D;
      padding-top: 12px;
    }
    .note-label { font-family: 'Goldenbook', serif; font-size: 15px; font-weight: 700; letter-spacing: 0.05em; margin-bottom: 6px; }
    .note-text { font-size: 13px; line-height: 1.45; min-height: 18px; }
    .totals { font-size: 13.8px; }
    .total-row { display: flex; justify-content: space-between; padding: 4px 12px; }
    .total-row .label { font-family: 'Goldenbook', serif; font-weight: 700; letter-spacing: 0.05em; }
    .total-row .value { font-variant-numeric: tabular-nums; }
    .total-row.grand {
      background: #C6AD8D;
      padding: 10px 12px;
      margin-top: 4px;
      font-family: 'Goldenbook', serif;
      font-weight: 700;
      font-size: 15px;
      letter-spacing: 0.06em;
    }
    .summary-bottom-grid {
      display: grid;
      grid-template-columns: 1fr 300px;
      gap: 36px;
      align-items: end;
      margin-top: 28px;
    }
    .bank-details { font-size: 13px; line-height: 1.48; }
    .bank-title { font-family: 'Goldenbook', serif; font-size: 15.5px; font-weight: 700; letter-spacing: 0.05em; margin-bottom: 4px; }
    .summary-signature { text-align: right; }
    .summary-signature .sig-space { height: 31px; }

    .page-summary .q-footer { border-top: 0; padding-bottom: 0; }
  </style>
</head>
<body>
  <div class="grain-overlay"></div>

  <!-- PAGE 1: COVER LETTER -->
  <section class="page page-letter">
    <div class="page-watermark"><img src="${watermark}" alt=""></div>
    ${quotationHeader(meta.brand)}
    <div class="page-body">
      <div class="letter-body">
        <p class="salutation">${esc(meta.salutation)}</p>
        ${quotationParagraphs(meta.letterBody)}
        <div class="signoff">${quotationParagraphs(meta.letterSignoff)}</div>
      </div>
    </div>
    ${quotationContactFooter()}
  </section>

  <!-- PAGE 2: SCOPE OF WORK -->
  <section class="page page-scope">
    <div class="page-watermark"><img src="${watermark}" alt=""></div>
    ${quotationHeader(meta.brand)}
    <div class="page-body">
      <div class="to-block">
        <div class="to-label">To</div>
        <div class="to-name">${esc(client.companyName || '-')}</div>
        ${addressLines.map((line) => `<div>${esc(line)}</div>`).join('')}
        ${client.email ? `<div>Email: ${esc(client.email)}</div>` : ''}
        ${client.phone ? `<div>Mobile: ${esc(client.phone)}</div>` : ''}
      </div>

      <div class="subject-line"><strong>Subject:</strong> ${esc(meta.subject)}</div>

      <div class="section-rule"><div class="section-title">SCOPE OF WORK</div></div>
      ${meta.scopeIntro ? `<p class="scope-intro">${esc(meta.scopeIntro)}</p>` : ''}
      <ul class="scope-list">
        ${scopeItems.map((item) => `<li>${esc(item)}</li>`).join('')}
      </ul>

      <div class="scope-footer">${quotationSignature()}</div>
    </div>
    ${quotationContactFooter()}
  </section>

  <!-- PAGE 3: QUOTATION SUMMARY -->
  <section class="page page-summary">
    <div class="page-watermark"><img src="${watermark}" alt=""></div>
    ${quotationHeader(meta.brand, 'summary')}
    <div class="page-body summary-main">
      <h1 class="summary-title">QUOTATION</h1>

      <div class="summary-meta-grid">
        <div>
          <div class="summary-meta-list">
            <div>Client Id : ${esc(meta.clientId)}</div>
            <div>Project No : ${esc(meta.projectCode)}</div>
            <div>Date: ${esc(meta.quoteDate)}</div>
          </div>
          <div class="company-name">${COMPANY.legalName}</div>
          <div>${COMPANY.addressLine1}</div>
          <div>${COMPANY.addressLine2}</div>
          <div>${COMPANY.addressLine3}</div>
          <div>info@rudhramenterprises.com</div>
          <div>Mobile: ${COMPANY.contact}</div>
          <div>GST NO: ${COMPANY.gstin}</div>
        </div>
        <div>
          <div class="summary-meta-list" style="margin-bottom:18px;">&nbsp;</div>
          <div class="billed-label">BILLED TO:</div>
          <div class="billed-name">${esc(client.companyName || '-')}</div>
          ${addressLines.map((line) => `<div>${esc(line)}</div>`).join('')}
          <div>Email: ${esc(client.email || '')}</div>
          <div>Mobile: ${esc(client.phone || '')}</div>
          <div>GST NO: ${esc(client.gstNumber || '')}</div>
        </div>
      </div>

      <div class="summary-rule"><div>SCOPE OF WORK</div><div>DELIVERABLES</div></div>
      <div class="summary-scope"><div>${esc(meta.scopeTitle)}</div><div>${esc(meta.deliverables)}</div></div>

      <div class="summary-bottom">
        <div class="summary-lower">
          <div>
            <div class="note-label">NOTE:</div>
            <div class="note-text">${esc(meta.note)}</div>
          </div>
          <div class="totals">
            <div class="total-row"><span class="label">SUBTOTAL</span><span class="value">${fmtPlain(meta.price)}</span></div>
            ${meta.taxAmount > 0 || meta.taxRate > 0 ? `<div class="total-row"><span class="label">GST (${meta.taxRate}%)</span><span class="value">${fmtPlain(meta.taxAmount)}</span></div>` : ''}
            <div class="total-row grand"><span class="label">TOTAL</span><span class="value">${fmtPlain(meta.total)}</span></div>
          </div>
        </div>

        <div class="summary-bottom-grid">
          <div class="bank-details">
            <div class="bank-title">BANK DETAILS</div>
            <div>Bank Name: ${BANK.bankName}</div>
            <div>Account Name: ${BANK.accountHolder}</div>
            <div>Account No: ${BANK.accountNumber}</div>
            <div>IFSC Code: ${BANK.ifscCode}</div>
            <div>GST: ${COMPANY.gstin}</div>
            <div>UPI ID: ${BANK.upiId}</div>
          </div>
          <div class="summary-signature">${quotationSignature()}</div>
        </div>
      </div>
    </div>
  </section>
</body>
</html>`;
};

export const generateQuotationPdf = async (quotation) => {
  const html = generateQuotationHtml(quotation);
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const raw = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
    });
    return Buffer.from(raw);
  } finally {
    await browser.close();
  }
};

/* ============================================================
   PAYMENT RECEIPT
   ============================================================ */
export const generatePaymentReceiptHtml = (payment, invoice) => {
  const client = payment.client || invoice?.client || {};
  const inv = invoice || payment.invoice || {};
  const methodLabels = { upi: 'UPI', bank_transfer: 'Bank Transfer', razorpay: 'Razorpay', stripe: 'Stripe', paypal: 'PayPal', cash: 'Cash' };
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @page { size: A4; margin: 16mm; }
    :root { --copper: #B3712D; --cream: #F6F0DF; --espresso: #3A2415; --sand: #DCC19D; }
    ${APEX_REGULAR_FONT ? `@font-face { font-family: 'Apex New Trial'; src: url(data:font/opentype;base64,${APEX_REGULAR_FONT}) format('opentype'); font-weight: 400; font-style: normal; }` : ''}
    ${APEX_MEDIUM_FONT ? `@font-face { font-family: 'Apex New Trial'; src: url(data:font/opentype;base64,${APEX_MEDIUM_FONT}) format('opentype'); font-weight: 500; font-style: normal; }` : ''}
    ${APEX_MEDIUM_FONT ? `@font-face { font-family: 'Apex New Trial'; src: url(data:font/opentype;base64,${APEX_MEDIUM_FONT}) format('opentype'); font-weight: 600; font-style: normal; }` : ''}
    ${GOLDENBOOK_REGULAR_FONT ? `@font-face { font-family: 'Golden Book'; src: url(data:font/opentype;base64,${GOLDENBOOK_REGULAR_FONT}) format('opentype'); font-weight: 400; font-style: normal; }` : ''}
    ${GOLDENBOOK_BOLD_FONT ? `@font-face { font-family: 'Golden Book'; src: url(data:font/opentype;base64,${GOLDENBOOK_BOLD_FONT}) format('opentype'); font-weight: 700; font-style: normal; }` : ''}
    * { box-sizing: border-box; }
    body { margin: 0; background: #fff; color: var(--espresso); font-family: 'Apex New Trial', 'Apex New', Arial, sans-serif; font-size: 10pt; line-height: 1.45; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .container { max-width: 520px; margin: 0 auto; border: 1px solid var(--sand); border-radius: 18px; overflow: hidden; }
    .header { position: relative; text-align: center; background: var(--cream); border-bottom: 1px solid var(--sand); padding: 26px 28px 22px; }
    .header::before { content: ''; position: absolute; inset: 0 0 auto; height: 6px; background: var(--copper); }
    .header img { height: 50px; max-width: 230px; object-fit: contain; margin: 6px auto 14px; display: block; }
    .receipt-no { color: var(--copper); font-size: 8pt; font-weight: 500; letter-spacing: .12em; text-transform: uppercase; margin-top: 8px !important; }
    .header h1 { font-family: 'Golden Book', 'Golden Book Roman', Georgia, serif; font-size: 23pt; font-weight: 500; letter-spacing: .02em; color: var(--espresso); margin: 0 0 4px; }
    .header p { color: var(--espresso); opacity: .72; margin: 0; font-size: 9pt; }
    .content { padding: 24px 28px 28px; }
    .amount-block { text-align: center; background: var(--espresso); border-radius: 14px; padding: 20px 16px 18px; margin-bottom: 22px; }
    .amount-block .label { color: var(--sand); font-size: 8pt; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; }
    .amount-block .value { font-family: 'Golden Book', 'Golden Book Roman', Georgia, serif; font-size: 27pt; font-weight: 500; color: var(--cream); margin: 5px 0 10px; }
    .badge { display: inline-block; background: var(--copper); color: #fff; padding: 5px 14px; border-radius: 999px; font-size: 8pt; font-weight: 500; letter-spacing: .08em; text-transform: uppercase; }
    .section-title { color: var(--copper); font-family: 'Golden Book', 'Golden Book Roman', Georgia, serif; font-size: 13pt; font-weight: 500; margin: 0 0 8px; }
    .details { width: 100%; border-collapse: collapse; margin: 0 0 22px; }
    .details td { padding: 8px 0; border-bottom: 1px solid var(--sand); vertical-align: top; }
    .details td:first-child { color: var(--espresso); opacity: .62; width: 46%; }
    .details td:last-child { text-align: right; font-weight: 500; overflow-wrap: anywhere; }
    .settlement { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; background: var(--cream); border: 1px solid var(--sand); border-radius: 12px; padding: 14px; margin-top: 6px; }
    .settlement .label { display: block; color: var(--espresso); opacity: .62; font-size: 8pt; text-transform: uppercase; letter-spacing: .08em; }
    .settlement .value { display: block; margin-top: 3px; font-size: 12pt; font-weight: 500; color: var(--espresso); }
    .settlement .balance .value { color: var(--copper); }
    .footer { text-align: center; margin: 0 28px; padding: 18px 0 22px; border-top: 1px solid var(--sand); font-size: 8pt; color: var(--espresso); opacity: .65; }
    .footer p { margin: 3px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      ${RUDHRAM_LOGO_URL ? `<img src="${RUDHRAM_LOGO_URL}" alt="Rudhram" />` : ''}
      <h1>Payment Receipt</h1>
      <p>Rudhram Enterprises Private Limited</p>
      <p class="receipt-no">${esc(payment.receiptNumber || `RCT-${String(payment._id || '').slice(-8).toUpperCase() || 'N/A'}`)}</p>
    </div>
    <div class="content">
      <div class="amount-block">
        <div class="label">Amount Received</div>
        <div class="value">${fmt(payment.amount)}</div>
        <span class="badge">${esc(payment.status || 'completed')}</span>
      </div>
      <h2 class="section-title">Payment details</h2>
      <table class="details">
        <tr><td>Payment purpose</td><td>${({ advance: 'Advance Payment', partial: 'Part Payment', final: 'Final Payment', other: 'Other Payment' })[payment.paymentType] || 'Payment'}</td></tr>
        <tr><td>Payment date</td><td>${fmtDate(payment.paymentDate)}</td></tr>
        <tr><td>Payment method</td><td>${esc(methodLabels[payment.paymentMethod] || payment.paymentMethod || '-')}</td></tr>
        <tr><td>Reference</td><td>${esc(payment.referenceNo || '-')}</td></tr>
        <tr><td>Invoice</td><td>${esc(inv.invoiceNumber || '-')}</td></tr>
        <tr><td>Client ID</td><td>${esc(client.clientId || '-')}</td></tr>
        <tr><td>Project ID</td><td>${esc(inv.project?.projectCode || '-')}</td></tr>
      </table>
      <h2 class="section-title">Settlement summary</h2>
      <div class="settlement">
        <div><span class="label">Invoice total</span><span class="value">${fmt(inv.total)}</span></div>
        <div><span class="label">Paid to date</span><span class="value">${fmt(inv.paidAmount)}</span></div>
        <div class="balance"><span class="label">Balance due</span><span class="value">${fmt(inv.balanceDue)}</span></div>
        <div><span class="label">Collection</span><span class="value">${inv.total > 0 ? `${Math.min(100, Math.round((Number(inv.paidAmount || 0) / Number(inv.total)) * 100))}%` : '0%'}</span></div>
      </div>
    </div>
    <div class="footer">
      <p>This is a computer-generated receipt. No signature required.</p>
      <p>${COMPANY.legalName} | ${COMPANY.email} | ${COMPANY.contact}</p>
    </div>
  </div>
</body>
</html>`;
};

export const generatePaymentReceiptPdf = async (payment, invoice) => {
  const html = generatePaymentReceiptHtml(payment, invoice);
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const raw = await page.pdf({ format: 'A4', margin: { top: '20mm', bottom: '20mm' }, printBackground: true });
    return Buffer.from(raw);
  } finally {
    await browser.close();
  }
};

const maskAccountNumber = (value) => {
  const digits = String(value || '').replace(/\s+/g, '');
  if (!digits) return '-';
  if (digits.length <= 4) return digits;
  return `${'X'.repeat(Math.min(8, digits.length - 4))}${digits.slice(-4)}`;
};

export const generateSalarySlipHtml = (slip) => {
  const periodStart = slip.periodStart ? new Date(slip.periodStart) : null;
  const monthLabel = periodStart && !Number.isNaN(periodStart.getTime())
    ? periodStart.toLocaleString('en-IN', { month: 'long', year: 'numeric' })
    : '-';
  const year = periodStart && !Number.isNaN(periodStart.getTime()) ? periodStart.getFullYear() : '';
  const month = periodStart && !Number.isNaN(periodStart.getTime()) ? String(periodStart.getMonth() + 1).padStart(2, '0') : '';
  const slipNumber = `SAL-${year}${month}-${slip.employeeId || String(slip._id || '').slice(-6).toUpperCase() || 'N/A'}`;
  const days = (value) => (Number(value) || 0).toLocaleString('en-IN', { maximumFractionDigits: 1 });
  const amountInWords = numberToIndianWords(slip.netPay);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Salary Slip - ${esc(slip.employeeName)} - ${esc(monthLabel)}</title>
  <style>
    @page { size: A4; margin: 14mm; }
    :root { --copper: #B3712D; --cream: #F6F0DF; --espresso: #3A2415; --sand: #DCC19D; }
    ${APEX_REGULAR_FONT ? `@font-face { font-family: 'Apex New Trial'; src: url(data:font/opentype;base64,${APEX_REGULAR_FONT}) format('opentype'); font-weight: 400; }` : ''}
    ${APEX_MEDIUM_FONT ? `@font-face { font-family: 'Apex New Trial'; src: url(data:font/opentype;base64,${APEX_MEDIUM_FONT}) format('opentype'); font-weight: 500; }` : ''}
    ${GOLDENBOOK_REGULAR_FONT ? `@font-face { font-family: 'Golden Book'; src: url(data:font/opentype;base64,${GOLDENBOOK_REGULAR_FONT}) format('opentype'); font-weight: 400; }` : ''}
    ${GOLDENBOOK_BOLD_FONT ? `@font-face { font-family: 'Golden Book'; src: url(data:font/opentype;base64,${GOLDENBOOK_BOLD_FONT}) format('opentype'); font-weight: 700; }` : ''}
    * { box-sizing: border-box; }
    body { margin: 0; color: var(--espresso); font-family: 'Apex New Trial', Arial, sans-serif; font-size: 10pt; line-height: 1.45; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .container { border: 1px solid var(--sand); border-radius: 16px; overflow: hidden; }
    .header { position: relative; display: flex; justify-content: space-between; gap: 20px; background: var(--cream); border-bottom: 1px solid var(--sand); padding: 24px 28px 20px; }
    .header::before { content: ''; position: absolute; inset: 0 0 auto; height: 6px; background: var(--copper); }
    .header img { height: 46px; max-width: 210px; object-fit: contain; display: block; margin-bottom: 10px; }
    .header h1 { margin: 0; font-family: 'Golden Book', Georgia, serif; font-size: 24pt; font-weight: 500; letter-spacing: .03em; }
    .header p { margin: 2px 0; opacity: .72; }
    .header .right { text-align: right; min-width: 180px; }
    .header .right .label { color: var(--copper); font-size: 8pt; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
    .header .right .value { font-size: 12pt; font-weight: 500; }
    .content { padding: 22px 28px 26px; }
    .section-title { color: var(--copper); font-family: 'Golden Book', Georgia, serif; font-size: 13pt; font-weight: 500; margin: 18px 0 8px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 24px; }
    .row { display: flex; justify-content: space-between; gap: 16px; padding: 7px 0; border-bottom: 1px solid var(--sand); }
    .row .label { opacity: .62; }
    .row .value { font-weight: 500; text-align: right; }
    table { width: 100%; border-collapse: collapse; }
    th { background: var(--espresso); color: var(--cream); text-align: left; padding: 9px 12px; font-size: 8.5pt; letter-spacing: .08em; text-transform: uppercase; }
    th:last-child, td:last-child { text-align: right; }
    td { padding: 9px 12px; border-bottom: 1px solid var(--sand); }
    .total td { background: var(--cream); font-weight: 700; }
    .net { display: flex; justify-content: space-between; align-items: center; gap: 18px; background: var(--espresso); color: var(--cream); border-radius: 12px; padding: 16px 18px; margin-top: 16px; }
    .net .label { color: var(--sand); font-size: 8pt; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
    .net .amount { font-family: 'Golden Book', Georgia, serif; font-size: 23pt; }
    .words { margin-top: 8px; font-size: 9pt; opacity: .78; }
    .footer { border-top: 1px solid var(--sand); padding: 14px 28px 18px; font-size: 8pt; opacity: .65; text-align: center; }
    .footer p { margin: 3px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <img src="${RUDHRAM_LOGO_BASE64 ? `data:image/png;base64,${RUDHRAM_LOGO_BASE64}` : RUDHRAM_LOGO_URL}" alt="Rudhram" />
        <h1>Salary Slip</h1>
        <p>${esc(COMPANY.legalName)}</p>
        <p>${esc(monthLabel)}</p>
      </div>
      <div class="right">
        <div class="label">Slip Number</div>
        <div class="value">${esc(slipNumber)}</div>
        <div class="label" style="margin-top:10px;">Status</div>
        <div class="value">${esc(slip.status || 'draft')}</div>
        <div class="label" style="margin-top:10px;">Employee ID</div>
        <div class="value">${esc(slip.employeeId || '-')}</div>
      </div>
    </div>
    <div class="content">
      <h2 class="section-title">Employee details</h2>
      <div class="grid">
        <div>
          <div class="row"><span class="label">Name</span><span class="value">${esc(slip.employeeName)}</span></div>
          <div class="row"><span class="label">Designation</span><span class="value">${esc(slip.designation || '-')}</span></div>
          <div class="row"><span class="label">Date of joining</span><span class="value">${fmtDate(slip.dateOfJoining)}</span></div>
        </div>
        <div>
          <div class="row"><span class="label">Email</span><span class="value">${esc(slip.employeeEmail || '-')}</span></div>
          <div class="row"><span class="label">Pay period</span><span class="value">${fmtDate(slip.periodStart)} - ${fmtDate(slip.periodEnd)}</span></div>
          <div class="row"><span class="label">Payroll days</span><span class="value">${days(slip.payrollDays)}</span></div>
        </div>
      </div>

      <h2 class="section-title">Attendance summary</h2>
      <div class="grid">
        <div>
          <div class="row"><span class="label">Present</span><span class="value">${days(slip.presentDays)}</span></div>
          <div class="row"><span class="label">Work from home</span><span class="value">${days(slip.wfhDays)}</span></div>
          <div class="row"><span class="label">Paid leave</span><span class="value">${days(slip.paidLeaveDays)}</span></div>
          <div class="row"><span class="label">Half days</span><span class="value">${days(slip.halfDays)}</span></div>
        </div>
        <div>
          <div class="row"><span class="label">Absent</span><span class="value">${days(slip.absentDays)}</span></div>
          <div class="row"><span class="label">LOP days</span><span class="value">${days(slip.lopDays)}</span></div>
          <div class="row"><span class="label">Paid days</span><span class="value">${days(slip.paidDays)}</span></div>
          <div class="row"><span class="label">Missing attendance</span><span class="value">${days(slip.missingDays)}</span></div>
        </div>
      </div>

      <h2 class="section-title">Earnings and deductions</h2>
      <table>
        <thead><tr><th>Earnings</th><th>Amount</th><th>Deductions</th><th>Amount</th></tr></thead>
        <tbody>
          <tr><td>Monthly gross salary</td><td>${fmt(slip.grossEarnings)}</td><td>Loss of pay</td><td>${fmt(slip.lopDeduction)}</td></tr>
          <tr><td>Per day rate</td><td>${fmt(slip.perDayRate)}</td><td>Pre-joining days</td><td>${fmt(slip.preJoiningDeduction)}</td></tr>
          <tr><td></td><td></td><td>Leaving days</td><td>${fmt(slip.leavingDeduction)}</td></tr>
          <tr><td></td><td></td><td>Other deductions</td><td>${fmt(slip.otherDeductions)}</td></tr>
          <tr class="total"><td>Gross earnings</td><td>${fmt(slip.grossEarnings)}</td><td>Total deductions</td><td>${fmt(slip.totalDeductions)}</td></tr>
        </tbody>
      </table>

      <div class="net">
        <div>
          <div class="label">Net pay</div>
          <div class="amount">${fmt(slip.netPay)}</div>
        </div>
        <div class="label">${esc(slip.paidDays)} paid day(s)</div>
      </div>
      <div class="words">Amount in words: ${esc(amountInWords)}</div>

      <h2 class="section-title">Bank details</h2>
      <div class="grid">
        <div class="row"><span class="label">Bank</span><span class="value">${esc(slip.bankName || '-')}</span></div>
        <div class="row"><span class="label">Account</span><span class="value">${esc(maskAccountNumber(slip.bankAccountNumber))}</span></div>
        <div class="row"><span class="label">IFSC</span><span class="value">${esc(slip.ifscCode || '-')}</span></div>
      </div>
      ${slip.issues?.length ? `<div class="words">Open issues: ${esc(slip.issues.join('; '))}</div>` : ''}
    </div>
    <div class="footer">
      <p>This is a computer-generated salary slip.</p>
      <p>${esc(COMPANY.legalName)} | ${esc(COMPANY.email)} | ${esc(COMPANY.contact)}</p>
    </div>
  </div>
</body>
</html>`;
};

export const generateSalarySlipPdf = async (slip) => {
  const html = generateSalarySlipHtml(slip);
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const raw = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true });
    return Buffer.from(raw);
  } finally {
    await browser.close();
  }
};
