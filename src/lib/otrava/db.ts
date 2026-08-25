import { defaultAppSettings, defaultCompany } from "./defaults";
import type {
  AppSettings,
  AuditEntry,
  BackupPackage,
  BackupRecord,
  CatalogueItem,
  CompanySettings,
  Customer,
  Invoice,
  OtravaData,
  Payment,
  Quotation,
  SequenceRecord,
} from "./types";

const DB_NAME = "otrava-technologies";
const DB_VERSION = 1;
const STORES = [
  "company",
  "app",
  "customers",
  "items",
  "quotations",
  "invoices",
  "payments",
  "sequences",
  "audit",
  "backups",
] as const;

type StoreName = (typeof STORES)[number];

let dbPromise: Promise<IDBDatabase> | null = null;

function isBrowser() {
  return typeof indexedDB !== "undefined";
}

function openDb(): Promise<IDBDatabase> {
  if (!isBrowser()) {
    return Promise.reject(new Error("IndexedDB is not available."));
  }
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const name of STORES) {
        if (!db.objectStoreNames.contains(name)) {
          if (name === "company" || name === "app") {
            db.createObjectStore(name);
          } else {
            db.createObjectStore(name, { keyPath: "id" });
          }
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      dbPromise = null;
      reject(req.error ?? new Error("Failed to open the local database."));
    };
  });
  return dbPromise;
}

function reqToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error("Transaction aborted."));
  });
}

export async function loadAll(): Promise<OtravaData> {
  const empty: OtravaData = {
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
  };
  if (!isBrowser()) return empty;

  try {
    const db = await openDb();
    const tx = db.transaction([...STORES], "readonly");
    const company =
      (await reqToPromise(
        tx.objectStore("company").get("current") as IDBRequest<CompanySettings | undefined>,
      )) ?? defaultCompany();
    const app =
      (await reqToPromise(
        tx.objectStore("app").get("current") as IDBRequest<AppSettings | undefined>,
      )) ?? defaultAppSettings();
    const customers = (await reqToPromise(
      tx.objectStore("customers").getAll() as IDBRequest<Customer[]>,
    )) as Customer[];
    const items = (await reqToPromise(
      tx.objectStore("items").getAll() as IDBRequest<CatalogueItem[]>,
    )) as CatalogueItem[];
    const quotations = (await reqToPromise(
      tx.objectStore("quotations").getAll() as IDBRequest<Quotation[]>,
    )) as Quotation[];
    const invoices = (await reqToPromise(
      tx.objectStore("invoices").getAll() as IDBRequest<Invoice[]>,
    )) as Invoice[];
    const payments = (await reqToPromise(
      tx.objectStore("payments").getAll() as IDBRequest<Payment[]>,
    )) as Payment[];
    const sequences = (await reqToPromise(
      tx.objectStore("sequences").getAll() as IDBRequest<SequenceRecord[]>,
    )) as SequenceRecord[];
    const audit = (await reqToPromise(
      tx.objectStore("audit").getAll() as IDBRequest<AuditEntry[]>,
    )) as AuditEntry[];
    const backups = (await reqToPromise(
      tx.objectStore("backups").getAll() as IDBRequest<BackupRecord[]>,
    )) as BackupRecord[];
    await txDone(tx);
    return {
      company: { ...defaultCompany(), ...company },
      app: { ...defaultAppSettings(), ...app },
      customers,
      items,
      quotations,
      invoices,
      payments,
      sequences,
      audit: audit.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 500),
      backups: backups.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    };
  } catch {
    return empty;
  }
}

export async function putCompany(company: CompanySettings): Promise<void> {
  const db = await openDb();
  const tx = db.transaction("company", "readwrite");
  tx.objectStore("company").put(company, "current");
  await txDone(tx);
}

export async function putApp(app: AppSettings): Promise<void> {
  const db = await openDb();
  const tx = db.transaction("app", "readwrite");
  tx.objectStore("app").put(app, "current");
  await txDone(tx);
}

export async function putRecord<T extends { id: string }>(
  store: Exclude<StoreName, "company" | "app">,
  record: T,
): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(store, "readwrite");
  tx.objectStore(store).put(record);
  await txDone(tx);
}

export async function deleteRecord(
  store: Exclude<StoreName, "company" | "app">,
  id: string,
): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(store, "readwrite");
  tx.objectStore(store).delete(id);
  await txDone(tx);
}

export async function putMany(
  ops: Array<{ store: StoreName; value: unknown; key?: IDBValidKey }>,
): Promise<void> {
  const db = await openDb();
  const names = Array.from(new Set(ops.map((o) => o.store)));
  const tx = db.transaction(names, "readwrite");
  for (const op of ops) {
    if (op.key !== undefined) tx.objectStore(op.store).put(op.value, op.key);
    else tx.objectStore(op.store).put(op.value);
  }
  await txDone(tx);
}

export async function replaceAll(data: BackupPackage): Promise<void> {
  const db = await openDb();
  const tx = db.transaction([...STORES], "readwrite");
  for (const name of STORES) tx.objectStore(name).clear();
  tx.objectStore("company").put(data.company, "current");
  tx.objectStore("app").put(data.app, "current");
  for (const row of data.customers) tx.objectStore("customers").put(row);
  for (const row of data.items) tx.objectStore("items").put(row);
  for (const row of data.quotations) tx.objectStore("quotations").put(row);
  for (const row of data.invoices) tx.objectStore("invoices").put(row);
  for (const row of data.payments) tx.objectStore("payments").put(row);
  for (const row of data.sequences) tx.objectStore("sequences").put(row);
  for (const row of data.audit) tx.objectStore("audit").put(row);
  await txDone(tx);
}

export function buildPackage(data: OtravaData): BackupPackage {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    company: data.company,
    app: { ...data.app, setupComplete: true },
    customers: data.customers,
    items: data.items,
    quotations: data.quotations,
    invoices: data.invoices,
    payments: data.payments,
    sequences: data.sequences,
    audit: data.audit,
  };
}

export function parseBackup(raw: string): BackupPackage {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("This file is not a valid Otrava backup.");
  }
  const pkg = parsed as Partial<BackupPackage>;
  if (!pkg || pkg.version !== 1 || !pkg.company || !Array.isArray(pkg.customers)) {
    throw new Error("This backup is missing required business data.");
  }
  return {
    version: 1,
    exportedAt: pkg.exportedAt ?? new Date().toISOString(),
    company: { ...defaultCompany(), ...pkg.company },
    app: { ...defaultAppSettings(), ...pkg.app, setupComplete: true },
    customers: pkg.customers ?? [],
    items: pkg.items ?? [],
    quotations: pkg.quotations ?? [],
    invoices: pkg.invoices ?? [],
    payments: pkg.payments ?? [],
    sequences: pkg.sequences ?? [],
    audit: pkg.audit ?? [],
  };
}
