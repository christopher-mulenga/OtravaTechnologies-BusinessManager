import { create } from "zustand";
import { calculateDocument, invoiceBalances } from "./calculations";
import {
  defaultAppSettings,
  defaultCompany,
  SAMPLE_CATALOGUE,
  snapshotFromCustomer,
} from "./defaults";
import {
  buildPackage,
  deleteRecord,
  loadAll,
  parseBackup,
  putApp,
  putCompany,
  putMany,
  putRecord,
  replaceAll,
} from "./db";
import { newId } from "./format";
import {
  addDaysIso,
  effectiveInvoiceStatus,
  effectiveQuotationStatus,
  formatDocumentNumber,
  formatMasterCode,
  sequenceKey,
} from "./numbering";
import type {
  AppSettings,
  AuditEntry,
  BackupPackage,
  BackupRecord,
  CatalogueItem,
  CompanySettings,
  Customer,
  Invoice,
  LineItem,
  OtravaData,
  Payment,
  PaymentMethod,
  Quotation,
  QuotationStatus,
  SequenceRecord,
} from "./types";

export interface OtravaState extends OtravaData {
  ready: boolean;
  error: string | null;
  hydrate: () => Promise<void>;
  saveCompany: (patch: Partial<CompanySettings>) => Promise<void>;
  saveApp: (patch: Partial<AppSettings>) => Promise<void>;
  completeSetup: (payload: {
    company: Partial<CompanySettings>;
    app: Partial<AppSettings>;
    loadSampleCatalogue: boolean;
  }) => Promise<void>;
  saveCustomer: (
    input: Omit<Customer, "id" | "code" | "createdAt" | "modifiedAt"> & {
      id?: string;
    },
  ) => Promise<Customer>;
  deactivateCustomer: (id: string) => Promise<void>;
  deleteCustomer: (id: string) => Promise<"deleted" | "deactivated">;
  saveItem: (
    input: Omit<CatalogueItem, "id" | "createdAt" | "modifiedAt"> & {
      id?: string;
    },
  ) => Promise<CatalogueItem>;
  deleteItem: (id: string) => Promise<void>;
  loadSampleCatalogue: () => Promise<void>;
  saveQuotation: (
    input: Omit<Quotation, "id" | "number" | "createdAt" | "modifiedAt"> & {
      id?: string;
      number?: string;
    },
  ) => Promise<Quotation>;
  deleteQuotation: (id: string) => Promise<void>;
  duplicateQuotation: (id: string) => Promise<Quotation>;
  convertQuotation: (id: string) => Promise<Invoice>;
  saveInvoice: (
    input: Omit<Invoice, "id" | "number" | "createdAt" | "modifiedAt"> & {
      id?: string;
      number?: string;
    },
  ) => Promise<Invoice>;
  deleteInvoice: (id: string) => Promise<void>;
  duplicateInvoice: (id: string) => Promise<Invoice>;
  recordPayment: (input: {
    invoiceId: string;
    amount: number;
    date: string;
    method: PaymentMethod;
    reference: string;
    notes: string;
    id?: string;
  }) => Promise<Payment>;
  deletePayment: (id: string) => Promise<void>;
  exportBackup: () => BackupPackage;
  saveLocalBackup: (label: string, automatic?: boolean) => Promise<BackupRecord>;
  restoreBackup: (raw: string) => Promise<void>;
  restoreLocalBackup: (id: string) => Promise<void>;
  deleteLocalBackup: (id: string) => Promise<void>;
}

function nowIso() {
  return new Date().toISOString();
}

function nextSeq(sequences: SequenceRecord[], key: string): {
  value: number;
  sequences: SequenceRecord[];
} {
  const existing = sequences.find((s) => s.key === key);
  const value = existing?.nextNumber ?? 1;
  const next = sequences.filter((s) => s.key !== key).concat({
    id: key,
    key,
    nextNumber: value + 1,
  } as SequenceRecord & { id: string });
  return { value, sequences: next };
}

function audit(
  user: string,
  action: string,
  entity: string,
  entityId: string,
  description: string,
): AuditEntry {
  return {
    id: newId("aud"),
    action,
    entity,
    entityId,
    date: nowIso(),
    user,
    description,
  };
}

function blankLine(): LineItem {
  return {
    id: newId("ln"),
    catalogueItemId: null,
    description: "",
    quantity: 1,
    unitPrice: 0,
    discountType: "percent",
    discountValue: 0,
    taxRate: 0,
  };
}

export function createBlankLine(taxRate = 0): LineItem {
  return { ...blankLine(), taxRate };
}

export const useOtravaStore = create<OtravaState>((set, get) => ({
  ready: false,
  error: null,
  company: defaultCompany(),
  app: defaultAppSettings(),
  customers: [],
  items: [],
  quotations: [],
  invoices: [],
  payments: [],
  sequences: [],
  audit: [],
  backups: [],

  hydrate: async () => {
    try {
      const data = await loadAll();
      set({ ...data, ready: true, error: null });
      const state = get();
      if (state.app.autoBackup && state.app.setupComplete) {
        const last = state.app.lastAutoBackupAt
          ? new Date(state.app.lastAutoBackupAt).getTime()
          : 0;
        const interval =
          state.app.autoBackupFrequency === "weekly"
            ? 7 * 86_400_000
            : 86_400_000;
        if (Date.now() - last > interval) {
          void get().saveLocalBackup("Automatic backup", true);
        }
      }
    } catch (err) {
      set({
        ready: true,
        error:
          err instanceof Error
            ? err.message
            : "Could not load the local database.",
      });
    }
  },

  saveCompany: async (patch) => {
    const company = { ...get().company, ...patch };
    await putCompany(company);
    set({ company });
  },

  saveApp: async (patch) => {
    const app = { ...get().app, ...patch };
    await putApp(app);
    set({ app });
  },

  completeSetup: async ({ company, app, loadSampleCatalogue }) => {
    const nextCompany = { ...get().company, ...company };
    const nextApp = { ...get().app, ...app, setupComplete: true };
    await putCompany(nextCompany);
    await putApp(nextApp);
    set({ company: nextCompany, app: nextApp });
    if (loadSampleCatalogue) await get().loadSampleCatalogue();
    const entry = audit(
      nextCompany.localUsername,
      "setup_completed",
      "settings",
      "company",
      "Initial company setup completed.",
    );
    await putRecord("audit", entry);
    set({ audit: [entry, ...get().audit] });
  },

  saveCustomer: async (input) => {
    const state = get();
    const existing = input.id
      ? state.customers.find((c) => c.id === input.id)
      : undefined;
    let sequences = state.sequences;
    let code = existing?.code;
    const ops: Array<{ store: "customers" | "sequences" | "audit"; value: unknown }> =
      [];
    if (!code) {
      const n = nextSeq(sequences, "customer");
      sequences = n.sequences;
      code = formatMasterCode("CUS", n.value);
      ops.push({ store: "sequences", value: sequences.find((s) => s.key === "customer") });
    }
    const customer: Customer = {
      id: existing?.id ?? newId("cus"),
      code,
      name: (input.name ?? "").trim(),
      companyName: (input.companyName ?? "").trim(),
      phone: (input.phone ?? "").trim(),
      email: (input.email ?? "").trim(),
      physicalAddress: (input.physicalAddress ?? "").trim(),
      postalAddress: (input.postalAddress ?? "").trim(),
      city: (input.city ?? "").trim(),
      country: (input.country ?? "").trim(),
      taxNumber: (input.taxNumber ?? "").trim(),
      notes: (input.notes ?? "").trim(),
      active: input.active,
      createdAt: existing?.createdAt ?? nowIso(),
      modifiedAt: nowIso(),
    };
    const entry = audit(
      state.company.localUsername,
      existing ? "customer_updated" : "customer_created",
      "customer",
      customer.id,
      existing
        ? `Updated customer ${customer.name}.`
        : `Created customer ${customer.name}.`,
    );
    ops.push({ store: "customers", value: customer });
    ops.push({ store: "audit", value: entry });
    await putMany(ops);
    set({
      customers: existing
        ? state.customers.map((c) => (c.id === customer.id ? customer : c))
        : [...state.customers, customer],
      sequences,
      audit: [entry, ...state.audit],
    });
    return customer;
  },

  deactivateCustomer: async (id) => {
    const customer = get().customers.find((c) => c.id === id);
    if (!customer) return;
    await get().saveCustomer({ ...customer, active: false });
  },

  deleteCustomer: async (id) => {
    const state = get();
    const hasDocs =
      state.quotations.some((q) => q.customerId === id) ||
      state.invoices.some((i) => i.customerId === id);
    if (hasDocs) {
      await get().deactivateCustomer(id);
      return "deactivated";
    }
    const customer = state.customers.find((c) => c.id === id);
    const entry = audit(
      state.company.localUsername,
      "customer_deleted",
      "customer",
      id,
      `Deleted customer ${customer?.name ?? id}.`,
    );
    await putMany([
      { store: "audit", value: entry },
    ]);
    await deleteRecord("customers", id);
    set({
      customers: state.customers.filter((c) => c.id !== id),
      audit: [entry, ...state.audit],
    });
    return "deleted";
  },

  saveItem: async (input) => {
    const state = get();
    const existing = input.id
      ? state.items.find((c) => c.id === input.id)
      : undefined;
    let sequences = state.sequences;
    let code = input.code?.trim() || existing?.code;
    const ops: Array<{ store: "items" | "sequences" | "audit"; value: unknown }> = [];
    if (!code) {
      const n = nextSeq(sequences, "item");
      sequences = n.sequences;
      code = formatMasterCode("ITM", n.value);
      ops.push({ store: "sequences", value: sequences.find((s) => s.key === "item") });
    }
    const item: CatalogueItem = {
      id: existing?.id ?? newId("itm"),
      code,
      name: input.name.trim(),
      description: input.description.trim(),
      category: input.category.trim(),
      type: input.type,
      unit: input.unit.trim() || "each",
      price: input.price,
      taxRate: input.taxRate,
      active: input.active,
      createdAt: existing?.createdAt ?? nowIso(),
      modifiedAt: nowIso(),
    };
    const entry = audit(
      state.company.localUsername,
      existing ? "item_updated" : "item_created",
      "item",
      item.id,
      existing ? `Updated ${item.name}.` : `Added ${item.name} to the catalogue.`,
    );
    ops.push({ store: "items", value: item });
    ops.push({ store: "audit", value: entry });
    await putMany(ops);
    set({
      items: existing
        ? state.items.map((c) => (c.id === item.id ? item : c))
        : [...state.items, item],
      sequences,
      audit: [entry, ...state.audit],
    });
    return item;
  },

  deleteItem: async (id) => {
    const state = get();
    const used =
      state.quotations.some((q) => q.items.some((i) => i.catalogueItemId === id)) ||
      state.invoices.some((q) => q.items.some((i) => i.catalogueItemId === id));
    if (used) {
      const item = state.items.find((i) => i.id === id);
      if (item) await get().saveItem({ ...item, active: false });
      return;
    }
    await deleteRecord("items", id);
    set({ items: state.items.filter((i) => i.id !== id) });
  },

  loadSampleCatalogue: async () => {
    const state = get();
    const existingNames = new Set(state.items.map((i) => i.name.toLowerCase()));
    for (const sample of SAMPLE_CATALOGUE) {
      if (existingNames.has(sample.name.toLowerCase())) continue;
      await get().saveItem({ ...sample, code: "" });
    }
  },

  saveQuotation: async (input) => {
    const state = get();
    const existing = input.id
      ? state.quotations.find((q) => q.id === input.id)
      : undefined;
    if (existing?.status === "converted") {
      throw new Error("Converted quotations cannot be edited.");
    }
    let sequences = state.sequences;
    let number = existing?.number ?? input.number;
    const ops: Array<{
      store: "quotations" | "sequences" | "audit";
      value: unknown;
    }> = [];
    if (!number) {
      const year = new Date(input.date).getFullYear();
      const key = sequenceKey("quotation", year);
      const n = nextSeq(sequences, key);
      sequences = n.sequences;
      number = formatDocumentNumber(state.company.quotationPrefix, year, n.value);
      ops.push({ store: "sequences", value: sequences.find((s) => s.key === key) });
    }
    const quotation: Quotation = {
      id: existing?.id ?? newId("qt"),
      number,
      date: input.date,
      validUntil: input.validUntil,
      customerId: input.customerId,
      customerSnapshot: input.customerSnapshot,
      items: input.items,
      notes: input.notes,
      terms: input.terms,
      preparedBy: input.preparedBy || state.company.localUsername,
      status: input.status,
      convertedInvoiceId: existing?.convertedInvoiceId ?? null,
      createdAt: existing?.createdAt ?? nowIso(),
      modifiedAt: nowIso(),
    };
    const entry = audit(
      state.company.localUsername,
      existing ? "quotation_updated" : "quotation_created",
      "quotation",
      quotation.id,
      existing
        ? `Updated quotation ${quotation.number}.`
        : `Created quotation ${quotation.number}.`,
    );
    ops.push({ store: "quotations", value: quotation });
    ops.push({ store: "audit", value: entry });
    await putMany(ops);
    set({
      quotations: existing
        ? state.quotations.map((q) => (q.id === quotation.id ? quotation : q))
        : [...state.quotations, quotation],
      sequences,
      audit: [entry, ...state.audit],
    });
    return quotation;
  },

  deleteQuotation: async (id) => {
    const state = get();
    const q = state.quotations.find((x) => x.id === id);
    if (!q) return;
    if (q.status === "converted") {
      throw new Error("Converted quotations cannot be deleted.");
    }
    const entry = audit(
      state.company.localUsername,
      "quotation_deleted",
      "quotation",
      id,
      `Deleted quotation ${q.number}.`,
    );
    await deleteRecord("quotations", id);
    await putRecord("audit", entry);
    set({
      quotations: state.quotations.filter((x) => x.id !== id),
      audit: [entry, ...state.audit],
    });
  },

  duplicateQuotation: async (id) => {
    const q = get().quotations.find((x) => x.id === id);
    if (!q) throw new Error("Quotation not found.");
    const company = get().company;
    return get().saveQuotation({
      date: nowIso(),
      validUntil: addDaysIso(nowIso(), company.defaultValidityDays),
      customerId: q.customerId,
      customerSnapshot: q.customerSnapshot,
      items: q.items.map((i) => ({ ...i, id: newId("ln") })),
      notes: q.notes,
      terms: q.terms,
      preparedBy: company.localUsername,
      status: "draft",
      convertedInvoiceId: null,
    });
  },

  convertQuotation: async (id) => {
    const state = get();
    const quotation = state.quotations.find((q) => q.id === id);
    if (!quotation) throw new Error("Quotation not found.");
    if (quotation.status === "converted" && quotation.convertedInvoiceId) {
      const existing = state.invoices.find(
        (i) => i.id === quotation.convertedInvoiceId,
      );
      if (existing) return existing;
    }
    const year = new Date().getFullYear();
    const key = sequenceKey("invoice", year);
    const n = nextSeq(state.sequences, key);
    const number = formatDocumentNumber(
      state.company.invoicePrefix,
      year,
      n.value,
    );
    const invoice: Invoice = {
      id: newId("inv"),
      number,
      date: nowIso(),
      dueDate: addDaysIso(nowIso(), state.company.defaultPaymentDays),
      customerId: quotation.customerId,
      customerSnapshot: quotation.customerSnapshot,
      items: quotation.items.map((i) => ({ ...i, id: newId("ln") })),
      notes: quotation.notes,
      terms: state.company.defaultInvoiceTerms,
      preparedBy: state.company.localUsername,
      status: "issued",
      quotationId: quotation.id,
      quotationNumber: quotation.number,
      createdAt: nowIso(),
      modifiedAt: nowIso(),
    };
    const updated: Quotation = {
      ...quotation,
      status: "converted",
      convertedInvoiceId: invoice.id,
      modifiedAt: nowIso(),
    };
    const entry = audit(
      state.company.localUsername,
      "quotation_converted",
      "quotation",
      quotation.id,
      `Converted ${quotation.number} to invoice ${invoice.number}.`,
    );
    await putMany([
      { store: "invoices", value: invoice },
      { store: "quotations", value: updated },
      { store: "sequences", value: n.sequences.find((s) => s.key === key) },
      { store: "audit", value: entry },
    ]);
    set({
      invoices: [...state.invoices, invoice],
      quotations: state.quotations.map((q) => (q.id === updated.id ? updated : q)),
      sequences: n.sequences,
      audit: [entry, ...state.audit],
    });
    return invoice;
  },

  saveInvoice: async (input) => {
    const state = get();
    const existing = input.id
      ? state.invoices.find((q) => q.id === input.id)
      : undefined;
    if (existing) {
      const related = state.payments.filter((p) => p.invoiceId === existing.id);
      const derived = getInvoiceMoney(existing, related, state.company.taxEnabled).status;
      if (derived === "paid" || existing.status === "cancelled") {
        throw new Error("Paid or cancelled invoices cannot be edited.");
      }
    }
    let sequences = state.sequences;
    let number = existing?.number ?? input.number;
    const ops: Array<{ store: "invoices" | "sequences" | "audit"; value: unknown }> =
      [];
    if (!number) {
      const year = new Date(input.date).getFullYear();
      const key = sequenceKey("invoice", year);
      const n = nextSeq(sequences, key);
      sequences = n.sequences;
      number = formatDocumentNumber(state.company.invoicePrefix, year, n.value);
      ops.push({ store: "sequences", value: sequences.find((s) => s.key === key) });
    }
    const invoice: Invoice = {
      id: existing?.id ?? newId("inv"),
      number,
      date: input.date,
      dueDate: input.dueDate,
      customerId: input.customerId,
      customerSnapshot: input.customerSnapshot,
      items: input.items,
      notes: input.notes,
      terms: input.terms,
      preparedBy: input.preparedBy || state.company.localUsername,
      status: input.status === "draft" ? "draft" : input.status === "cancelled" ? "cancelled" : "issued",
      quotationId: existing?.quotationId ?? input.quotationId ?? null,
      quotationNumber: existing?.quotationNumber ?? input.quotationNumber ?? null,
      createdAt: existing?.createdAt ?? nowIso(),
      modifiedAt: nowIso(),
    };
    const entry = audit(
      state.company.localUsername,
      existing ? "invoice_updated" : "invoice_created",
      "invoice",
      invoice.id,
      existing
        ? `Updated invoice ${invoice.number}.`
        : `Created invoice ${invoice.number}.`,
    );
    ops.push({ store: "invoices", value: invoice });
    ops.push({ store: "audit", value: entry });
    await putMany(ops);
    set({
      invoices: existing
        ? state.invoices.map((q) => (q.id === invoice.id ? invoice : q))
        : [...state.invoices, invoice],
      sequences,
      audit: [entry, ...state.audit],
    });
    return invoice;
  },

  deleteInvoice: async (id) => {
    const state = get();
    const inv = state.invoices.find((x) => x.id === id);
    if (!inv) return;
    if (inv.status !== "draft") {
      throw new Error("Only draft invoices can be deleted. Cancel issued invoices instead.");
    }
    const relatedPays = state.payments.filter((p) => p.invoiceId === id);
    for (const p of relatedPays) await deleteRecord("payments", p.id);
    await deleteRecord("invoices", id);
    set({
      invoices: state.invoices.filter((x) => x.id !== id),
      payments: state.payments.filter((p) => p.invoiceId !== id),
    });
  },

  duplicateInvoice: async (id) => {
    const inv = get().invoices.find((x) => x.id === id);
    if (!inv) throw new Error("Invoice not found.");
    const company = get().company;
    return get().saveInvoice({
      date: nowIso(),
      dueDate: addDaysIso(nowIso(), company.defaultPaymentDays),
      customerId: inv.customerId,
      customerSnapshot: inv.customerSnapshot,
      items: inv.items.map((i) => ({ ...i, id: newId("ln") })),
      notes: inv.notes,
      terms: inv.terms,
      preparedBy: company.localUsername,
      status: "draft",
      quotationId: null,
      quotationNumber: null,
    });
  },

  recordPayment: async (input) => {
    const state = get();
    const invoice = state.invoices.find((i) => i.id === input.invoiceId);
    if (!invoice) throw new Error("Invoice not found.");
    if (invoice.status === "cancelled") {
      throw new Error("Cannot record a payment on a cancelled invoice.");
    }
    const existing = input.id
      ? state.payments.find((p) => p.id === input.id)
      : undefined;
    const payment: Payment = {
      id: existing?.id ?? newId("pay"),
      invoiceId: input.invoiceId,
      amount: input.amount,
      date: input.date,
      method: input.method,
      reference: input.reference.trim(),
      notes: input.notes.trim(),
      createdAt: existing?.createdAt ?? nowIso(),
    };
    const entry = audit(
      state.company.localUsername,
      existing ? "payment_updated" : "payment_recorded",
      "payment",
      payment.id,
      `${existing ? "Updated" : "Recorded"} payment on ${invoice.number}.`,
    );
    const issued: Invoice =
      invoice.status === "draft"
        ? { ...invoice, status: "issued", modifiedAt: nowIso() }
        : invoice;
    await putMany([
      { store: "payments", value: payment },
      { store: "invoices", value: issued },
      { store: "audit", value: entry },
    ]);
    set({
      payments: existing
        ? state.payments.map((p) => (p.id === payment.id ? payment : p))
        : [...state.payments, payment],
      invoices: state.invoices.map((i) => (i.id === issued.id ? issued : i)),
      audit: [entry, ...state.audit],
    });
    return payment;
  },

  deletePayment: async (id) => {
    const state = get();
    const payment = state.payments.find((p) => p.id === id);
    if (!payment) return;
    const entry = audit(
      state.company.localUsername,
      "payment_deleted",
      "payment",
      id,
      "Deleted a payment record.",
    );
    await deleteRecord("payments", id);
    await putRecord("audit", entry);
    set({
      payments: state.payments.filter((p) => p.id !== id),
      audit: [entry, ...state.audit],
    });
  },

  exportBackup: () => buildPackage(get()),

  saveLocalBackup: async (label, automatic = false) => {
    const state = get();
    const pkg = buildPackage(state);
    const record: BackupRecord = {
      id: newId("bak"),
      createdAt: nowIso(),
      label,
      automatic,
      payload: JSON.stringify(pkg),
    };
    const kept = [record, ...state.backups]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, state.app.maxBackups || 7);
    const dropped = state.backups.filter((b) => !kept.some((k) => k.id === b.id));
    await putRecord("backups", record);
    for (const d of dropped) await deleteRecord("backups", d.id);
    const app = { ...state.app, lastAutoBackupAt: record.createdAt };
    await putApp(app);
    const entry = audit(
      state.company.localUsername,
      "backup_created",
      "backup",
      record.id,
      automatic ? "Automatic local backup created." : "Manual backup created.",
    );
    await putRecord("audit", entry);
    set({
      backups: kept,
      app,
      audit: [entry, ...state.audit],
    });
    return record;
  },

  restoreBackup: async (raw) => {
    const state = get();
    const safety = buildPackage(state);
    const safetyRecord: BackupRecord = {
      id: newId("bak"),
      createdAt: nowIso(),
      label: "Safety copy before restore",
      automatic: true,
      payload: JSON.stringify(safety),
    };
    await putRecord("backups", safetyRecord);
    const pkg = parseBackup(raw);
    await replaceAll(pkg);
    const data = await loadAll();
    const entry = audit(
      pkg.company.localUsername,
      "restore_performed",
      "backup",
      "restore",
      "Database restored from backup.",
    );
    await putRecord("audit", entry);
    set({
      ...data,
      backups: [safetyRecord, ...data.backups].slice(0, 20),
      audit: [entry, ...data.audit],
      ready: true,
    });
  },

  restoreLocalBackup: async (id) => {
    const record = get().backups.find((b) => b.id === id);
    if (!record) throw new Error("Backup not found.");
    await get().restoreBackup(record.payload);
  },

  deleteLocalBackup: async (id) => {
    await deleteRecord("backups", id);
    set({ backups: get().backups.filter((b) => b.id !== id) });
  },
}));

export function useHydratedOtrava() {
  return useOtravaStore();
}

export function getInvoiceMoney(invoice: Invoice, payments: Payment[], taxEnabled: boolean) {
  const totals = calculateDocument(invoice.items, { taxEnabled });
  const related = payments.filter((p) => p.invoiceId === invoice.id);
  const balances = invoiceBalances(totals.grandTotal, related);
  const status = effectiveInvoiceStatus(
    invoice,
    balances.balanceDue,
    balances.amountPaid,
  );
  return { totals, ...balances, status, payments: related };
}

export function getQuotationMoney(quotation: Quotation, taxEnabled: boolean) {
  const totals = calculateDocument(quotation.items, { taxEnabled });
  const status = effectiveQuotationStatus(quotation);
  return { totals, status };
}

export function customerHasDocuments(customerId: string, state: OtravaData) {
  return (
    state.quotations.some((q) => q.customerId === customerId) ||
    state.invoices.some((i) => i.customerId === customerId)
  );
}

export { snapshotFromCustomer };
