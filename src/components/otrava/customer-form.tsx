import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/label";
import { Input, Textarea } from "@/components/ui/input";
import type { Customer } from "@/lib/otrava/types";
import { validateCustomer } from "@/lib/otrava/validation";

export type CustomerDraft = Omit<Customer, "id" | "code" | "createdAt" | "modifiedAt">;

export function CustomerForm({
  initial,
  onSubmit,
  onCancel,
  busy,
}: {
  initial?: Partial<CustomerDraft>;
  onSubmit: (data: CustomerDraft) => Promise<void> | void;
  onCancel: () => void;
  busy?: boolean;
}) {
  const [form, setForm] = useState<CustomerDraft>({
    name: "",
    companyName: "",
    phone: "",
    email: "",
    physicalAddress: "",
    postalAddress: "",
    city: "",
    country: "Zambia",
    taxNumber: "",
    notes: "",
    active: true,
    ...initial,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const patch = (p: Partial<CustomerDraft>) => setForm((f) => ({ ...f, ...p }));

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const next = validateCustomer(form);
        setErrors(next);
        if (Object.keys(next).length) return;
        void onSubmit(form);
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Customer name" error={errors.name}>
          <Input value={form.name} onChange={(e) => patch({ name: e.target.value })} />
        </Field>
        <Field label="Company name">
          <Input
            value={form.companyName}
            onChange={(e) => patch({ companyName: e.target.value })}
          />
        </Field>
        <Field label="Phone">
          <Input value={form.phone} onChange={(e) => patch({ phone: e.target.value })} />
        </Field>
        <Field label="Email" error={errors.email}>
          <Input value={form.email} onChange={(e) => patch({ email: e.target.value })} />
        </Field>
        <Field label="City">
          <Input value={form.city} onChange={(e) => patch({ city: e.target.value })} />
        </Field>
        <Field label="Country">
          <Input value={form.country} onChange={(e) => patch({ country: e.target.value })} />
        </Field>
      </div>
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
      <Field label="Tax / VAT number">
        <Input value={form.taxNumber} onChange={(e) => patch({ taxNumber: e.target.value })} />
      </Field>
      <Field label="Notes">
        <Textarea value={form.notes} onChange={(e) => patch({ notes: e.target.value })} />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.active}
          onChange={(e) => patch({ active: e.target.checked })}
        />
        Active customer
      </label>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save customer"}
        </Button>
      </div>
    </form>
  );
}
