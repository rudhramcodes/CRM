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

export const buildQuotationDefaults = ({ client = null, project = null } = {}) => {
  const scopeTitle = project?.title || 'Brand Kit';
  const issueDate = new Date();
  const validUntil = new Date(issueDate.getTime() + DEFAULT_QUOTE_VALIDITY_DAYS * 86400000);
  const toDateInput = (date) => date.toISOString().slice(0, 10);
  return {
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
  };
};
