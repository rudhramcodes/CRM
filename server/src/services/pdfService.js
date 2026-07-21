import puppeteer from 'puppeteer';

// Parent company logo — paste your Rudhram wordmark cloudinary URL here
const RUDHRAM_LOGO_URL = 'https://res.cloudinary.com/dvsrgdyi7/image/upload/v1784621259/rudhram-logo.png'; // TODO: replace with actual Rudhram wordmark logo url

const VENTURES = {
  panigrahna: { code: 'PG', logoUrl: 'https://res.cloudinary.com/dvsrgdyi7/image/upload/v1784535274/pg-logo.avif', template: 'warm' },
  aghori:     { code: 'AG', logoUrl: 'https://res.cloudinary.com/dvsrgdyi7/image/upload/v1784535471/ag-logo.avif', template: 'classic-bordered' },
  house_of_joggi:             { code: 'HG', logoUrl: '', template: 'warm' },
  damrru:                     { code: 'DM', logoUrl: '', template: 'warm' },
  tandavs:                    { code: 'TD', logoUrl: '', template: 'warm' },
  kapaalik:                   { code: 'KP', logoUrl: '', template: 'warm' },
  kalyannam:                  { code: 'KL', logoUrl: '', template: 'warm' },
  storage_media_solution:     { code: 'SM', logoUrl: '', template: 'warm' },
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
  const BORDER = '#000';
  const HEAD_BG = '#BDD7EE'; // pale blue used in header/total highlight cells

  // pad items to at least 3 rows so empty grid lines show like the template
  const rows = [...items];
  while (rows.length < 3) rows.push(null);

  const itemsHtml = rows.map((item, i) => `
    <tr>
      <td style="padding:6px 8px;border:1px solid ${BORDER};text-align:center;width:32px">${item ? i + 1 : ''}</td>
      <td style="padding:6px 8px;border:1px solid ${BORDER}">${item ? esc(item.description) : ''}</td>
      <td style="padding:6px 8px;border:1px solid ${BORDER};text-align:right;width:44px">${item ? item.quantity : ''}</td>
      <td style="padding:6px 8px;border:1px solid ${BORDER};text-align:right;width:88px">${item ? fmt(item.unitPrice) : ''}</td>
      <td style="padding:6px 8px;border:1px solid ${BORDER};text-align:right;width:100px">${item ? fmt(item.amount) : ''}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @page { margin: 30px 40px; }
    * { box-sizing: border-box; }
    body { font-family: 'Arial', 'Helvetica', sans-serif; color: #111; margin: 0; padding: 0; font-size: 12px; line-height: 1.5; }
    table { border-collapse: collapse; width: 100%; }
  </style>
</head>
<body>

  <!-- HEADER: two logos -->
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px">
    <div>
      ${RUDHRAM_LOGO_URL
        ? `<img src="${RUDHRAM_LOGO_URL}" style="height:58px;width:auto;object-fit:contain" />`
        : `<div style="font-size:26px;font-weight:700;letter-spacing:3px;color:#8a6a3a">RUDHRAM<span style="color:#8a6a3a">.</span></div>`
      }
    </div>
    <div>
      ${venture.logoUrl
        ? `<img src="${venture.logoUrl}" style="height:58px;width:auto;object-fit:contain" />`
        : `<div style="font-size:22px;font-weight:700;letter-spacing:4px;color:#333">${esc(venture.code)}</div>`
      }
    </div>
  </div>

  <!-- COMPANY DETAILS -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;font-size:12px;line-height:1.7">
    <div>
      <div>${COMPANY.legalName}</div>
      <div>CIN: ${COMPANY.cin}</div>
      <div>PAN: ${COMPANY.pan}</div>
      <div>TAN: ${COMPANY.tan}</div>
      <div>GSTIN: ${COMPANY.gstin}</div>
      <div>Company Type: ${COMPANY.companyType}</div>
    </div>
    <div style="text-align:right">
      <div>Email: ${COMPANY.email}</div>
      <div>Contact: ${COMPANY.contact}</div>
    </div>
  </div>

  <!-- INVOICE GRID -->
  <table style="border:1.5px solid ${BORDER};margin-bottom:0">
    <tr>
      <td colspan="5" style="background:${HEAD_BG};text-align:center;font-size:20px;font-weight:500;text-decoration:underline;padding:10px;border-bottom:1.5px solid ${BORDER}">INVOICE</td>
    </tr>
    <tr>
      <td rowspan="4" colspan="2" style="vertical-align:top;padding:10px 12px;border-right:1.5px solid ${BORDER};border-bottom:1.5px solid ${BORDER}">
        To,<br/><br/>
        ${client.companyName ? `<strong>${esc(client.companyName)}</strong><br/>` : ''}
        ${client.contactPerson ? esc(client.contactPerson) + '<br/>' : ''}
        ${client.email ? esc(client.email) + '<br/>' : ''}
        ${client.gstNumber ? 'GST: ' + esc(client.gstNumber) : ''}
      </td>
      <td style="padding:6px 12px;border-bottom:1px solid ${BORDER};font-weight:600;white-space:nowrap;width:10%">Client ID</td>
      <td style="padding:6px 12px;border-bottom:1px solid ${BORDER};border-left:1px solid ${BORDER};white-space:nowrap;width:15%">${esc(client.clientId) || ''}</td>
      <td style="border-bottom:1px solid ${BORDER}"></td>
    </tr>
    <tr>
      <td style="padding:6px 12px;border-bottom:1px solid ${BORDER};font-weight:600;white-space:nowrap">Invoice No</td>
      <td style="padding:6px 12px;border-bottom:1px solid ${BORDER};border-left:1px solid ${BORDER};white-space:nowrap">${esc(invoice.invoiceNumber) || ''}</td>
      <td style="border-bottom:1px solid ${BORDER}"></td>
    </tr>
    <tr>
      <td style="padding:6px 12px;border-bottom:1px solid ${BORDER};font-weight:600;white-space:nowrap">Date</td>
      <td style="padding:6px 12px;border-bottom:1px solid ${BORDER};border-left:1px solid ${BORDER};white-space:nowrap">${fmtDate(invoice.issueDate)}</td>
      <td style="border-bottom:1px solid ${BORDER}"></td>
    </tr>
    <tr>
      <td style="padding:6px 12px;border-bottom:1.5px solid ${BORDER};font-weight:600;white-space:nowrap">Due Date</td>
      <td style="padding:6px 12px;border-bottom:1.5px solid ${BORDER};border-left:1px solid ${BORDER};white-space:nowrap">${fmtDate(invoice.dueDate)}</td>
      <td style="border-bottom:1.5px solid ${BORDER}"></td>
    </tr>

    <tr style="background:${HEAD_BG}">
      <td style="padding:6px 8px;border:1px solid ${BORDER};text-align:center;font-weight:600;width:32px">Sr<br/>No</td>
      <td style="padding:6px 8px;border:1px solid ${BORDER};font-weight:600">Services</td>
      <td style="padding:6px 8px;border:1px solid ${BORDER};text-align:center;font-weight:600;width:32px">Qty</td>
      <td style="padding:6px 8px;border:1px solid ${BORDER};text-align:center;font-weight:600;width:88px">Rate</td>
      <td style="padding:6px 8px;border:1px solid ${BORDER};text-align:center;font-weight:600;width:100px">Amount</td>
    </tr>
    ${itemsHtml}

    <tr>
      <td colspan="3" style="border-left:1.5px solid ${BORDER};border-bottom:1px solid ${BORDER}"></td>
      <td style="padding:8px 12px;border:1px solid ${BORDER};text-align:right;font-weight:600">Total</td>
      <td style="padding:8px 12px;border:1px solid ${BORDER};text-align:right">${fmt(invoice.subtotal)}</td>
    </tr>
    ${invoice.taxAmount ? `
    <tr>
      <td colspan="3" style="border-left:1.5px solid ${BORDER};border-bottom:1px solid ${BORDER}"></td>
      <td style="padding:8px 12px;border:1px solid ${BORDER};text-align:right;font-weight:600">Taxes${invoice.taxRate ? ' (' + invoice.taxRate + '%)' : ''}</td>
      <td style="padding:8px 12px;border:1px solid ${BORDER};text-align:right">${fmt(invoice.taxAmount)}</td>
    </tr>` : `
    <tr>
      <td colspan="3" style="border-left:1.5px solid ${BORDER};border-bottom:1px solid ${BORDER}"></td>
      <td style="padding:8px 12px;border:1px solid ${BORDER};text-align:right;font-weight:600">Taxes</td>
      <td style="padding:8px 12px;border:1px solid ${BORDER};text-align:right">${fmt(0)}</td>
    </tr>`}
    ${invoice.discountAmount ? `
    <tr>
      <td colspan="3" style="border-left:1.5px solid ${BORDER};border-bottom:1px solid ${BORDER}"></td>
      <td style="padding:8px 12px;border:1px solid ${BORDER};text-align:right;font-weight:600">Discount${invoice.discountPercent ? ' (' + invoice.discountPercent + '%)' : ''}</td>
      <td style="padding:8px 12px;border:1px solid ${BORDER};text-align:right">-${fmt(invoice.discountAmount)}</td>
    </tr>` : ''}
    <tr style="background:${HEAD_BG}">
      <td colspan="3" style="border-left:1.5px solid ${BORDER};border-bottom:1.5px solid ${BORDER}"></td>
      <td style="padding:8px 12px;border:1.5px solid ${BORDER};text-align:right;font-weight:700">Net Payable</td>
      <td style="padding:8px 12px;border:1.5px solid ${BORDER};text-align:right;font-weight:700">${fmt(invoice.total)}</td>
    </tr>
    ${invoice.paidAmount > 0 ? `
    <tr>
      <td colspan="3" style="border-left:1.5px solid ${BORDER};border-bottom:1px solid ${BORDER}"></td>
      <td style="padding:8px 12px;border:1px solid ${BORDER};text-align:right;font-weight:600">Paid</td>
      <td style="padding:8px 12px;border:1px solid ${BORDER};text-align:right">-${fmt(invoice.paidAmount)}</td>
    </tr>
    <tr>
      <td colspan="3" style="border-left:1.5px solid ${BORDER};border-bottom:1.5px solid ${BORDER}"></td>
      <td style="padding:8px 12px;border:1.5px solid ${BORDER};text-align:right;font-weight:700">Balance Due</td>
      <td style="padding:8px 12px;border:1.5px solid ${BORDER};text-align:right;font-weight:700">${fmt(invoice.balanceDue)}</td>
    </tr>` : ''}

    <tr>
      <td colspan="5" style="padding:8px 12px;border:1.5px solid ${BORDER};font-style:italic">
        \u20B9&nbsp;&nbsp;&nbsp;${numberToIndianWords(invoice.total)}
      </td>
    </tr>
  </table>

  <!-- BANK DETAILS + SIGNATORY -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-top:14px;font-size:12px;line-height:1.8">
    <div>
      <div>Bank Name: ${BANK.bankName}</div>
      <div>Account Holder: ${BANK.accountHolder}</div>
      <div>Account Type: ${BANK.accountType}</div>
      <div>Account Number: ${BANK.accountNumber}</div>
      <div>IFSC Code: ${BANK.ifscCode}</div>
      <div>UPI ID: ${BANK.upiId}</div>
    </div>
    <div style="text-align:right;padding-top:2px">
      <div>${COMPANY.signatoryLine1}</div>
      <div>${COMPANY.signatoryLine2}</div>
    </div>
  </div>

  <!-- NOTES -->
  ${invoice.notes ? `
  <div style="margin-top:16px;font-size:12px">
    <strong>Notes:</strong>
    <div style="white-space:pre-wrap">${esc(invoice.notes)}</div>
  </div>` : ''}

  <!-- ADDRESSES -->
  <div style="border-top:1px solid #888;padding-top:10px;margin-top:16px;font-size:11px;color:#333;line-height:1.7">
    <div>Head Office:</div>
    <div>${ADDR.headOffice}</div>
    <div style="margin-top:6px">Operational Office:</div>
    <div>${ADDR.operationsOffice}</div>
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
      <td style="padding:10px 12px;border-bottom:1px solid #e8ddd0;color:#8b7355;text-align:center;width:48px">${i + 1}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e8ddd0;color:#2c1810">${esc(item.description)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e8ddd0;color:#2c1810;text-align:right">${item.quantity}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e8ddd0;color:#2c1810;text-align:right">${fmt(item.unitPrice)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e8ddd0;color:#2c1810;text-align:right;font-weight:600">${fmt(item.amount)}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @page { margin: 36px 48px; }
    * { box-sizing: border-box; }
    body { font-family: 'Inter', 'Arial', sans-serif; color: #2c1810; margin: 0; padding: 0; font-size: 12px; line-height: 1.5; }
    table { border-collapse: collapse; width: 100%; }
  </style>
</head>
<body>
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:24px;border-bottom:2px solid ${brand}">
    <div>
      ${venture.logoUrl
        ? `<img src="${venture.logoUrl}" style="height:64px;width:auto;object-fit:contain" />`
        : `<div style="width:64px;height:64px;border-radius:6px;display:flex;align-items:center;justify-content:center;background:${brand};color:#fff;font-size:12px;font-weight:700">${venture.code}</div>`
      }
    </div>
    <div style="text-align:right">
      <div style="font-size:30px;font-weight:700;color:${brand};letter-spacing:2px">INVOICE</div>
    </div>
  </div>

  <div style="display:flex;gap:32px;margin-bottom:32px">
    <div style="flex:1">
      <div style="font-size:12px;font-weight:600;color:${brand};text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Bill To</div>
      <div style="font-size:16px;font-weight:600;color:#2c1810;margin-bottom:4px">${esc(client.companyName) || '-'}</div>
      <div style="font-size:14px;color:#4a3f35;line-height:1.6">
        ${client.contactPerson ? esc(client.contactPerson) + '<br>' : ''}
        ${esc(client.email) || ''}
        ${client.gstNumber ? '<br>GST: ' + esc(client.gstNumber) : ''}
      </div>
      <div style="font-size:12px;color:#8b7355;margin-top:4px">Client ID: ${esc(client.clientId) || '-'}</div>
    </div>
    <div style="text-align:right;font-size:14px;line-height:2">
      <div><span style="color:#b3752f">Invoice No : </span><span style="color:#2c1810;font-weight:600">${esc(invoice.invoiceNumber)}</span></div>
      <div><span style="color:#b3752f">Date : </span><span style="color:#2c1810">${fmtDate(invoice.issueDate)}</span></div>
      <div><span style="color:#b3752f">Due Date : </span><span style="color:#2c1810">${fmtDate(invoice.dueDate)}</span></div>
    </div>
  </div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:32px">
    <thead>
      <tr style="background:${brand};color:#fff">
        <th style="padding:12px;text-align:left;font-size:12px;font-weight:500;text-transform:uppercase;letter-spacing:1px;width:48px">Sr. No.</th>
        <th style="padding:12px;text-align:left;font-size:12px;font-weight:500;text-transform:uppercase;letter-spacing:1px">Services</th>
        <th style="padding:12px;text-align:right;font-size:12px;font-weight:500;text-transform:uppercase;letter-spacing:1px;width:80px">Quantity</th>
        <th style="padding:12px;text-align:right;font-size:12px;font-weight:500;text-transform:uppercase;letter-spacing:1px;width:112px">Rate</th>
        <th style="padding:12px;text-align:right;font-size:12px;font-weight:500;text-transform:uppercase;letter-spacing:1px;width:112px">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>

  <div style="display:flex;justify-content:flex-end;margin-bottom:32px">
    <div style="width:288px">
      <div style="display:flex;justify-content:space-between;font-size:14px;padding:4px 0">
        <span style="color:#8b7355">Subtotal</span>
        <span style="color:#2c1810">${fmt(invoice.subtotal)}</span>
      </div>
      ${invoice.taxRate > 0 ? `
      <div style="display:flex;justify-content:space-between;font-size:14px;padding:4px 0">
        <span style="color:#8b7355">GST (${invoice.taxRate}%)</span>
        <span style="color:#2c1810">${fmt(invoice.taxAmount)}</span>
      </div>` : ''}
      ${invoice.discountPercent > 0 ? `
      <div style="display:flex;justify-content:space-between;font-size:14px;padding:4px 0">
        <span style="color:#8b7355">Discount (${invoice.discountPercent}%)</span>
        <span style="color:#b3752f">-${fmt(invoice.discountAmount)}</span>
      </div>` : ''}
      <hr style="border:none;border-top:1.5px solid ${brand};margin:4px 0" />
      <div style="display:flex;justify-content:space-between;font-size:18px;font-weight:700;color:${brand};padding-top:4px">
        <span>Total</span>
        <span>${fmt(invoice.total)}</span>
      </div>
      <div style="text-align:right;font-size:12px;font-style:italic;color:#8b7355;padding-top:4px">${numberToIndianWords(invoice.total)}</div>
      ${invoice.paidAmount > 0 ? `
      <div style="display:flex;justify-content:space-between;font-size:14px;padding:4px 0;color:#588157;margin-top:4px">
        <span>Paid</span>
        <span>-${fmt(invoice.paidAmount)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:14px;font-weight:600;color:${brand};padding:4px 0">
        <span>Balance Due</span>
        <span>${fmt(invoice.balanceDue)}</span>
      </div>` : ''}
    </div>
  </div>

  <div style="border-top:2px solid ${brand};padding-top:24px;margin-bottom:24px">
    <div style="font-size:14px;font-weight:700;color:${brand};margin-bottom:8px">Bank Details</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 32px;font-size:14px;color:#4a3f35">
      <div><span style="color:#8b7355">Bank Name :</span> ${BANK.bankName}</div>
      <div><span style="color:#8b7355">Account Holder :</span> ${BANK.accountHolder}</div>
      <div><span style="color:#8b7355">Account Type :</span> ${BANK.accountType}</div>
      <div><span style="color:#8b7355">Account Number :</span> ${BANK.accountNumber}</div>
      <div><span style="color:#8b7355">IFSC Code :</span> ${BANK.ifscCode}</div>
      <div><span style="color:#8b7355">UPI ID :</span> ${BANK.upiId}</div>
    </div>
  </div>

  ${invoice.notes ? `
  <div style="margin-bottom:24px;font-size:14px;color:#4a3f35">
    <div style="font-size:12px;color:${brand};margin-bottom:4px;font-weight:600">Notes:</div>
    <div style="white-space:pre-wrap">${esc(invoice.notes)}</div>
  </div>` : ''}

  <div style="border-top:2px solid ${brand};padding-top:16px;margin-top:24px;font-size:12px;color:#8b7355;line-height:1.8">
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
  const html = buildHtml(invoice);
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({
      format: 'A4',
      margin: { top: '30px', bottom: '30px', left: '40px', right: '40px' },
      printBackground: true,
      preferCSSPageSize: true,
    });
    return pdf;
  } finally {
    await browser.close();
  }
};