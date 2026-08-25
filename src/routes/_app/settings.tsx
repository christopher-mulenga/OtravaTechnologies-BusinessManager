import { useState, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/label";
import { Input, Textarea } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select";
import { PageHeader } from "@/components/otrava/primitives";
import { useOtravaStore } from "@/lib/otrava/store";
import type { AppSettings, CompanySettings, ThemeMode } from "@/lib/otrava/types";

export const Route = createFileRoute("/_app/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const company = useOtravaStore((s) => s.company);
  const app = useOtravaStore((s) => s.app);
  const saveCompany = useOtravaStore((s) => s.saveCompany);
  const saveApp = useOtravaStore((s) => s.saveApp);
  const audit = useOtravaStore((s) => s.audit);
  const [form, setForm] = useState<CompanySettings>(company);
  const [appForm, setAppForm] = useState<AppSettings>(app);
  const [busy, setBusy] = useState(false);
  const patch = (p: Partial<CompanySettings>) => setForm((f) => ({ ...f, ...p }));
  const patchApp = (p: Partial<AppSettings>) => setAppForm((f) => ({ ...f, ...p }));

  const save = async () => {
    if (!form.name.trim()) {
      toast.error("Company name is required.");
      return;
    }
    setBusy(true);
    try {
      await saveCompany(form);
      await saveApp(appForm);
      toast.success("Settings saved.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Company profile, documents, tax, currency, appearance, and backup preferences."
        actions={
          <Button onClick={() => void save()} disabled={busy}>
            {busy ? "Saving…" : "Save settings"}
          </Button>
        }
      />

      <div className="space-y-8">
        <Section title="Company">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Company name">
              <Input value={form.name} onChange={(e) => patch({ name: e.target.value })} />
            </Field>
            <Field label="Local username">
              <Input
                value={form.localUsername}
                onChange={(e) => patch({ localUsername: e.target.value })}
              />
            </Field>
            <Field label="Phone">
              <Input value={form.phone} onChange={(e) => patch({ phone: e.target.value })} />
            </Field>
            <Field label="Alternate phone">
              <Input value={form.phoneAlt} onChange={(e) => patch({ phoneAlt: e.target.value })} />
            </Field>
            <Field label="Email">
              <Input value={form.email} onChange={(e) => patch({ email: e.target.value })} />
            </Field>
            <Field label="Website">
              <Input value={form.website} onChange={(e) => patch({ website: e.target.value })} />
            </Field>
            <Field label="Tax / VAT number">
              <Input value={form.taxNumber} onChange={(e) => patch({ taxNumber: e.target.value })} />
            </Field>
            <Field label="Registration number">
              <Input
                value={form.registrationNumber}
                onChange={(e) => patch({ registrationNumber: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Business address">
            <Textarea
              value={form.businessAddress}
              onChange={(e) => patch({ businessAddress: e.target.value })}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Physical address">
              <Textarea
                value={form.physicalAddress}
                onChange={(e) => patch({ physicalAddress: e.target.value })}
              />
            </Field>
            <Field label="Postal address">
              <Textarea
                value={form.postalAddress}
                onChange={(e) => patch({ postalAddress: e.target.value })}
              />
            </Field>
          </div>
        </Section>

        <Section title="Company branding">
          <Field label="Logo" hint="PNG or JPG. Stored locally with your data.">
            <Input
              type="file"
              accept="image/png,image/jpeg"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                  const img = new Image();
                  img.onload = () => {
                    const canvas = document.createElement("canvas");
                    const max = 400;
                    const scale = Math.min(1, max / Math.max(img.width, img.height));
                    canvas.width = Math.max(1, Math.round(img.width * scale));
                    canvas.height = Math.max(1, Math.round(img.height * scale));
                    canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
                    patch({ logoDataUrl: canvas.toDataURL("image/png") });
                  };
                  img.src = String(reader.result);
                };
                reader.readAsDataURL(file);
              }}
            />
          </Field>
          {form.logoDataUrl ? (
            <div className="flex items-center gap-3">
              <img
                src={form.logoDataUrl}
                alt="Logo preview"
                className="h-16 w-16 rounded-md border border-border object-contain"
              />
              <Button variant="outline" onClick={() => patch({ logoDataUrl: null })}>
                Remove logo
              </Button>
            </div>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Primary colour">
              <Input
                type="color"
                value={form.primaryColor}
                onChange={(e) => patch({ primaryColor: e.target.value })}
              />
            </Field>
            <Field label="Secondary colour">
              <Input
                type="color"
                value={form.secondaryColor}
                onChange={(e) => patch({ secondaryColor: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Footer text">
            <Input value={form.footerText} onChange={(e) => patch({ footerText: e.target.value })} />
          </Field>
        </Section>

        <Section title="Documents">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Quotation prefix">
              <Input
                value={form.quotationPrefix}
                onChange={(e) => patch({ quotationPrefix: e.target.value })}
              />
            </Field>
            <Field label="Invoice prefix">
              <Input
                value={form.invoicePrefix}
                onChange={(e) => patch({ invoicePrefix: e.target.value })}
              />
            </Field>
            <Field label="Default validity (days)">
              <Input
                type="number"
                min={1}
                value={form.defaultValidityDays}
                onChange={(e) => patch({ defaultValidityDays: Number(e.target.value) })}
              />
            </Field>
            <Field label="Default payment terms (days)">
              <Input
                type="number"
                min={0}
                value={form.defaultPaymentDays}
                onChange={(e) => patch({ defaultPaymentDays: Number(e.target.value) })}
              />
            </Field>
          </div>
          <Field label="Default quotation terms">
            <Textarea
              value={form.defaultQuotationTerms}
              onChange={(e) => patch({ defaultQuotationTerms: e.target.value })}
            />
          </Field>
          <Field label="Default invoice terms">
            <Textarea
              value={form.defaultInvoiceTerms}
              onChange={(e) => patch({ defaultInvoiceTerms: e.target.value })}
            />
          </Field>
          <Field label="Default notes">
            <Textarea
              value={form.defaultNotes}
              onChange={(e) => patch({ defaultNotes: e.target.value })}
            />
          </Field>
        </Section>

        <Section title="Tax">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.taxEnabled}
              onChange={(e) => patch({ taxEnabled: e.target.checked })}
            />
            Tax enabled
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tax label">
              <Input value={form.taxLabel} onChange={(e) => patch({ taxLabel: e.target.value })} />
            </Field>
            <Field label="Default tax rate (%)">
              <Input
                type="number"
                min={0}
                max={100}
                value={form.defaultTaxRate}
                onChange={(e) => patch({ defaultTaxRate: Number(e.target.value) })}
              />
            </Field>
          </div>
        </Section>

        <Section title="Currency">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Currency code">
              <Input
                value={form.currencyCode}
                onChange={(e) => patch({ currencyCode: e.target.value })}
              />
            </Field>
            <Field label="Symbol">
              <Input
                value={form.currencySymbol}
                onChange={(e) => patch({ currencySymbol: e.target.value })}
              />
            </Field>
            <Field label="Decimal places">
              <Input
                type="number"
                min={0}
                max={4}
                value={form.decimalPlaces}
                onChange={(e) => patch({ decimalPlaces: Number(e.target.value) })}
              />
            </Field>
          </div>
        </Section>

        <Section title="Bank / payment information">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Bank name">
              <Input value={form.bankName} onChange={(e) => patch({ bankName: e.target.value })} />
            </Field>
            <Field label="Branch">
              <Input
                value={form.bankBranch}
                onChange={(e) => patch({ bankBranch: e.target.value })}
              />
            </Field>
            <Field label="Account name">
              <Input
                value={form.bankAccountName}
                onChange={(e) => patch({ bankAccountName: e.target.value })}
              />
            </Field>
            <Field label="Account number">
              <Input
                value={form.bankAccountNumber}
                onChange={(e) => patch({ bankAccountNumber: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Payment instructions">
            <Textarea
              value={form.paymentInfo}
              onChange={(e) => patch({ paymentInfo: e.target.value })}
            />
          </Field>
        </Section>

        <Section title="Appearance">
          <Field label="Theme">
            <NativeSelect
              value={appForm.theme}
              onChange={(e) => patchApp({ theme: e.target.value as ThemeMode })}
            >
              <option value="system">System default</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </NativeSelect>
          </Field>
          <Field label="Date format">
            <NativeSelect
              value={appForm.dateFormat}
              onChange={(e) =>
                patchApp({ dateFormat: e.target.value as AppSettings["dateFormat"] })
              }
            >
              <option value="dd MMM yyyy">24 Aug 2026</option>
              <option value="dd/MM/yyyy">24/08/2026</option>
              <option value="yyyy-MM-dd">2026-08-24</option>
            </NativeSelect>
          </Field>
        </Section>

        <Section title="Backup">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={appForm.autoBackup}
              onChange={(e) => patchApp({ autoBackup: e.target.checked })}
            />
            Automatic local backups
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Frequency">
              <NativeSelect
                value={appForm.autoBackupFrequency}
                onChange={(e) =>
                  patchApp({
                    autoBackupFrequency: e.target.value as AppSettings["autoBackupFrequency"],
                  })
                }
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </NativeSelect>
            </Field>
            <Field label="Maximum backups to keep">
              <Input
                type="number"
                min={1}
                max={30}
                value={appForm.maxBackups}
                onChange={(e) => patchApp({ maxBackups: Number(e.target.value) })}
              />
            </Field>
          </div>
        </Section>

        <Section title="Printing">
          <Field label="Paper size">
            <NativeSelect
              value={appForm.paperSize}
              onChange={(e) => patchApp({ paperSize: e.target.value as AppSettings["paperSize"] })}
            >
              <option value="A4">A4</option>
              <option value="Letter">Letter</option>
            </NativeSelect>
          </Field>
        </Section>

        <Section title="Activity log">
          {audit.length === 0 ? (
            <p className="text-sm text-muted">No activity recorded yet.</p>
          ) : (
            <ul className="max-h-64 space-y-2 overflow-auto text-sm">
              {audit.slice(0, 40).map((a) => (
                <li key={a.id} className="border-b border-border pb-2">
                  <span className="text-muted">{new Date(a.date).toLocaleString()} · </span>
                  {a.description}
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5 shadow-soft">
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      <div className="grid gap-4">{children}</div>
    </section>
  );
}
