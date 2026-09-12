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
const PAPER_GRAIN_TILE_BASE64 = loadAssetBase64('../../assets/paper-grain-tile.png');

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
  house_of_joggi:         { code: 'HG', name: 'HOUSE OF JOGGI' },
  damrru:                 { code: 'DM', name: 'DAMRRU' },
  tandavs:                { code: 'TD', name: 'TANDAVS' },
  kapaalik:               { code: 'KP', name: 'KAPAALIK' },
  kalyannam:              { code: 'KL', name: 'KALYANNAM' },
  storage_media_solution: { code: 'SM', name: 'STORAGE MEDIA SOLUTION' },
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
      font-family: 'Californian FB', Georgia, serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .invoice-page {
      position: relative;
      width: 794px;
      min-height: 1123px;
      margin: 0 auto;
      padding: 44px 52px 40px;
      background-color: #FAF6F0;
      background-image: url('data:image/png;base64,${PAPER_GRAIN_TILE_BASE64}');
      background-repeat: repeat;
      overflow: hidden;
    }

    /* Centered watermark behind table */
    .watermark-bg {
      position: absolute;
      top: 54%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 540px;
      opacity: 0.12;
      pointer-events: none;
      z-index: 1;
      text-align: center;
    }
    .watermark-bg .wm-logo {
      height: 240px;
      width: auto;
      display: block;
      margin: 0 auto 4px;
      filter: sepia(100%) hue-rotate(350deg) saturate(250%);
    }
    .watermark-bg .wm-sub {
      font-family: 'Goldenbook', serif;
      font-size: 22px;
      letter-spacing: 0.24em;
      color: #A37038;
      text-transform: lowercase;
      margin-top: 0;
    }

    .content-wrap {
      position: relative;
      z-index: 2;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 1039px;
    }

    /* Top Branding - Centered */
    .top-branding {
      text-align: center;
      margin-bottom: 18px;
    }
    .top-branding .rudhram-logo-full {
      height: 100px;
      width: auto;
      display: block;
      margin: 0 auto 2px;
    }
    .top-branding .rudhram-sub {
      font-family: 'Goldenbook', serif;
      font-size: 13px;
      letter-spacing: 0.22em;
      color: #9E6E38;
      text-transform: lowercase;
      margin-top: 0;
    }

    /* Invoice Meta Row: left = INVOICE + meta, right = venture logo */
    .invoice-meta-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 8px;
    }

    .header-left {
      text-align: left;
    }

    .invoice-heading {
      font-family: 'Goldenbook', serif;
      font-size: 32px;
      font-weight: 700;
      letter-spacing: 0.01em;
      color: #1a1a1a;
      margin: 0 0 10px 0;
      line-height: 1;
    }

    .meta-list {
      font-family: 'Californian FB', serif;
      font-size: 14.5px;
      line-height: 1.55;
      color: #1a1a1a;
    }
    .meta-item {
      display: flex;
    }
    .meta-lbl {
      width: 90px;
      font-weight: 700;
    }

    .header-right {
      text-align: right;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      justify-content: flex-start;
      padding-top: 6px;
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
      margin-bottom: 28px;
      font-family: 'Californian FB', serif;
      font-size: 13.5px;
      line-height: 1.35;
      color: #1a1a1a;
    }

    .company-title {
      font-size: 14.5px;
      font-weight: 700;
      text-transform: uppercase;
      color: #1a1a1a;
      margin-bottom: 2px;
    }

    .billed-label {
      font-family: 'Goldenbook', serif;
      font-size: 12.5px;
      font-weight: 700;
      letter-spacing: 0.06em;
      color: #1a1a1a;
      margin-bottom: 3px;
    }
    .client-name {
      font-size: 15px;
      font-weight: 700;
      text-transform: uppercase;
      color: #1a1a1a;
      margin-bottom: 2px;
    }

    /* Items Table */
    .items-table {
      width: 100%;
      border-collapse: collapse;
    }
    .items-table th {
      font-family: 'Goldenbook', serif;
      font-size: 13.5px;
      font-weight: 700;
      letter-spacing: 0.06em;
      color: #1a1a1a;
      padding: 9px 12px;
      border-top: 1.5px solid #BA8E58;
      border-bottom: 1.5px solid #BA8E58;
    }
    .items-table th.th-desc {
      text-align: left;
    }
    .items-table th.th-amount {
      text-align: right;
    }

    .items-table td {
      font-family: 'Californian FB', serif;
      font-size: 14.5px;
      padding: 10px 12px;
      color: #1a1a1a;
    }
    .items-table td.td-desc {
      text-align: left;
    }
    .items-table td.td-amount {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }

    .items-table tr.last-row td {
      border-bottom: 1.5px solid #BA8E58;
      padding-bottom: 14px;
    }

    /* Notes & Calculation Section */
    .summary-grid {
      display: grid;
      grid-template-columns: 1fr 280px;
      gap: 24px;
      margin-top: 14px;
      align-items: start;
    }

    .notes-box {
      font-family: 'Californian FB', serif;
      font-size: 13.5px;
      line-height: 1.45;
    }
    .notes-box .note-label {
      font-family: 'Goldenbook', serif;
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.05em;
      color: #1a1a1a;
      display: inline-block;
      margin-right: 6px;
    }

    .calc-stack {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    .calc-line {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 2px 12px;
      color: #1a1a1a;
    }
    .calc-line.subtotal-line,
    .calc-line.gst-line {
      font-family: 'Goldenbook', serif;
      font-weight: 700;
      letter-spacing: 0.04em;
      font-size: 13px;
    }
    .calc-line.discount-line {
      font-family: 'Goldenbook', serif;
      font-weight: 700;
      letter-spacing: 0.04em;
      font-size: 13px;
      color: #2e7d32;
    }
    .calc-line .calc-val {
      font-family: 'Californian FB', serif;
      font-size: 14.5px;
      font-weight: 700;
      letter-spacing: 0;
      font-variant-numeric: tabular-nums;
    }

    .total-bar,
    .total-band {
      margin-top: 4px;
      background-color: #C6AD8D !important;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 7px 12px;
      width: 100%;
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .total-bar .lbl,
    .total-band .lbl {
      font-family: 'Goldenbook', serif;
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: #1a1a1a;
    }
    .total-bar .val,
    .total-band .val {
      font-family: 'Californian FB', serif;
      font-size: 15.5px;
      font-weight: 700;
      color: #1a1a1a;
      letter-spacing: 0;
      font-variant-numeric: tabular-nums;
    }

    /* Footer */
    .footer-grid {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 36px;
      padding-top: 10px;
    }

    .bank-box {
      font-family: 'Californian FB', serif;
      font-size: 13px;
      line-height: 1.42;
      color: #1a1a1a;
    }
    .bank-box .bank-title {
      font-family: 'Goldenbook', serif;
      font-size: 13.5px;
      font-weight: 700;
      letter-spacing: 0.06em;
      color: #1a1a1a;
      margin-bottom: 4px;
    }

    .sign-box {
      text-align: right;
      font-family: 'Californian FB', serif;
      color: #1a1a1a;
    }
    .sign-top {
      font-family: 'Goldenbook', serif;
      font-size: 11px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #1a1a1a;
      margin-bottom: 44px;
    }
    .sign-bottom {
      font-family: 'Californian FB', serif;
      font-size: 12.5px;
      color: #1a1a1a;
    }
  </style>
</head>
<body>
  <div class="invoice-page">
    <!-- Center Watermark -->
    <div class="watermark-bg">
      <img src="${RUDHRAM_LOGO_BASE64 ? `data:image/png;base64,${RUDHRAM_LOGO_BASE64}` : RUDHRAM_LOGO_URL}" alt="Watermark" class="wm-logo" />
      <div class="wm-sub">enterprises</div>
    </div>

    <div class="content-wrap">
      <div>
        <!-- Top Branding (Centered) -->
        <div class="top-branding">
          <img src="${RUDHRAM_LOGO_BASE64 ? `data:image/png;base64,${RUDHRAM_LOGO_BASE64}` : RUDHRAM_LOGO_URL}" class="rudhram-logo-full" alt="Rudhram" />
          <div class="rudhram-sub">enterprises</div>
        </div>

        <!-- Invoice Meta + Venture Logo -->
        <div class="invoice-meta-row">
          <div class="header-left">
            <h1 class="invoice-heading">INVOICE</h1>
            <div class="meta-list">
              <div class="meta-item"><span class="meta-lbl">Invoice No.</span> <span>${esc(invoice.invoiceNumber || '-')}</span></div>
              <div class="meta-item"><span class="meta-lbl">Client Id :</span> <span>${esc(client.clientId || '-')}</span></div>
              <div class="meta-item"><span class="meta-lbl">Project No :</span> <span>${esc(invoice.project?.projectNumber || invoice.project?.title || '-')}</span></div>
              <div class="meta-item"><span class="meta-lbl">Date:</span> <span>${fmtDate(invoice.issueDate)}</span></div>
            </div>
          </div>

          <div class="header-right">
            ${ventureLogoHtml}
          </div>
        </div>

        <!-- Parties -->
        <div class="parties-grid">
          <div>
            <div class="company-title">${COMPANY.legalName}</div>
            <div>${COMPANY.addressLine1}</div>
            <div>${COMPANY.addressLine2}</div>
            <div>${COMPANY.addressLine3}</div>
            <div>${COMPANY.email}</div>
            <div>Mobile</div>
            <div>GST NO:</div>
          </div>

          <div>
            <div class="billed-label">BILLED TO:</div>
            <div class="client-name">${esc(client.companyName || client.contactPerson || '-')}</div>
            ${clientAddress.street ? `<div>${esc(clientAddress.street)}</div>` : '<div>Rio Empire 905,</div>'}
            ${clientAddress.city || clientAddress.state
              ? `<div>${esc(clientAddress.city ? `${clientAddress.city}, ` : '')}${esc(clientAddress.state || '')}${clientAddress.pincode ? ` - ${clientAddress.pincode}` : ''}</div>`
              : '<div>Nr. Reliance Mart, Adajan Gam, Pal,</div><div>Surat, Gujarat - 395009</div>'}
            <div>Email ${esc(client.email || '')}</div>
            <div>Mobile ${esc(client.phone || '')}</div>
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
      </div>

      <!-- Footer -->
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
    </div>
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
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
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
        <tr><td>Client</td><td>${esc(client.companyName || client.contactPerson || 'N/A')}</td></tr>
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
