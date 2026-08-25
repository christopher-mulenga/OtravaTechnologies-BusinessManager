export type ThemeMode = "light" | "dark" | "system";
export type ItemType = "product" | "service";
export type DiscountType = "percent" | "fixed";
export type PaymentMethod =
  | "cash"
  | "bank_transfer"
  | "mobile_money"
  | "card"
  | "other";

export type QuotationStatus =
  | "draft"
  | "sent"
  | "accepted"
  | "rejected"
  | "expired"
  | "converted";

export type InvoiceStatus =
  | "draft"
  | "issued"
  | "partially_paid"
  | "paid"
  | "overdue"
  | "cancelled";

export type PaperSize = "A4" | "Letter";

export interface CompanySettings {
  name: string;
  logoDataUrl: string | null;
  businessAddress: string;
  physicalAddress: string;
  postalAddress: string;
  phone: string;
  phoneAlt: string;
  email: string;
  website: string;
  taxLabel: string;
  taxNumber: string;
  registrationNumber: string;
  defaultQuotationTerms: string;
  defaultInvoiceTerms: string;
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankBranch: string;
  paymentInfo: string;
  currencyCode: string;
  currencySymbol: string;
  decimalPlaces: number;
  invoicePrefix: string;
  quotationPrefix: string;
  footerText: string;
  primaryColor: string;
  secondaryColor: string;
  defaultValidityDays: number;
  defaultPaymentDays: number;
  defaultNotes: string;
  taxEnabled: boolean;
  defaultTaxRate: number;
  localUsername: string;
}

export interface AppSettings {
  theme: ThemeMode;
  setupComplete: boolean;
  autoBackup: boolean;
  autoBackupFrequency: "daily" | "weekly";
  maxBackups: number;
  paperSize: PaperSize;
  dateFormat: "dd MMM yyyy" | "yyyy-MM-dd" | "dd/MM/yyyy";
  lastAutoBackupAt: string | null;
}

export interface CustomerSnapshot {
  name: string;
  companyName: string;
  phone: string;
  email: string;
  physicalAddress: string;
  postalAddress: string;
  city: string;
  country: string;
  taxNumber: string;
}

export interface Customer extends CustomerSnapshot {
  id: string;
  code: string;
  notes: string;
  active: boolean;
  createdAt: string;
  modifiedAt: string;
}

export interface CatalogueItem {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  type: ItemType;
  unit: string;
  price: number;
  taxRate: number;
  active: boolean;
  createdAt: string;
  modifiedAt: string;
}

export interface LineItem {
  id: string;
  catalogueItemId: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  discountType: DiscountType;
  discountValue: number;
  taxRate: number;
}

export interface Quotation {
  id: string;
  number: string;
  date: string;
  validUntil: string;
  customerId: string;
  customerSnapshot: CustomerSnapshot;
  items: LineItem[];
  notes: string;
  terms: string;
  preparedBy: string;
  status: QuotationStatus;
  convertedInvoiceId: string | null;
  createdAt: string;
  modifiedAt: string;
}

export interface Invoice {
  id: string;
  number: string;
  date: string;
  dueDate: string;
  customerId: string;
  customerSnapshot: CustomerSnapshot;
  items: LineItem[];
  notes: string;
  terms: string;
  preparedBy: string;
  status: InvoiceStatus;
  quotationId: string | null;
  quotationNumber: string | null;
  createdAt: string;
  modifiedAt: string;
}

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  date: string;
  method: PaymentMethod;
  reference: string;
  notes: string;
  createdAt: string;
}

export interface SequenceRecord {
  id: string;
  key: string;
  nextNumber: number;
}

export interface AuditEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  date: string;
  user: string;
  description: string;
}

export interface BackupRecord {
  id: string;
  createdAt: string;
  label: string;
  automatic: boolean;
  payload: string;
}

export interface LineTotals {
  quantity: number;
  unitPrice: number;
  lineSubtotal: number;
  discount: number;
  taxable: number;
  tax: number;
  amount: number;
}

export interface DocumentTotals {
  subtotal: number;
  discount: number;
  tax: number;
  grandTotal: number;
  lines: LineTotals[];
}

export interface BackupPackage {
  version: 1;
  exportedAt: string;
  company: CompanySettings;
  app: AppSettings;
  customers: Customer[];
  items: CatalogueItem[];
  quotations: Quotation[];
  invoices: Invoice[];
  payments: Payment[];
  sequences: SequenceRecord[];
  audit: AuditEntry[];
}

export interface OtravaData {
  company: CompanySettings;
  app: AppSettings;
  customers: Customer[];
  items: CatalogueItem[];
  quotations: Quotation[];
  invoices: Invoice[];
  payments: Payment[];
  sequences: SequenceRecord[];
  audit: AuditEntry[];
  backups: BackupRecord[];
}
