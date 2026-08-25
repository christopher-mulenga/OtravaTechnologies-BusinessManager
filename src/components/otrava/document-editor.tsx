import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/label";
import { Input, Textarea } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select";
import { PageHeader } from "@/components/otrava/primitives";
import { calculateDocument } from "@/lib/otrava/calculations";
import { snapshotFromCustomer } from "@/lib/otrava/defaults";
import { money } from "@/lib/otrava/format";
import { addDaysIso, fromDateInput, toDateInput } from "@/lib/otrava/numbering";
import { createBlankLine, getInvoiceMoney, useOtravaStore } from "@/lib/otrava/store";
import type { DiscountType, Invoice, LineItem, Quotation } from "@/lib/otrava/types";
import { validateDocument } from "@/lib/otrava/validation";

type Kind = "quotation" | "invoice";

export function DocumentEditor({
  kind,
  existing,
}: {
  kind: Kind;
  existing?: Quotation | Invoice;
}) {
  const navigate = useNavigate();
  const company = useOtravaStore((s) => s.company);
  const customersAll = useOtravaStore((s) => s.customers);
  const catalogueAll = useOtravaStore((s) => s.items);
  const customers = customersAll.filter((c) => c.active);
  const catalogue = catalogueAll.filter((i) => i.active);
  const saveQuotation = useOtravaStore((s) => s.saveQuotation);
  const saveInvoice = useOtravaStore((s) => s.saveInvoice);

  const payments = useOtravaStore((s) => s.payments);
  const locked =
    kind === "quotation"
      ? existing && (existing as Quotation).status === "converted"
      : existing
        ? (() => {
            const inv = existing as Invoice;
            if (inv.status === "cancelled") return true;
            return getInvoiceMoney(inv, payments, company.taxEnabled).status === "paid";
          })()
        : false;

  const [customerId, setCustomerId] = useState(existing?.customerId ?? "");
  const [date, setDate] = useState(toDateInput(existing?.date ?? new Date().toISOString()));
  const [secondDate, setSecondDate] = useState(
    toDateInput(
      kind === "quotation"
        ? ((existing as Quotation | undefined)?.validUntil ??
            addDaysIso(new Date().toISOString(), company.defaultValidityDays))
        : ((existing as Invoice | undefined)?.dueDate ??
            addDaysIso(new Date().toISOString(), company.defaultPaymentDays)),
    ),
  );
  const [status, setStatus] = useState(
    existing?.status === "draft" ? "draft" : kind === "invoice" ? "issued" : "draft",
  );
  const [items, setItems] = useState<LineItem[]>(
    existing?.items?.length
      ? existing.items
      : [createBlankLine(company.taxEnabled ? company.defaultTaxRate : 0)],
  );
  const [notes, setNotes] = useState(existing?.notes ?? company.defaultNotes);
  const [terms, setTerms] = useState(
    existing?.terms ??
      (kind === "quotation" ? company.defaultQuotationTerms : company.defaultInvoiceTerms),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const totals = useMemo(
    () => calculateDocument(items, { taxEnabled: company.taxEnabled }),
    [items, company.taxEnabled],
  );

  const updateLine = (id: string, patch: Partial<LineItem>) => {
    setItems((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const applyCatalogue = (lineId: string, itemId: string) => {
    const item = catalogue.find((c) => c.id === itemId);
    if (!item) {
      updateLine(lineId, { catalogueItemId: null });
      return;
    }
    updateLine(lineId, {
      catalogueItemId: item.id,
      description: item.description ? `${item.name} — ${item.description}` : item.name,
      unitPrice: item.price,
      taxRate: company.taxEnabled ? item.taxRate : 0,
    });
  };

  const save = async (andClose = false) => {
    const customer = useOtravaStore.getState().customers.find((c) => c.id === customerId);
    const errs = validateDocument({
      customerId,
      items,
      date,
      secondDate,
      secondDateLabel: kind === "quotation" ? "Valid until" : "Due date",
    });
    setErrors(errs);
    if (Object.keys(errs).length) {
      toast.error("Please correct the highlighted fields.");
      return;
    }
    if (!customer) return;
    setBusy(true);
    try {
      if (kind === "quotation") {
        const saved = await saveQuotation({
          id: existing?.id,
          date: fromDateInput(date),
          validUntil: fromDateInput(secondDate),
          customerId,
          customerSnapshot: snapshotFromCustomer(customer),
          items,
          notes,
          terms,
          preparedBy: company.localUsername,
          status: status === "sent" ? "sent" : status === "accepted" ? "accepted" : status === "rejected" ? "rejected" : "draft",
          convertedInvoiceId: null,
        });
        toast.success(`Quotation ${saved.number} saved.`);
        if (andClose) void navigate({ to: "/quotations/$quotationId", params: { quotationId: saved.id } });
        else if (!existing) void navigate({ to: "/quotations/$quotationId", params: { quotationId: saved.id } });
      } else {
        const saved = await saveInvoice({
          id: existing?.id,
          date: fromDateInput(date),
          dueDate: fromDateInput(secondDate),
          customerId,
          customerSnapshot: snapshotFromCustomer(customer),
          items,
          notes,
          terms,
          preparedBy: company.localUsername,
          status: status === "draft" ? "draft" : "issued",
          quotationId: (existing as Invoice | undefined)?.quotationId ?? null,
          quotationNumber: (existing as Invoice | undefined)?.quotationNumber ?? null,
        });
        toast.success(`Invoice ${saved.number} saved.`);
        if (!existing) void navigate({ to: "/invoices/$invoiceId", params: { invoiceId: saved.id } });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the document.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={
          existing
            ? `${kind === "quotation" ? "Quotation" : "Invoice"} ${existing.number}`
            : kind === "quotation"
              ? "New quotation"
              : "New invoice"
        }
        description={
          locked
            ? "This document is locked to protect financial records."
            : "Line totals update as you type. Save before printing or converting."
        }
        actions={
          <>
            <Button variant="outline" onClick={() => history.back()}>
              Cancel
            </Button>
            <Button onClick={() => void save()} disabled={busy || Boolean(locked)}>
              {busy ? "Saving…" : "Save"}
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="space-y-4">
          <section className="grid gap-4 rounded-xl border border-border bg-surface p-4 sm:grid-cols-2">
            <Field label="Customer" error={errors.customerId}>
              <NativeSelect
                value={customerId}
                disabled={Boolean(locked)}
                onChange={(e) => setCustomerId(e.target.value)}
              >
                <option value="">Select a customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.companyName ? `${c.name} · ${c.companyName}` : c.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Status">
              <NativeSelect
                value={status}
                disabled={Boolean(locked)}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="draft">Draft</option>
                {kind === "quotation" ? (
                  <>
                    <option value="sent">Sent</option>
                    <option value="accepted">Accepted</option>
                    <option value="rejected">Rejected</option>
                  </>
                ) : (
                  <option value="issued">Issued</option>
                )}
              </NativeSelect>
            </Field>
            <Field label="Date">
              <Input
                type="date"
                value={date}
                disabled={Boolean(locked)}
                onChange={(e) => setDate(e.target.value)}
              />
            </Field>
            <Field
              label={kind === "quotation" ? "Valid until" : "Due date"}
              error={errors.secondDate}
            >
              <Input
                type="date"
                value={secondDate}
                disabled={Boolean(locked)}
                onChange={(e) => setSecondDate(e.target.value)}
              />
            </Field>
          </section>

          <section className="rounded-xl border border-border bg-surface p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Line items</h2>
              <Button
                size="sm"
                variant="outline"
                disabled={Boolean(locked)}
                onClick={() =>
                  setItems((rows) => [
                    ...rows,
                    createBlankLine(company.taxEnabled ? company.defaultTaxRate : 0),
                  ])
                }
              >
                <Plus /> Add line
              </Button>
            </div>
            {errors.items ? <p className="mb-2 text-sm text-error">{errors.items}</p> : null}
            <div className="space-y-3">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="grid gap-2 rounded-lg border border-border p-3 md:grid-cols-12"
                >
                  <div className="md:col-span-12">
                    <NativeSelect
                      value={item.catalogueItemId ?? ""}
                      disabled={Boolean(locked)}
                      onChange={(e) => applyCatalogue(item.id, e.target.value)}
                    >
                      <option value="">Custom line or choose from catalogue</option>
                      {catalogue.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} · {money(c.price, company)}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                  <div className="md:col-span-12">
                    <Input
                      placeholder="Description"
                      value={item.description}
                      disabled={Boolean(locked)}
                      onChange={(e) => updateLine(item.id, { description: e.target.value })}
                    />
                    {errors[`item-${index}-description`] ? (
                      <p className="mt-1 text-xs text-error">
                        {errors[`item-${index}-description`]}
                      </p>
                    ) : null}
                  </div>
                  <div className="md:col-span-2">
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={item.quantity}
                      disabled={Boolean(locked)}
                      onChange={(e) =>
                        updateLine(item.id, { quantity: Number(e.target.value) })
                      }
                      aria-label="Quantity"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={item.unitPrice}
                      disabled={Boolean(locked)}
                      onChange={(e) =>
                        updateLine(item.id, { unitPrice: Number(e.target.value) })
                      }
                      aria-label="Unit price"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <NativeSelect
                      value={item.discountType}
                      disabled={Boolean(locked)}
                      onChange={(e) =>
                        updateLine(item.id, {
                          discountType: e.target.value as DiscountType,
                        })
                      }
                    >
                      <option value="percent">% off</option>
                      <option value="fixed">Fixed off</option>
                    </NativeSelect>
                  </div>
                  <div className="md:col-span-2">
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={item.discountValue}
                      disabled={Boolean(locked)}
                      onChange={(e) =>
                        updateLine(item.id, { discountValue: Number(e.target.value) })
                      }
                      aria-label="Discount"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step="0.01"
                      value={item.taxRate}
                      disabled={Boolean(locked) || !company.taxEnabled}
                      onChange={(e) =>
                        updateLine(item.id, { taxRate: Number(e.target.value) })
                      }
                      aria-label="Tax rate"
                    />
                  </div>
                  <div className="flex items-center justify-between md:col-span-1">
                    <span className="text-sm font-medium tabular-nums md:hidden">
                      {money(totals.lines[index]?.amount ?? 0, company)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={Boolean(locked) || items.length === 1}
                      onClick={() => setItems((rows) => rows.filter((r) => r.id !== item.id))}
                      aria-label="Remove line"
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <Field label="Notes">
              <Textarea value={notes} disabled={Boolean(locked)} onChange={(e) => setNotes(e.target.value)} />
            </Field>
            <Field label="Terms & conditions">
              <Textarea value={terms} disabled={Boolean(locked)} onChange={(e) => setTerms(e.target.value)} />
            </Field>
          </section>
        </div>

        <aside className="h-fit rounded-xl border border-border bg-surface p-4">
          <h2 className="font-semibold">Totals</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Subtotal</dt>
              <dd className="tabular-nums">{money(totals.subtotal, company)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Discount</dt>
              <dd className="tabular-nums">{money(totals.discount, company)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">{company.taxLabel}</dt>
              <dd className="tabular-nums">{money(totals.tax, company)}</dd>
            </div>
            <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
              <dt>Grand total</dt>
              <dd className="tabular-nums">{money(totals.grandTotal, company)}</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-muted">
            Currency: {company.currencyCode} ({company.currencySymbol})
          </p>
        </aside>
      </div>
    </div>
  );
}
