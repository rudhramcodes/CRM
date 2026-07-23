import puppeteer from 'puppeteer';

// Parent company logo — paste your Rudhram wordmark cloudinary URL here
const RUDHRAM_LOGO_URL = 'https://res.cloudinary.com/dvsrgdyi7/image/upload/v1784621259/rudhram-logo.png'; // TODO: replace with actual Rudhram wordmark logo url

const VENTURES = {
  panigrahna: { code: 'PG', logoUrl: 'https://res.cloudinary.com/dvsrgdyi7/image/upload/v1784704090/pg-logo-with-name.png', template: 'classic-bordered' },
  aghori:     { code: 'AG', logoUrl: 'https://res.cloudinary.com/dvsrgdyi7/image/upload/v1784535471/ag-logo.avif', template: 'classic-bordered' },
  house_of_joggi:             { code: 'HG', logoUrl: '', template: 'warm' },
  damrru:                     { code: 'DM', logoUrl: '', template: 'warm' },
  tandavs:                    { code: 'TD', logoUrl: '', template: 'warm' },
  kapaalik:                   { code: 'KP', logoUrl: '', template: 'warm' },
  kalyannam:                  { code: 'KL', logoUrl: '', template: 'warm' },
  storage_media_solution:     { code: 'SM', logoUrl: '', template: 'warm' },
};

const CLASSIC_THEMES = {
  aghori: { pageBg: '#fff', headBg: '#D4E7F7', text: '#000', accent: '#09588E', border: '#000' },
  panigrahna: { pageBg: '#fff', headBg: '#FEF6EA', text: '#3C2B1B', accent: '#3C2B1B', border: '#3C2B1B' },
};

// Shared registered company details (parent legal entity issuing all venture invoices)
const COMPANY = {
  legalName: 'RUDHRAM ENTERPRISES PRIVATE LIMITED',
  cin: 'U59111MH2026PTC470019',
  pan: 'AAPCR7787R',
  tan: 'MUMR56059D',
  gstin: '27CYSPG6483K1ZK',
  companyType: 'Private Limited Company',
  email: 'Admin@rudhramenterprises.com',
  contact: '7285833101',
  signatoryLine1: 'For.',
  signatoryLine2: 'Rudhram Enterprises pvt. ltd',
};

const BANK = { bankName: 'HDFC Bank', accountHolder: 'Rudhram Entertainment', accountType: 'Current Account', accountNumber: '50200095934904', ifscCode: 'HDFC0006679', upiId: '7285833101@hdfcbank' };
const ADDR = { headOffice: '1171-1172, Solitaire Corporate Park, Andheri Ghatkopar Link Road, Chakala, Nr Technopolis Knowledge Park, Andheri (E), Mumbai, Maharashtra 400093', operationsOffice: 'HG1, SNS Platina, Near Someshwara Enclave, Vesu, Surat, Gujarat - 395007' };

const esc = (s) => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const fmt = (val) => `\u20B9${(val || 0).toFixed(2)}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';

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

/* ============================================================
   TEMPLATE 1: "classic-bordered" — exact match of Aghhori PDF
   ============================================================ */
const buildClassicBorderedHtml = (invoice) => {
  const client = invoice.client || {};
  const items = invoice.items || [];
  const venture = VENTURES[client.brand] || VENTURES.aghori;
  const theme = CLASSIC_THEMES[client.brand] || CLASSIC_THEMES.aghori;
  const isPanigrahna = client.brand === 'panigrahna';
  const BORDER = theme.border;
  const HEAD_BG = theme.headBg;
  const date = (d) => d ? fmtDate(d) : '';
  const amount = (val, zero = '0,00,000') => Number(val || 0)
    ? Number(val).toLocaleString('en-IN', { maximumFractionDigits: 2 })
    : zero;

  // pad items to at least 3 rows so empty grid lines show like the template
  const rows = [...items];
  while (rows.length < 3) rows.push(null);

  const itemsHtml = rows.map((item, i) => `
    <tr class="item-row">
      <td>${item ? i + 1 : ''}</td>
      <td${isPanigrahna ? ' colspan="3"' : ''}>${item ? esc(item.description) : ''}</td>
      ${isPanigrahna ? '' : `<td>${item ? item.quantity : ''}</td><td>${item ? amount(item.unitPrice, '') : ''}</td>`}
      <td>${item ? amount(item.amount, '') : ''}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @page { size: 8.5in 11in; margin: 0; }
    * { box-sizing: border-box; }
    body { margin: 0; color: ${theme.text}; font-family: Arial, Helvetica, sans-serif; font-size: 9.5pt; line-height: 1.15; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { width: 100%; max-width: 612pt; margin: 0 auto; padding: 20pt 72pt 22pt; background: ${theme.pageBg}; }
    .logos { display: flex; justify-content: space-between; align-items: flex-start; height: 52pt; }
    .rudhram-logo { height: 52pt; width: auto; object-fit: contain; }
    .venture-logo { height: 52pt; width: auto; object-fit: contain; }
    .company-row { display: flex; justify-content: space-between; margin-top: 38pt; margin-bottom: 34pt; font-size: 9.5pt; line-height: 1.16; }
    .contact { width: 177pt; }
    table { border-collapse: collapse; width: 100%; table-layout: fixed; }
    .invoice-table { border: 1pt solid ${BORDER}; font-size: 12pt; }
    .invoice-table td { border: 1pt solid ${BORDER}; padding: 0 5pt; vertical-align: middle; }
    .title { height: 38pt; background: ${HEAD_BG}; color: ${theme.accent}; text-align: center; font-size: 12.5pt; text-decoration: underline; }
    .to-cell { height: 105pt; vertical-align: top !important; padding-top: 9pt !important; }
    .meta-label, .meta-value { height: 26.25pt; font-size: 12pt; font-weight: 400; }
    .service-head td { height: 41.5pt; background: ${HEAD_BG}; text-align: center; font-size: 12pt; }
    .item-row td { height: 32pt; }
    .item-row td:nth-child(1), .item-row td:nth-child(3), .item-row td:nth-child(4), .item-row td:nth-child(5) { text-align: center; }
    .total-row td { height: 26.5pt; font-size: 12pt; font-weight: 400; }
    .total-label { text-align: right; padding-right: 12pt !important; }
    .total-value { text-align: center; }
    .net td { background: ${HEAD_BG}; }
    .words td { height: 37pt; font-size: 12pt; }
    .words .currency { display: inline-block; width: 26pt; font-weight: 700; }
    .words .gap { display: inline-block; width: 66pt; }
    .bank-sign { display: flex; justify-content: space-between; margin-top: 1pt; font-size: 11pt; line-height: 1.28; }
    .sign { width: 205pt; padding-top: 28pt; }
    .addresses { margin-top: 16pt; font-size: 8pt; line-height: 1.15; }
    .office { margin-top: 13pt; }
    @media print {
      html, body { width: 8.5in; height: 11in; overflow: hidden; }
      .page { width: 612pt; height: 792pt; max-width: none; margin: 0; padding: 12pt 40pt 0; }
      .company-row { margin-top: 22pt; margin-bottom: 22pt; }
      .sign { padding-top: 18pt; }
      .addresses { margin-top: 6pt; }
      .office { margin-top: 8pt; }
    }
  </style>
</head>
<body>
<div class="page">

  <!-- HEADER: two logos -->
  <div class="logos">
    <div>
      ${RUDHRAM_LOGO_URL
        ? `<img src="${RUDHRAM_LOGO_URL}" class="rudhram-logo" />`
        : `<div style="font-size:26px;font-weight:700;letter-spacing:3px;color:#8a6a3a">RUDHRAM<span style="color:#8a6a3a">.</span></div>`
      }
    </div>
    <div>
      ${venture.logoUrl
        ? `<img src="${venture.logoUrl}" class="venture-logo" />`
        : `<div style="font-size:22px;font-weight:700;letter-spacing:4px;color:#333">${esc(venture.code)}</div>`
      }
    </div>
  </div>

  <!-- COMPANY DETAILS -->
  <div class="company-row">
    <div>
      <div>${COMPANY.legalName}</div>
      <div>CIN: ${COMPANY.cin}</div>
      <div>PAN: ${COMPANY.pan}</div>
      <div>TAN: ${COMPANY.tan}</div>
      <div>GSTIN: ${COMPANY.gstin}</div>
      <div>Company Type: ${COMPANY.companyType}</div>
    </div>
    <div class="contact">
      <div>Email: ${COMPANY.email}</div>
      <div>Contact: ${COMPANY.contact}</div>
    </div>
  </div>

  <!-- INVOICE GRID -->
  <table class="invoice-table">
    <colgroup>
      <col style="width:43.5pt" />
      <col style="width:206pt" />
      <col style="width:38.5pt" />
      <col style="width:75pt" />
      <col style="width:105pt" />
    </colgroup>
    <tr>
      <td colspan="5" class="title">INVOICE</td>
    </tr>
    <tr>
      <td rowspan="4" colspan="3" class="to-cell">
        To,<br/><br/>
        ${client.companyName ? `${esc(client.companyName)}<br/>` : ''}
        ${client.contactPerson ? esc(client.contactPerson) + '<br/>' : ''}
        ${client.email ? esc(client.email) + '<br/>' : ''}
        ${client.gstNumber ? 'GST: ' + esc(client.gstNumber) : ''}
      </td>
      <td class="meta-label">Client ID</td>
      <td class="meta-value">${esc(client.clientId) || ''}</td>
    </tr>
    <tr>
      <td class="meta-label">Invoice No</td>
      <td class="meta-value">${esc(invoice.invoiceNumber) || ''}</td>
    </tr>
    <tr>
      <td class="meta-label">Date</td>
      <td class="meta-value">${date(invoice.issueDate)}</td>
    </tr>
    <tr>
      <td class="meta-label">Due Date</td>
      <td class="meta-value">${date(invoice.dueDate)}</td>
    </tr>

    <tr class="service-head">
      <td>Sr.<br/>No</td>
      <td${isPanigrahna ? ' colspan="3"' : ''}>${isPanigrahna ? 'Description' : 'Services'}</td>
      ${isPanigrahna ? '' : '<td>Qty</td><td>Rate</td>'}
      <td>Amount</td>
    </tr>
    ${itemsHtml}

    <tr class="total-row">
      <td colspan="4" class="total-label">Total</td>
      <td class="total-value">${amount(invoice.subtotal)}</td>
    </tr>
    ${invoice.taxAmount ? `
    <tr class="total-row">
      <td colspan="4" class="total-label">Taxes${invoice.taxRate ? ' (' + invoice.taxRate + '%)' : ''}</td>
      <td class="total-value">${amount(invoice.taxAmount, '00,000')}</td>
    </tr>` : `
    <tr class="total-row">
      <td colspan="4" class="total-label">Taxes</td>
      <td class="total-value">${amount(0, '00,000')}</td>
    </tr>`}
    ${invoice.discountAmount ? `
    <tr class="total-row">
      <td colspan="4" class="total-label">Discount${invoice.discountPercent ? ' (' + invoice.discountPercent + '%)' : ''}</td>
      <td class="total-value">-${amount(invoice.discountAmount, '00,000')}</td>
    </tr>` : ''}
    <tr class="total-row net">
      <td colspan="4" class="total-label">Net Payable</td>
      <td class="total-value">${amount(invoice.total)}</td>
    </tr>
    ${invoice.paidAmount > 0 ? `
    <tr class="total-row">
      <td colspan="4" class="total-label">Paid</td>
      <td class="total-value">-${amount(invoice.paidAmount, '00,000')}</td>
    </tr>
    <tr class="total-row">
      <td colspan="4" class="total-label">Balance Due</td>
      <td class="total-value">${amount(invoice.balanceDue)}</td>
    </tr>` : ''}

    <tr class="words">
      <td colspan="5">
        <span class="currency">\u20B9</span>${invoice.total ? numberToIndianWords(invoice.total) : `Lakhs <span class="gap"></span>Thousands <span class="gap"></span>Hundreds Only`}
      </td>
    </tr>
  </table>

  <!-- BANK DETAILS + SIGNATORY -->
  <div class="bank-sign">
    <div>
      <div>Bank Name: ${BANK.bankName}</div>
      <div>Account Holder: ${BANK.accountHolder}</div>
      <div>Account Type: ${BANK.accountType}</div>
      <div>Account Number: ${BANK.accountNumber}</div>
      <div>IFSC Code: ${BANK.ifscCode}</div>
      <div>UPI ID: ${BANK.upiId}</div>
    </div>
    <div class="sign">
      <div>${COMPANY.signatoryLine1}</div>
      <div>${COMPANY.signatoryLine2}</div>
    </div>
  </div>

  <!-- ADDRESSES -->
  <div class="addresses">
    <div>Head Office:</div>
    <div>${ADDR.headOffice}</div>
    <div class="office">Operational Office:</div>
    <div>${ADDR.operationsOffice}</div>
  </div>

</div>
</body>
</html>`;
};

/* ============================================================
   TEMPLATE 2: "warm" — your original bronze/rounded layout
   ============================================================ */
const buildWarmHtml = (invoice) => {
  const client = invoice.client || {};
  const items = invoice.items || [];
  const venture = VENTURES[client.brand] || VENTURES.panigrahna;
  const brand = '#B3752F';

  const itemsHtml = items.map((item, i) => `
    <tr>
      <td style="padding:6px 8px;border-bottom:1px solid #e8ddd0;color:#8b7355;text-align:center;width:36px">${i + 1}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e8ddd0;color:#2c1810">${esc(item.description)}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e8ddd0;color:#2c1810;text-align:right">${item.quantity}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e8ddd0;color:#2c1810;text-align:right">${fmt(item.unitPrice)}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e8ddd0;color:#2c1810;text-align:right;font-weight:600">${fmt(item.amount)}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    @page { margin: 20px 30px; }
    * { box-sizing: border-box; }
    body { font-family: 'Inter', 'Arial', sans-serif; color: #2c1810; margin: 0; padding: 0; font-size: 10.5px; line-height: 1.35; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    table { border-collapse: collapse; width: 100%; }
  </style>
</head>
<body>
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px;padding-bottom:14px;border-bottom:2px solid ${brand}">
    <div>
      ${venture.logoUrl
        ? `<img src="${venture.logoUrl}" style="height:44px;width:auto;object-fit:contain" />`
        : `<div style="width:44px;height:44px;border-radius:6px;display:flex;align-items:center;justify-content:center;background:${brand};color:#fff;font-size:10px;font-weight:700">${venture.code}</div>`
      }
    </div>
    <div style="text-align:right">
      <div style="font-size:24px;font-weight:700;color:${brand};letter-spacing:2px">INVOICE</div>
    </div>
  </div>

  <div style="display:flex;gap:24px;margin-bottom:18px">
    <div style="flex:1">
      <div style="font-size:10.5px;font-weight:600;color:${brand};text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Bill To</div>
      <div style="font-size:14px;font-weight:600;color:#2c1810;margin-bottom:2px">${esc(client.companyName) || '-'}</div>
      <div style="font-size:12px;color:#4a3f35;line-height:1.5">
        ${client.contactPerson ? esc(client.contactPerson) + '<br>' : ''}
        ${esc(client.email) || ''}
        ${client.gstNumber ? '<br>GST: ' + esc(client.gstNumber) : ''}
      </div>
      <div style="font-size:10.5px;color:#8b7355;margin-top:2px">Client ID: ${esc(client.clientId) || '-'}</div>
    </div>
    <div style="text-align:right;font-size:12px;line-height:1.8">
      <div><span style="color:#b3752f">Invoice No : </span><span style="color:#2c1810;font-weight:600">${esc(invoice.invoiceNumber)}</span></div>
      <div><span style="color:#b3752f">Date : </span><span style="color:#2c1810">${fmtDate(invoice.issueDate)}</span></div>
      <div><span style="color:#b3752f">Due Date : </span><span style="color:#2c1810">${fmtDate(invoice.dueDate)}</span></div>
    </div>
  </div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
    <thead>
      <tr style="background:${brand};color:#fff">
        <th style="padding:8px;text-align:left;font-size:10.5px;font-weight:500;text-transform:uppercase;letter-spacing:1px;width:36px">Sr. No.</th>
        <th style="padding:8px;text-align:left;font-size:10.5px;font-weight:500;text-transform:uppercase;letter-spacing:1px">Services</th>
        <th style="padding:8px;text-align:right;font-size:10.5px;font-weight:500;text-transform:uppercase;letter-spacing:1px;width:64px">Quantity</th>
        <th style="padding:8px;text-align:right;font-size:10.5px;font-weight:500;text-transform:uppercase;letter-spacing:1px;width:88px">Rate</th>
        <th style="padding:8px;text-align:right;font-size:10.5px;font-weight:500;text-transform:uppercase;letter-spacing:1px;width:88px">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>

  <div style="display:flex;justify-content:flex-end;margin-bottom:16px">
    <div style="width:260px">
      <div style="display:flex;justify-content:space-between;font-size:12px;padding:2px 0">
        <span style="color:#8b7355">Subtotal</span>
        <span style="color:#2c1810">${fmt(invoice.subtotal)}</span>
      </div>
      ${invoice.taxRate > 0 ? `
      <div style="display:flex;justify-content:space-between;font-size:12px;padding:2px 0">
        <span style="color:#8b7355">GST (${invoice.taxRate}%)</span>
        <span style="color:#2c1810">${fmt(invoice.taxAmount)}</span>
      </div>` : ''}
      ${invoice.discountPercent > 0 ? `
      <div style="display:flex;justify-content:space-between;font-size:12px;padding:2px 0">
        <span style="color:#8b7355">Discount (${invoice.discountPercent}%)</span>
        <span style="color:#b3752f">-${fmt(invoice.discountAmount)}</span>
      </div>` : ''}
      <hr style="border:none;border-top:1.5px solid ${brand};margin:2px 0" />
      <div style="display:flex;justify-content:space-between;font-size:16px;font-weight:700;color:${brand};padding-top:2px">
        <span>Total</span>
        <span>${fmt(invoice.total)}</span>
      </div>
      <div style="text-align:right;font-size:10.5px;font-style:italic;color:#8b7355;padding-top:2px">${numberToIndianWords(invoice.total)}</div>
      ${invoice.paidAmount > 0 ? `
      <div style="display:flex;justify-content:space-between;font-size:12px;padding:2px 0;color:#588157;margin-top:2px">
        <span>Paid</span>
        <span>-${fmt(invoice.paidAmount)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:600;color:${brand};padding:2px 0">
        <span>Balance Due</span>
        <span>${fmt(invoice.balanceDue)}</span>
      </div>` : ''}
    </div>
  </div>

  <div style="border-top:2px solid ${brand};padding-top:12px;margin-bottom:12px">
    <div style="font-size:12px;font-weight:700;color:${brand};margin-bottom:4px">Bank Details</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 24px;font-size:12px;color:#4a3f35">
      <div><span style="color:#8b7355">Bank Name :</span> ${BANK.bankName}</div>
      <div><span style="color:#8b7355">Account Holder :</span> ${BANK.accountHolder}</div>
      <div><span style="color:#8b7355">Account Type :</span> ${BANK.accountType}</div>
      <div><span style="color:#8b7355">Account Number :</span> ${BANK.accountNumber}</div>
      <div><span style="color:#8b7355">IFSC Code :</span> ${BANK.ifscCode}</div>
      <div><span style="color:#8b7355">UPI ID :</span> ${BANK.upiId}</div>
    </div>
  </div>

  // ${invoice.notes ? `
  // <div style="margin-bottom:12px;font-size:12px;color:#4a3f35">
  //   <div style="font-size:10.5px;color:${brand};margin-bottom:2px;font-weight:600">Notes:</div>
  //   <div style="white-space:pre-wrap">${esc(invoice.notes)}</div>
  // </div>` : ''}

  <div style="border-top:2px solid ${brand};padding-top:8px;margin-top:8px;font-size:10.5px;color:#8b7355;line-height:1.5">
    <div><span style="color:${brand};font-weight:600">Head Office :</span> ${ADDR.headOffice}</div>
    <div><span style="color:${brand};font-weight:600">Operations Office :</span> ${ADDR.operationsOffice}</div>
  </div>
</body>
</html>`;
};

/* ============================================================
   DISPATCHER
   ============================================================ */
const buildHtml = (invoice) => {
  const client = invoice.client || {};
  const venture = VENTURES[client.brand] || VENTURES.panigrahna;
  switch (venture.template) {
    case 'classic-bordered':
      return buildClassicBorderedHtml(invoice);
    case 'warm':
    default:
      return buildWarmHtml(invoice);
  }
};

export const generateInvoiceHtml = (invoice) => buildHtml(invoice);

export const generateInvoicePdf = async (invoice) => {
  const client = invoice.client || {};
  const venture = VENTURES[client.brand] || VENTURES.panigrahna;
  const html = buildHtml(invoice);
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const isClassic = venture.template === 'classic-bordered';
    const raw = await page.pdf({
      ...(isClassic
        ? { width: '8.5in', height: '11in', margin: { top: '0', bottom: '0', left: '0', right: '0' } }
        : { format: 'A4', margin: { top: '30px', bottom: '30px', left: '40px', right: '40px' } }),
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
    @page { size: A4; margin: 20mm; }
    body { font-family: Arial, sans-serif; color: #1a1a1a; font-size: 10pt; line-height: 1.5; }
    .container { max-width: 500px; margin: 0 auto; }
    .header { text-align: center; border-bottom: 2px solid #e5e7eb; padding-bottom: 16px; margin-bottom: 24px; }
    .header h1 { font-size: 18pt; color: #1a1a1a; margin: 0 0 4px; }
    .header p { color: #6b7280; margin: 0; font-size: 9pt; }
    .badge { display: inline-block; background: #059669; color: #fff; padding: 4px 12px; border-radius: 4px; font-size: 8pt; }
    .amount-block { text-align: center; padding: 24px 0; }
    .amount-block .label { font-size: 8pt; color: #6b7280; text-transform: uppercase; }
    .amount-block .value { font-size: 22pt; font-weight: bold; color: #059669; margin: 4px 0; }
    .details { width: 100%; border-collapse: collapse; margin: 16px 0; }
    .details td { padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
    .details td:first-child { color: #6b7280; width: 120px; }
    .details td:last-child { text-align: right; font-weight: 500; }
    .footer { text-align: center; margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 8pt; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Payment Receipt</h1>
      <p>Rudhram Enterprises Private Limited</p>
    </div>
    <div class="amount-block">
      <div class="label">Amount Paid</div>
      <div class="value">${fmt(payment.amount)}</div>
      <span class="badge">${payment.status.toUpperCase()}</span>
    </div>
    <table class="details">
      <tr><td>Receipt No.</td><td>RCT-${String(payment._id || '').slice(-8).toUpperCase() || 'N/A'}</td></tr>
      <tr><td>Payment Date</td><td>${fmtDate(payment.paymentDate)}</td></tr>
      <tr><td>Payment Method</td><td>${methodLabels[payment.paymentMethod] || payment.paymentMethod}</td></tr>
      <tr><td>Reference</td><td>${payment.referenceNo || '-'}</td></tr>
      <tr><td>Invoice</td><td>${inv.invoiceNumber || '-'}</td></tr>
      <tr><td>Client</td><td>${esc(client.companyName || client.contactPerson || 'N/A')}</td></tr>
    </table>
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
