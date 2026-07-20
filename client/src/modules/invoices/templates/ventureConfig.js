// Venture-specific configuration for invoice templates
// Cloudinary URLs — user will provide actual links

export const VENTURES = {
  panigrahna: {
    label: 'Panigrahna',
    code: 'PG',
    logoUrl: 'https://res.cloudinary.com/dvsrgdyi7/image/upload/v1784535274/pg-logo.avif',
    bankDetails: {
      bankName: 'HDFC Bank',
      accountHolder: 'Rudhram Entertainment',
      accountType: 'Current Account',
      accountNumber: '50200095934904',
      ifscCode: 'HDFC0006679',
      upiId: '7285833101@hdfcbank',
    },
    addresses: {
      headOffice: '1171-1172, Solitaire Corporate Park, Andheri Ghatkopar Link Road, Chakala, Nr Technopolis Knowledge Park, Andheri (E), Mumbai, Maharashtra 400093',
      operationsOffice: 'HG1, SNS Platina, Near Someshwara Enclave, Vesu, Surat, Gujarat - 395007',
    },
  },
  aghori: {
    label: 'Aghori',
    code: 'AG',
    logoUrl: 'https://res.cloudinary.com/dvsrgdyi7/image/upload/v1784535471/ag-logo.avif',
    bankDetails: {
      bankName: 'HDFC Bank',
      accountHolder: 'Rudhram Entertainment',
      accountType: 'Current Account',
      accountNumber: '50200095934904',
      ifscCode: 'HDFC0006679',
      upiId: '7285833101@hdfcbank',
    },
    addresses: {
      headOffice: '1171-1172, Solitaire Corporate Park, Andheri Ghatkopar Link Road, Chakala, Nr Technopolis Knowledge Park, Andheri (E), Mumbai, Maharashtra 400093',
      operationsOffice: 'HG1, SNS Platina, Near Someshwara Enclave, Vesu, Surat, Gujarat - 395007',
    },
  },
  house_of_joggi: {
    label: 'House of Joggi',
    code: 'HG',
    logoUrl: '',
    bankDetails: {
      bankName: 'HDFC Bank',
      accountHolder: 'Rudhram Entertainment',
      accountType: 'Current Account',
      accountNumber: '50200095934904',
      ifscCode: 'HDFC0006679',
      upiId: '7285833101@hdfcbank',
    },
    addresses: {
      headOffice: '1171-1172, Solitaire Corporate Park, Andheri Ghatkopar Link Road, Chakala, Nr Technopolis Knowledge Park, Andheri (E), Mumbai, Maharashtra 400093',
      operationsOffice: 'HG1, SNS Platina, Near Someshwara Enclave, Vesu, Surat, Gujarat - 395007',
    },
  },
  damrru: {
    label: 'Damrru',
    code: 'DM',
    logoUrl: '',
    bankDetails: {
      bankName: 'HDFC Bank',
      accountHolder: 'Rudhram Entertainment',
      accountType: 'Current Account',
      accountNumber: '50200095934904',
      ifscCode: 'HDFC0006679',
      upiId: '7285833101@hdfcbank',
    },
    addresses: {
      headOffice: '1171-1172, Solitaire Corporate Park, Andheri Ghatkopar Link Road, Chakala, Nr Technopolis Knowledge Park, Andheri (E), Mumbai, Maharashtra 400093',
      operationsOffice: 'HG1, SNS Platina, Near Someshwara Enclave, Vesu, Surat, Gujarat - 395007',
    },
  },
  tandavs: {
    label: 'Tandavs',
    code: 'TD',
    logoUrl: '',
    bankDetails: {
      bankName: 'HDFC Bank',
      accountHolder: 'Rudhram Entertainment',
      accountType: 'Current Account',
      accountNumber: '50200095934904',
      ifscCode: 'HDFC0006679',
      upiId: '7285833101@hdfcbank',
    },
    addresses: {
      headOffice: '1171-1172, Solitaire Corporate Park, Andheri Ghatkopar Link Road, Chakala, Nr Technopolis Knowledge Park, Andheri (E), Mumbai, Maharashtra 400093',
      operationsOffice: 'HG1, SNS Platina, Near Someshwara Enclave, Vesu, Surat, Gujarat - 395007',
    },
  },
  kapaalik: {
    label: 'Kapaalik',
    code: 'KP',
    logoUrl: '',
    bankDetails: {
      bankName: 'HDFC Bank',
      accountHolder: 'Rudhram Entertainment',
      accountType: 'Current Account',
      accountNumber: '50200095934904',
      ifscCode: 'HDFC0006679',
      upiId: '7285833101@hdfcbank',
    },
    addresses: {
      headOffice: '1171-1172, Solitaire Corporate Park, Andheri Ghatkopar Link Road, Chakala, Nr Technopolis Knowledge Park, Andheri (E), Mumbai, Maharashtra 400093',
      operationsOffice: 'HG1, SNS Platina, Near Someshwara Enclave, Vesu, Surat, Gujarat - 395007',
    },
  },
  kalyannam: {
    label: 'Kalyannam',
    code: 'KL',
    logoUrl: '',
    bankDetails: {
      bankName: 'HDFC Bank',
      accountHolder: 'Rudhram Entertainment',
      accountType: 'Current Account',
      accountNumber: '50200095934904',
      ifscCode: 'HDFC0006679',
      upiId: '7285833101@hdfcbank',
    },
    addresses: {
      headOffice: '1171-1172, Solitaire Corporate Park, Andheri Ghatkopar Link Road, Chakala, Nr Technopolis Knowledge Park, Andheri (E), Mumbai, Maharashtra 400093',
      operationsOffice: 'HG1, SNS Platina, Near Someshwara Enclave, Vesu, Surat, Gujarat - 395007',
    },
  },
  storage_media_solution: {
    label: 'Storage Media Solution',
    code: 'SM',
    logoUrl: '',
    bankDetails: {
      bankName: 'HDFC Bank',
      accountHolder: 'Rudhram Entertainment',
      accountType: 'Current Account',
      accountNumber: '50200095934904',
      ifscCode: 'HDFC0006679',
      upiId: '7285833101@hdfcbank',
    },
    addresses: {
      headOffice: '1171-1172, Solitaire Corporate Park, Andheri Ghatkopar Link Road, Chakala, Nr Technopolis Knowledge Park, Andheri (E), Mumbai, Maharashtra 400093',
      operationsOffice: 'HG1, SNS Platina, Near Someshwara Enclave, Vesu, Surat, Gujarat - 395007',
    },
  },
};

export const getVentureConfig = (brand) => {
  return VENTURES[brand] || VENTURES.panigrahna;
};
