const esc = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const lines = (value) => esc(value).replace(/\r?\n/g, '<br>');

const paragraphs = (value) => String(value ?? '')
  .split(/\n\s*\n/)
  .map((part) => part.trim())
  .filter(Boolean)
  .map((part) => `<p>${lines(part)}</p>`)
  .join('');

const list = (value) => String(value ?? '')
  .split(/\r?\n/)
  .map((part) => part.trim())
  .filter(Boolean);

const date = (value) => value
  ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
  : '-';

const money = (value) => (Number(value) || 0).toLocaleString('en-IN', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const addressFromClient = (client) => {
  const address = client?.address || {};
  if (typeof address === 'string') return address;
  return [
    address.street,
    [address.city, address.state, address.pincode].filter(Boolean).join(', '),
    address.country,
  ].filter(Boolean).join('\n');
};

const footerIcon = (name) => {
  const paths = {
    location: '<path d="M12 22s8-7 8-14a8 8 0 1 0-16 0c0 7 8 14 8 14z" fill="#ae773c"/><circle cx="12" cy="8" r="3" fill="#f8f4eb" stroke="none"/>',
    phone: '<path d="M21 16v3a2 2 0 0 1-2.2 2A18 18 0 0 1 3 5.2 2 2 0 0 1 5 3h3l2 5-2 2a14 14 0 0 0 6 6l2-2 5 2z" fill="#ae773c" stroke="none"/>',
    mail: '<rect x="2" y="4" width="20" height="16" fill="#ae773c" stroke="none"/><path d="m2 6 10 7 10-7" stroke="#f8f4eb" stroke-width="1.5" fill="none"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/>',
  };
  return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#ae773c" stroke-width="2" aria-hidden="true">${paths[name]}</svg>`;
};

export const generatePanigrahnaQuotationHtml = (quotation, assets) => {
  const client = quotation.client || {};
  const project = quotation.project || {};
  const issuer = assets.issuer;
  const bank = assets.bank;
  const field = (name, fallback = '') => quotation[name] ?? fallback;
  const recipientName = field('recipientName', client.companyName || 'Client');
  const recipientAddress = field('recipientAddress', addressFromClient(client));
  const recipientEmail = field('recipientEmail', client.email || '');
  const recipientPhone = field('recipientPhone', client.phone || '');
  const recipientGst = field('recipientGst', client.gstNumber || '');
  const issuerName = field('issuerName', issuer.name);
  const issuerAddress = field('issuerAddress', issuer.address);
  const issuerEmail = field('issuerEmail', issuer.email);
  const issuerPhone = field('issuerPhone', issuer.phone);
  const issuerWebsite = field('issuerWebsite', issuer.website);
  const issuerGst = field('issuerGst', issuer.gst);
  const signatoryName = field('signatoryName', 'Rudhram Entertainment');
  const scopeItems = Array.isArray(quotation.scopeOfWork) ? quotation.scopeOfWork : [];
  const deliverables = list(quotation.deliverables);
  const conditions = list(quotation.conditions);
  const price = Number(quotation.price || 0);
  const taxRate = Number(quotation.taxRate ?? 18);
  const taxAmount = (price * taxRate) / 100;
  const total = price + taxAmount;
  const logo = `data:image/png;base64,${assets.panigrahnaLogo}`;
  const rudhram = `data:image/png;base64,${assets.rudhramLogo}`;
  const symbol = `data:image/png;base64,${assets.rudhramSymbol}`;
  const wordmark = `data:image/png;base64,${assets.rudhramWordmark}`;

  const header = `<header class="pg-header">
    <img class="pg-venture-logo" src="${logo}" alt="Panigrahna">
    <div class="pg-rudhram-lockup"><img class="pg-rudhram-symbol" src="${symbol}" alt=""><img class="pg-rudhram-wordmark" src="${wordmark}" alt="Rudhram"><span>enterprises</span></div>
  </header>`;
  const watermark = `<img class="pg-watermark" src="${rudhram}" alt="">`;
  const footer = `<footer class="pg-footer">
    <div class="pg-footer-bar"></div>
    <div class="pg-footer-content">
      <div><span class="pg-footer-icon">${footerIcon('location')}</span><span><strong>${esc(issuerName)}</strong><br>${lines(issuerAddress)}</span></div>
      <div><span class="pg-footer-icon">${footerIcon('phone')}</span><span>${esc(issuerPhone)}</span></div>
      <div><span class="pg-footer-icon">${footerIcon('mail')}</span><span>${esc(issuerEmail)}</span></div>
      <div><span class="pg-footer-icon">${footerIcon('globe')}</span><span>${esc(issuerWebsite)}</span></div>
    </div>
    <div class="pg-footer-rule"></div>
  </footer>`;
  const signature = `<div class="pg-signature"><span>AUTHORIZED SIGNATURE</span><span>${esc(signatoryName)}</span></div>`;
  const heading = (label) => `<h2 class="pg-section-title">${label}</h2>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Quotation - ${esc(quotation.quotationNumber || '')}</title>
  <style>
    @font-face { font-family: 'Goldenbook'; src: url(data:font/opentype;base64,${assets.goldenbookRegular}) format('opentype'); font-weight: 400; }
    @font-face { font-family: 'Goldenbook'; src: url(data:font/opentype;base64,${assets.goldenbookBold}) format('opentype'); font-weight: 700; }
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    html, body { margin: 0; background: #f8f4eb; color: #34271d; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { font-family: 'Goldenbook', Georgia, serif; font-size: 13.4px; line-height: 1.35; }
    .pg-page {
      position: relative; width: 794px; min-height: 1123px; margin: 0 auto 24px;
      padding: 32px 60px 28px; display: flex; flex-direction: column;
      background: #f8f4eb;
      break-after: page; page-break-after: always;
    }
    .pg-page::before { content: ''; position: absolute; inset: 0; background: url(data:image/jpeg;base64,${assets.grain}) center / cover; opacity: .28; pointer-events: none; }
    .pg-page:last-child { break-after: auto; page-break-after: auto; }
    .pg-page > *:not(.pg-watermark) { position: relative; z-index: 1; }
    .pg-watermark { position: absolute; width: 480px; left: 50%; top: 39%; transform: translateX(-50%); opacity: .08; pointer-events: none; }
    .pg-header { display: flex; align-items: flex-end; justify-content: space-between; height: 158px; margin: 0 -40px 28px -36px; }
    .pg-header::before { content: ''; position: absolute; left: 0; bottom: 0; width: 56px; height: 15px; background: #ae773c; clip-path: polygon(0 0, 72% 0, 100% 100%, 28% 100%); }
    .pg-header::after { content: ''; position: absolute; left: 56px; right: 185px; bottom: 0; border-bottom: 2px solid #ae773c; }
    .pg-venture-logo { width: 184px; height: 142px; margin-left: 60px; object-fit: contain; object-position: left bottom; transform: translateY(-10px); }
    .pg-rudhram-lockup { display: flex; width: 180px; flex-direction: column; align-items: center; transform: translateY(22px); }
    .pg-rudhram-symbol { width: 70px; height: 110px; object-fit: contain; }
    .pg-rudhram-wordmark { width: 180px; height: 31px; margin-top: 6px; object-fit: contain; }
    .pg-rudhram-lockup span { margin-top: 3px; color: #ae773c; font-size: 13px; letter-spacing: .25em; }
    .pg-content { flex: 1; }
    .pg-to { margin: 0 0 22px 7px; font-size: 14px; line-height: 1.34; }
    .pg-to-label { font-size: 12px; letter-spacing: .08em; }
    .pg-to-name { font-size: 17px; font-weight: 700; margin: 3px 0 5px; }
    .pg-letter { padding: 0 7px; font-size: 14px; line-height: 1.43; }
    .pg-letter p { margin: 0 0 17px; }
    .pg-section-title { margin: 18px 0 16px; padding: 11px 7px 10px; border-top: 1px solid #ae773c; border-bottom: 1px solid #ae773c; font-size: 16px; line-height: 1.15; font-weight: 700; }
    .pg-section-copy { padding: 0 7px; font-size: 14px; line-height: 1.32; }
    .pg-section-copy p { margin: 0 0 12px; }
    .pg-scope-item { margin: 0 0 11px; white-space: pre-line; }
    .pg-letter-page .pg-to { margin-bottom: 14px; }
    .pg-letter-page .pg-letter p { margin-bottom: 10px; }
    .pg-letter-page .pg-section-title { margin: 12px 0 10px; }
    .pg-letter-page .pg-section-copy p { margin-bottom: 8px; }
    .pg-letter-page .pg-scope-item { margin-bottom: 6px; }
    .pg-deliverable { margin: 0 0 5px; }
    .pg-closing { margin-top: 24px; }
    .pg-signoff-row { display: flex; justify-content: space-between; gap: 20px; margin: 30px 7px 0; }
    .pg-signature { width: 190px; min-height: 112px; display: flex; flex-direction: column; align-items: center; justify-content: space-between; text-align: center; font-size: 11px; }
    .pg-footer { height: 186px; margin: 22px -60px 0 -60px; display: flex; position: relative; align-items: stretch; }
    .pg-footer-bar { width: 32px; flex: none; background: #ae773c; margin-right: 10px; transform: translateY(-10px); }
    .pg-footer-content { padding: 12px 0 26px; display: flex; flex-direction: column; gap: 7px; font-size: 13px; line-height: 1.18; }
    .pg-footer-content > div { display: flex; align-items: flex-start; gap: 6px; }
    .pg-footer-icon { width: 18px; flex: none; line-height: 1; }
    .pg-footer-rule { position: absolute; left: 22px; right: 12px; bottom: -14px; border-bottom: 2px solid #ae773c; }
    .pg-footer-rule::after { content: ''; position: absolute; right: 0; bottom: -2px; width: 60px; height: 18px; background: #ae773c; clip-path: polygon(25% 0, 100% 0, 75% 100%, 0 100%); }
    .pg-terms { padding: 0 20px; font-size: 13.2px; line-height: 1.25; }
    .pg-terms h3 { font-size: 14px; font-weight: 400; margin: 18px 0 4px; }
    .pg-terms p { margin: 0 0 4px; }
    .pg-terms ul { margin: 0; padding-left: 16px; }
    .pg-terms li { margin: 0 0 3px; }
    .pg-terms-signature { display: flex; justify-content: flex-end; margin: 25px 10px 0; }
    .pg-summary-header { height: 156px; display: flex; flex-direction: column; align-items: center; }
    .pg-summary-header .pg-rudhram-symbol { width: 60px; height: 85px; }
    .pg-summary-header .pg-rudhram-wordmark { width: 195px; height: 30px; margin-top: 6px; }
    .pg-summary-header span { display: block; margin-top: 5px; color: #ae773c; font-size: 13px; letter-spacing: .25em; }
    .pg-summary-title-row { display: flex; justify-content: space-between; align-items: flex-start; min-height: 122px; }
    .pg-summary-title-row h1 { margin: 0 0 15px; font-size: 30px; font-weight: 400; }
    .pg-summary-refs { line-height: 1.5; font-size: 14px; }
    .pg-summary-venture { width: 150px; height: 116px; object-fit: contain; }
    .pg-parties { display: grid; grid-template-columns: 1fr 1fr; gap: 34px; margin: 8px 0 26px; min-height: 138px; font-size: 13.4px; line-height: 1.3; }
    .pg-parties strong { font-size: 15px; }
    .pg-summary-columns { border-top: 1px solid #ae773c; display: grid; grid-template-columns: 1fr 1.2fr; gap: 22px; }
    .pg-summary-columns h2 { font-size: 15px; margin: 0 0 12px; padding: 11px 5px 10px; border-bottom: 1px solid #ae773c; }
    .pg-summary-columns > div > div { padding: 0 5px; }
    .pg-summary-columns p { margin: 0 0 14px; }
    .pg-summary-columns ul { margin: 0; padding-left: 18px; }
    .pg-summary-columns li { margin: 0 0 4px; }
    .pg-summary-bottom { border-top: 1px solid #ae773c; margin-top: auto; padding: 14px 5px 0; display: grid; grid-template-columns: 1fr 1fr; gap: 24px; min-height: 218px; }
    .pg-bank { align-self: end; font-size: 13px; line-height: 1.35; }
    .pg-bank strong { font-size: 15px; }
    .pg-totals { font-size: 14px; }
    .pg-total-row { display: flex; justify-content: space-between; gap: 18px; padding: 5px 12px; }
    .pg-total-row.grand { margin-top: 3px; padding: 8px 12px; background: #c6a981; font-weight: 700; font-size: 17px; }
    .pg-summary-signature { display: flex; justify-content: flex-end; margin-top: 14px; }
    .pg-summary-signature .pg-signature { min-height: 95px; }
    @media print { .pg-page { width: 210mm; min-height: 297mm; margin: 0; } }
  </style>
</head>
<body>
  <section class="pg-page pg-letter-page">
    ${watermark}${header}
    <div class="pg-content">
      <div class="pg-to"><div class="pg-to-label">TO</div><div class="pg-to-name">${esc(recipientName)}</div><div>${lines(recipientAddress)}</div></div>
      <div class="pg-letter"><p>${esc(quotation.salutation || `Dear ${recipientName},`)}</p>${paragraphs(quotation.letterBody)}</div>
      ${heading('SCOPE OF WORK')}
      <div class="pg-section-copy">${paragraphs(quotation.scopeIntro)}${scopeItems.map((item) => `<div class="pg-scope-item">${lines(item)}</div>`).join('')}</div>
    </div>
    ${footer}
  </section>
  <section class="pg-page pg-deliverables-page">
    ${watermark}${header}
    <div class="pg-content">
      ${heading('DELIVERABLES')}
      <div class="pg-section-copy"><p>The final deliverables will include:</p>${deliverables.map((item) => `<div class="pg-deliverable">${esc(item)}</div>`).join('')}
        <p class="pg-closing">${lines(field('closingNote'))}</p>
      </div>
      <div class="pg-signoff-row"><div>${lines(quotation.letterSignoff || 'Warm Regards,\nRudhram Enterprises')}</div>${signature}</div>
    </div>
    ${footer}
  </section>
  <section class="pg-page pg-terms-page">
    ${watermark}${header}
    <div class="pg-content">
      ${heading('TERMS AND CONDITIONS')}
      <div class="pg-terms"><h3>Payment Terms:</h3>${paragraphs(field('paymentTerms'))}<h3>Conditions:</h3><ul>${conditions.map((item) => `<li>${esc(item)}</li>`).join('')}</ul></div>
      <div class="pg-terms-signature">${signature}</div>
    </div>
    ${footer}
  </section>
  <section class="pg-page pg-summary-page">
    ${watermark}
    <header class="pg-summary-header"><img class="pg-rudhram-symbol" src="${symbol}" alt=""><img class="pg-rudhram-wordmark" src="${wordmark}" alt="Rudhram"><span>enterprises</span></header>
    <div class="pg-summary-title-row"><div><h1>QUOTATION</h1><div class="pg-summary-refs">Client ID: ${esc(field('clientReference', client.clientId || '-'))}<br>Project No: ${esc(field('projectReference', project.projectCode || '-'))}<br>Quotation No: ${esc(quotation.quotationNumber || '-')}<br>Date: ${date(quotation.issueDate)}</div></div><img class="pg-summary-venture" src="${logo}" alt="Panigrahna"></div>
    <div class="pg-parties"><div><strong>${esc(issuerName)}</strong><br>${lines(issuerAddress)}<br>${esc(issuerEmail)}<br>Mobile: ${esc(issuerPhone)}<br>GST NO: ${esc(issuerGst)}</div><div><strong>BILLED TO:</strong><br><strong>${esc(recipientName)}</strong><br>${lines(recipientAddress)}<br>Email: ${esc(recipientEmail)}<br>Mobile: ${esc(recipientPhone)}<br>GST NO: ${esc(recipientGst)}</div></div>
    <div class="pg-summary-columns"><div><h2>SCOPE OF WORK</h2><div>${paragraphs(quotation.scopeIntro)}${scopeItems.map((item) => `<p>${lines(item)}</p>`).join('')}</div></div><div><h2>DELIVERABLES</h2><div><p>The final deliverables will include:</p><ul>${deliverables.map((item) => `<li>${esc(item)}</li>`).join('')}</ul></div></div></div>
    <div class="pg-summary-bottom"><div class="pg-bank"><strong>BANK DETAILS</strong><br>Bank Name: ${esc(field('bankName', bank.name))}<br>Account Name: ${esc(field('bankAccountName', bank.accountName))}<br>Account No: ${esc(field('bankAccountNumber', bank.accountNumber))}<br>IFSC Code: ${esc(field('bankIfsc', bank.ifsc))}<br>GST: ${esc(field('bankGst', bank.gst))}<br>UPI ID: ${esc(field('bankUpi', bank.upi))}</div><div class="pg-totals"><div class="pg-total-row"><span>SUBTOTAL</span><span>${money(price)}</span></div><div class="pg-total-row"><span>GST (${money(taxRate)}%)</span><span>${money(taxAmount)}</span></div><div class="pg-total-row grand"><span>TOTAL</span><span>${money(total)}</span></div><div class="pg-summary-signature">${signature}</div></div></div>
  </section>
</body>
</html>`;
};
