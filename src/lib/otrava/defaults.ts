import type {
  AppSettings,
  CatalogueItem,
  CompanySettings,
  CustomerSnapshot,
} from "./types";

export const BRAND_PRIMARY = "#315B65";
export const BRAND_DARK = "#1E3E45";

export function defaultCompany(): CompanySettings {
  return {
    name: "Otrava Technologies",
    logoDataUrl: null,
    businessAddress: "Lusaka, Zambia",
    physicalAddress: "Lusaka, Zambia",
    postalAddress: "Lusaka, Zambia",
    phone: "",
    phoneAlt: "",
    email: "",
    website: "",
    taxLabel: "VAT",
    taxNumber: "",
    registrationNumber: "",
    defaultQuotationTerms:
      "This quotation is valid for 30 days from the date of issue. Prices are in ZMW. Work commences after written acceptance.",
    defaultInvoiceTerms:
      "Payment is due within 14 days of the invoice date. Please use the invoice number as your payment reference.",
    bankName: "",
    bankAccountName: "Otrava Technologies",
    bankAccountNumber: "",
    bankBranch: "",
    paymentInfo:
      "Please make payment using the bank or mobile money details shown on this document.",
    currencyCode: "ZMW",
    currencySymbol: "K",
    decimalPlaces: 2,
    invoicePrefix: "INV",
    quotationPrefix: "QT",
    footerText: "Thank you for choosing Otrava Technologies.",
    primaryColor: BRAND_PRIMARY,
    secondaryColor: BRAND_DARK,
    defaultValidityDays: 30,
    defaultPaymentDays: 14,
    defaultNotes: "",
    taxEnabled: true,
    defaultTaxRate: 16,
    localUsername: "Administrator",
  };
}

export function defaultAppSettings(): AppSettings {
  return {
    theme: "system",
    setupComplete: false,
    autoBackup: true,
    autoBackupFrequency: "daily",
    maxBackups: 7,
    paperSize: "A4",
    dateFormat: "dd MMM yyyy",
    lastAutoBackupAt: null,
  };
}

export function emptyCustomerSnapshot(): CustomerSnapshot {
  return {
    name: "",
    companyName: "",
    phone: "",
    email: "",
    physicalAddress: "",
    postalAddress: "",
    city: "",
    country: "Zambia",
    taxNumber: "",
  };
}

export function snapshotFromCustomer(c: CustomerSnapshot): CustomerSnapshot {
  return {
    name: c.name,
    companyName: c.companyName,
    phone: c.phone,
    email: c.email,
    physicalAddress: c.physicalAddress,
    postalAddress: c.postalAddress,
    city: c.city,
    country: c.country,
    taxNumber: c.taxNumber,
  };
}

export const SAMPLE_CATALOGUE: Omit<
  CatalogueItem,
  "id" | "code" | "createdAt" | "modifiedAt"
>[] = [
  {
    name: "Computer Repair & IT Support",
    description: "On-site or workshop diagnosis, repair, and support.",
    category: "IT Support",
    type: "service",
    unit: "hour",
    price: 450,
    taxRate: 16,
    active: true,
  },
  {
    name: "Computer Networking",
    description: "LAN/WAN design, cabling, configuration, and support.",
    category: "Networking",
    type: "service",
    unit: "job",
    price: 1200,
    taxRate: 16,
    active: true,
  },
  {
    name: "Website & Digital Services",
    description: "Business website setup, hosting guidance, and digital presence.",
    category: "Digital",
    type: "service",
    unit: "project",
    price: 4500,
    taxRate: 16,
    active: true,
  },
  {
    name: "CCTV & Security Systems",
    description: "Supply, installation, and configuration of CCTV systems.",
    category: "Security",
    type: "service",
    unit: "job",
    price: 3500,
    taxRate: 16,
    active: true,
  },
  {
    name: "IT Consulting",
    description: "Technology advisory, assessments, and implementation planning.",
    category: "Consulting",
    type: "service",
    unit: "hour",
    price: 800,
    taxRate: 16,
    active: true,
  },
  {
    name: "ICT Training",
    description: "Practical ICT skills training for teams and individuals.",
    category: "Training",
    type: "service",
    unit: "day",
    price: 1500,
    taxRate: 16,
    active: true,
  },
  {
    name: "Data Services",
    description: "Data capture, cleaning, reporting, and related data work.",
    category: "Data",
    type: "service",
    unit: "job",
    price: 600,
    taxRate: 16,
    active: true,
  },
  {
    name: "Assistive Technology",
    description: "Assistive technology assessment, setup, and support.",
    category: "Assistive",
    type: "service",
    unit: "job",
    price: 2000,
    taxRate: 16,
    active: true,
  },
  {
    name: "Web Development",
    description: "Custom website and web application development.",
    category: "Development",
    type: "service",
    unit: "project",
    price: 5500,
    taxRate: 16,
    active: true,
  },
  {
    name: "Software Development",
    description: "Bespoke software design and development.",
    category: "Development",
    type: "service",
    unit: "project",
    price: 8000,
    taxRate: 16,
    active: true,
  },
];
