export const DEFAULT_SCOPE_INTRO =
  'The assignment covers the development of a comprehensive and cohesive Brand Identity System, including:';

export const DEFAULT_SCOPE = [
  'Logo Identity – Creation of a distinctive and versatile professional logo.',
  'Colour Palette – Defining primary and secondary brand colours with usage specifications.',
  'Typography – Selection of appropriate fonts and typographic hierarchy.',
  'Visual Language – Development of supporting graphic elements, imagery style, patterns, and overall visual direction.',
  'Brand Applications – Application of the identity across selected print and digital brand touchpoints.',
  'Brand Guidelines – Preparation of guidelines covering logo usage, colours, typography, visual elements, and brand applications to ensure consistency across all communications.',
  'Brand Positioning – Defining the brand’s market positioning and differentiation.',
  'Target Audience – Identifying key audience segments and their needs.',
  'Brand Personality & Tone of Voice – Establishing the brand character and communication style.',
  'Brand Messaging – Developing clear and consistent core brand messaging.',
  'USP & Communication Pillars – Defining key differentiators and strategic communication themes.',
  'Tagline Development – Creating relevant and distinctive tagline options.',
  'Domain Purchase & Registration – Assistance with domain selection, purchase, and registration.',
  'Mascot Design – Creation of a distinctive and engaging brand mascot aligned with the brand’s personality, identity, and communication style.',
];

export const DEFAULT_LETTER_BODY =
  'Hello…\n\nThank you for giving us the opportunity to present our proposal. We have carefully understood your brief and the direction you want to take.\n\nThe enclosed quotation covers the complete scope outlined on the following pages, with a clear focus on quality, consistency, and execution.\n\nOur approach is simple — understand the brand deeply, translate that understanding into a distinctive visual and verbal language, and deliver a system that stays consistent across every touchpoint.\n\nWe are excited about the possibility of building this together and would be glad to walk you through the scope in detail.\n\nThank you for your trust.';

export const DEFAULT_SIGNOFF = 'Warm Regards,\nRudhram Enterprises';

export const DEFAULT_DELIVERABLES = [
  'Brand Identity Design',
  'Logo & Visual Assets',
  'Print & Digital Collateral',
  'Social Media Creatives',
  'Final Files (Source + Export Formats)',
].join('\n');

export const DEFAULT_NOTE = [
  'Payment Terms: 50% advance along with the confirmation, 50% before final delivery.',
  'GST @18% is applicable as quoted.',
  'Any additional scope will be quoted separately.',
].join('\n');

export const DEFAULT_TAX_RATE = 18;
export const DEFAULT_QUOTE_VALIDITY_DAYS = 30;

export const DEFAULT_ISSUER = Object.freeze({
  issuerName: 'RUDHRAM ENTERPRISES PVT. LTD',
  issuerAddress: '7th Floor, S-11, 1171, 1172, Solitaire Corporate Park,\nAndheri Ghalkopar Link Road\nMumbai, Maharashtra, 400093.',
  issuerEmail: 'hello@rudhramenterprises.com',
  issuerPhone: '+91 7285833101',
  issuerWebsite: 'www.rudhramenterprises.com',
  issuerGst: '27CYSPG6483K1ZK',
  signatoryName: 'Rudhram Entertainment',
});

export const DEFAULT_BANK = Object.freeze({
  bankName: 'HDFC Bank',
  bankAccountName: 'Rudhram Entertainment',
  bankAccountNumber: '50200095934904',
  bankIfsc: 'HDFC0006679',
  bankGst: DEFAULT_ISSUER.issuerGst,
  bankUpi: '7285833101@hdfcbank',
});

const PANIGRAHNA_CONTENT = {
  letterBody: 'Thank you for considering Panigrahna for your wedding celebrations. We look forward to capturing the emotions, rituals and moments that make your story unique.\n\nOur wedding photography and cinematography services are tailored to your events and agreed coverage, with care from planning through final delivery.',
  scopeIntro: 'The wedding photography and cinematography assignment includes the agreed services below:',
  scopeOfWork: [
    'Wedding photography covering the agreed ceremonies and celebrations.',
    'Wedding cinematography capturing the key rituals, emotions and moments.',
    'Pre-event coordination to confirm the schedule, locations and coverage requirements.',
    'Selection, editing and post-production of the agreed photographs and films.',
  ],
  deliverables: 'Edited high-resolution photographs\nWedding highlight film\nEdited wedding film\nDigital delivery of the agreed final files',
  closingNote: 'We look forward to being part of your celebrations and preserving memories for you and your family.',
  paymentTerms: '50% advance on booking confirmation; the remaining 50% before final delivery. GST is applicable as quoted.',
  conditions: 'Booking is confirmed upon receipt of the advance and agreement on the event schedule and scope.\nCoverage dates, hours, locations, crew and deliverables must be agreed before the event.\nAdditional events, overtime, travel and accommodation outside the agreed scope will be quoted separately.\nDelivery timelines will be agreed following the event and receipt of any required selections or approvals.\nChanges, cancellation or rescheduling are subject to mutual written agreement and crew availability.',
};

export const buildQuotationDefaults = ({ client = null, project = null, templateId } = {}) => {
  const selectedTemplate = templateId ?? (client?.brand === 'panigrahna' ? 'panigrahna' : 'standard');
  const scopeTitle = project?.title || (selectedTemplate === 'panigrahna' ? 'Wedding Photography & Cinematography' : 'Brand Kit');
  const issueDate = new Date();
  const validUntil = new Date(issueDate.getTime() + DEFAULT_QUOTE_VALIDITY_DAYS * 86400000);
  const toDateInput = (date) => date.toISOString().slice(0, 10);
  return {
    templateId: selectedTemplate,
    recipientName: client?.companyName ?? '',
    recipientAddress: ['street', 'city', 'state', 'pincode', 'country']
      .map((field) => client?.address?.[field]).filter(Boolean).join(', '),
    recipientEmail: client?.email ?? '',
    recipientPhone: client?.phone ?? '',
    recipientGst: client?.gstNumber ?? '',
    clientReference: client?.clientId ?? '',
    projectReference: project?.projectCode ?? '',
    ...DEFAULT_ISSUER,
    ...DEFAULT_BANK,
    closingNote: '',
    paymentTerms: '',
    conditions: '',
    salutation: client?.companyName ? `Dear ${client.companyName},` : '',
    subject: `Submission of Quotation for Professional ${scopeTitle.replace(/\s+/g, ' ').trim()}.`,
    letterBody: DEFAULT_LETTER_BODY,
    letterSignoff: DEFAULT_SIGNOFF,
    scopeTitle,
    scopeIntro: DEFAULT_SCOPE_INTRO,
    scopeOfWork: [...DEFAULT_SCOPE],
    deliverables: DEFAULT_DELIVERABLES,
    note: DEFAULT_NOTE,
    budget: Number(project?.budget ?? 0),
    price: Number(project?.budget ?? 0),
    taxRate: DEFAULT_TAX_RATE,
    issueDate: toDateInput(issueDate),
    validUntil: toDateInput(validUntil),
    ...(selectedTemplate === 'panigrahna' ? {
      ...PANIGRAHNA_CONTENT,
      scopeOfWork: [...PANIGRAHNA_CONTENT.scopeOfWork],
      subject: `Submission of Quotation for ${scopeTitle.replace(/\s+/g, ' ').trim()}.`,
      note: PANIGRAHNA_CONTENT.paymentTerms,
    } : {}),
  };
};
