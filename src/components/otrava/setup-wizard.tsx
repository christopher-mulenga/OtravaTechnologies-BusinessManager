import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/label";
import { Input, Textarea } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select";
import { defaultCompany } from "@/lib/otrava/defaults";
import { useOtravaStore } from "@/lib/otrava/store";
import type { CompanySettings, ThemeMode } from "@/lib/otrava/types";

const STEPS = [
  "Company",
  "Logo",
  "Currency & tax",
  "Documents",
  "Appearance",
  "Finish",
];

export function SetupWizard() {
  const completeSetup = useOtravaStore((s) => s.completeSetup);
  const existing = useOtravaStore((s) => s.company);
  const [step, setStep] = useState(0);
  const [company, setCompany] = useState<CompanySettings>({
    ...defaultCompany(),
    ...existing,
  });
  const [theme, setTheme] = useState<ThemeMode>("system");
  const [loadSample, setLoadSample] = useState(true);
  const [busy, setBusy] = useState(false);

  const patch = (p: Partial<CompanySettings>) => setCompany((c) => ({ ...c, ...p }));

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const finish = async () => {
    setBusy(true);
    try {
      await completeSetup({
        company,
        app: { theme },
        loadSampleCatalogue: loadSample,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl rounded-xl border border-border bg-surface p-6 shadow-soft sm:p-8">
        <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
          Otrava Technologies
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">
          Welcome. Let’s set up your business.
        </h1>
        <p className="mt-2 text-sm text-muted">
          Everything stays on this computer. You can change these details later in Settings.
        </p>
        <ol className="mt-5 flex flex-wrap gap-2 text-xs">
          {STEPS.map((label, i) => (
            <li
              key={label}
              className={
                i === step
                  ? "rounded-full bg-brand px-3 py-1 font-medium text-primary-foreground"
                  : i < step
                    ? "rounded-full bg-brand-light px-3 py-1 text-brand-dark"
                    : "rounded-full bg-surface-2 px-3 py-1 text-muted"
              }
            >
              {i + 1}. {label}
            </li>
          ))}
        </ol>

        <div className="mt-6 grid gap-4">
          {step === 0 && (
            <>
              <Field label="Company name" error={!company.name.trim() ? "Company name is required." : undefined}>
                <Input value={company.name} onChange={(e) => patch({ name: e.target.value })} />
              </Field>
              <Field label="Business address">
                <Textarea
                  value={company.businessAddress}
                  onChange={(e) => patch({ businessAddress: e.target.value })}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Phone">
                  <Input value={company.phone} onChange={(e) => patch({ phone: e.target.value })} />
                </Field>
                <Field label="Email">
                  <Input value={company.email} onChange={(e) => patch({ email: e.target.value })} />
                </Field>
              </div>
            </>
          )}
          {step === 1 && (
            <Field
              label="Company logo"
              hint="PNG or JPG. Optional — you can add this later."
            >
              <Input
                type="file"
                accept="image/png,image/jpeg,image/svg+xml"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    const data = String(reader.result ?? "");
                    const img = new Image();
                    img.onload = () => {
                      const canvas = document.createElement("canvas");
                      const max = 400;
                      const scale = Math.min(1, max / Math.max(img.width, img.height));
                      canvas.width = Math.max(1, Math.round(img.width * scale));
                      canvas.height = Math.max(1, Math.round(img.height * scale));
                      const ctx = canvas.getContext("2d");
                      if (!ctx) return;
                      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                      patch({ logoDataUrl: canvas.toDataURL("image/png") });
                    };
                    img.src = data;
                  };
                  reader.readAsDataURL(file);
                }}
              />
              {company.logoDataUrl ? (
                <img
                  src={company.logoDataUrl}
                  alt="Company logo preview"
                  className="mt-3 h-20 w-20 rounded-md border border-border object-contain"
                />
              ) : null}
            </Field>
          )}
          {step === 2 && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Currency code">
                  <Input
                    value={company.currencyCode}
                    onChange={(e) => patch({ currencyCode: e.target.value.toUpperCase() })}
                  />
                </Field>
                <Field label="Currency symbol">
                  <Input
                    value={company.currencySymbol}
                    onChange={(e) => patch({ currencySymbol: e.target.value })}
                  />
                </Field>
              </div>
              <Field label="Default tax rate (%)">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={company.defaultTaxRate}
                  onChange={(e) => patch({ defaultTaxRate: Number(e.target.value) })}
                />
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={company.taxEnabled}
                  onChange={(e) => patch({ taxEnabled: e.target.checked })}
                />
                Calculate tax on quotations and invoices
              </label>
            </>
          )}
          {step === 3 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Quotation prefix">
                <Input
                  value={company.quotationPrefix}
                  onChange={(e) => patch({ quotationPrefix: e.target.value.toUpperCase() })}
                />
              </Field>
              <Field label="Invoice prefix">
                <Input
                  value={company.invoicePrefix}
                  onChange={(e) => patch({ invoicePrefix: e.target.value.toUpperCase() })}
                />
              </Field>
              <Field label="Quotation validity (days)">
                <Input
                  type="number"
                  min={1}
                  value={company.defaultValidityDays}
                  onChange={(e) => patch({ defaultValidityDays: Number(e.target.value) })}
                />
              </Field>
              <Field label="Invoice due days">
                <Input
                  type="number"
                  min={0}
                  value={company.defaultPaymentDays}
                  onChange={(e) => patch({ defaultPaymentDays: Number(e.target.value) })}
                />
              </Field>
            </div>
          )}
          {step === 4 && (
            <Field label="Appearance">
              <NativeSelect
                value={theme}
                onChange={(e) => setTheme(e.target.value as ThemeMode)}
              >
                <option value="system">System default</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </NativeSelect>
            </Field>
          )}
          {step === 5 && (
            <div className="space-y-3 text-sm text-foreground">
              <p>
                {company.name} is ready. Data is stored locally in this browser and works
                without an internet connection.
              </p>
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={loadSample}
                  onChange={(e) => setLoadSample(e.target.checked)}
                />
                <span>
                  Add the sample Otrava services catalogue (repair, networking, web
                  development, and more). You can edit or delete these later. No sample
                  invoices will be created.
                </span>
              </label>
            </div>
          )}
        </div>

        <div className="mt-8 flex flex-wrap justify-between gap-2">
          <Button variant="ghost" onClick={back} disabled={step === 0}>
            Back
          </Button>
          <div className="flex gap-2">
            {step < STEPS.length - 1 ? (
              <>
                <Button variant="outline" onClick={next}>
                  Skip
                </Button>
                <Button onClick={next} disabled={step === 0 && !company.name.trim()}>
                  Continue
                </Button>
              </>
            ) : (
              <Button onClick={() => void finish()} disabled={busy || !company.name.trim()}>
                {busy ? "Saving…" : "Go to dashboard"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
