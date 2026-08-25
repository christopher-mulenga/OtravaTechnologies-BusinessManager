import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/label";
import { Input, Textarea } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select";
import type { CatalogueItem, ItemType } from "@/lib/otrava/types";
import { validateCatalogueItem } from "@/lib/otrava/validation";

export type ItemDraft = Omit<CatalogueItem, "id" | "createdAt" | "modifiedAt">;

export function ItemForm({
  initial,
  defaultTaxRate,
  onSubmit,
  onCancel,
  busy,
}: {
  initial?: Partial<ItemDraft>;
  defaultTaxRate: number;
  onSubmit: (data: ItemDraft) => Promise<void> | void;
  onCancel: () => void;
  busy?: boolean;
}) {
  const [form, setForm] = useState<ItemDraft>({
    code: "",
    name: "",
    description: "",
    category: "",
    type: "service",
    unit: "each",
    price: 0,
    taxRate: defaultTaxRate,
    active: true,
    ...initial,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const patch = (p: Partial<ItemDraft>) => setForm((f) => ({ ...f, ...p }));

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const next = validateCatalogueItem(form);
        setErrors(next);
        if (Object.keys(next).length) return;
        void onSubmit(form);
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" error={errors.name}>
          <Input value={form.name} onChange={(e) => patch({ name: e.target.value })} />
        </Field>
        <Field label="Item code">
          <Input
            value={form.code}
            placeholder="Auto if left blank"
            onChange={(e) => patch({ code: e.target.value })}
          />
        </Field>
        <Field label="Type">
          <NativeSelect
            value={form.type}
            onChange={(e) => patch({ type: e.target.value as ItemType })}
          >
            <option value="service">Service</option>
            <option value="product">Product</option>
          </NativeSelect>
        </Field>
        <Field label="Category">
          <Input value={form.category} onChange={(e) => patch({ category: e.target.value })} />
        </Field>
        <Field label="Unit">
          <Input value={form.unit} onChange={(e) => patch({ unit: e.target.value })} />
        </Field>
        <Field label="Price" error={errors.price}>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={form.price}
            onChange={(e) => patch({ price: Number(e.target.value) })}
          />
        </Field>
        <Field label="Tax rate (%)" error={errors.taxRate}>
          <Input
            type="number"
            min={0}
            max={100}
            step="0.01"
            value={form.taxRate}
            onChange={(e) => patch({ taxRate: Number(e.target.value) })}
          />
        </Field>
      </div>
      <Field label="Description">
        <Textarea
          value={form.description}
          onChange={(e) => patch({ description: e.target.value })}
        />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.active}
          onChange={(e) => patch({ active: e.target.checked })}
        />
        Active in catalogue
      </label>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save item"}
        </Button>
      </div>
    </form>
  );
}
