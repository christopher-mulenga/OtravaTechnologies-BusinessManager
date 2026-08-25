import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field } from "@/components/ui/label";
import { Input, Textarea } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select";
import { money } from "@/lib/otrava/format";
import { fromDateInput, toDateInput } from "@/lib/otrava/numbering";
import { useOtravaStore } from "@/lib/otrava/store";
import type { PaymentMethod } from "@/lib/otrava/types";
import { validatePayment } from "@/lib/otrava/validation";

export function PaymentDialog({
  open,
  onOpenChange,
  invoiceId,
  balanceDue,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  balanceDue: number;
}) {
  const company = useOtravaStore((s) => s.company);
  const recordPayment = useOtravaStore((s) => s.recordPayment);
  const [amount, setAmount] = useState(balanceDue);
  const [date, setDate] = useState(toDateInput(new Date().toISOString()));
  const [method, setMethod] = useState<PaymentMethod>("bank_transfer");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Record payment"
        description={`Outstanding balance ${money(balanceDue, company)}.`}
      >
        <form
          className="grid gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const next = validatePayment({ amount, maxAmount: balanceDue });
            setErrors(next);
            if (Object.keys(next).length) return;
            setBusy(true);
            try {
              await recordPayment({
                invoiceId,
                amount,
                date: fromDateInput(date),
                method,
                reference,
                notes,
              });
              toast.success("Payment recorded.");
              onOpenChange(false);
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Could not record payment.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <Field label="Amount" error={errors.amount}>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
          </Field>
          <Field label="Date">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Method">
            <NativeSelect
              value={method}
              onChange={(e) => setMethod(e.target.value as PaymentMethod)}
            >
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank transfer</option>
              <option value="mobile_money">Mobile money</option>
              <option value="card">Card</option>
              <option value="other">Other</option>
            </NativeSelect>
          </Field>
          <Field label="Reference">
            <Input value={reference} onChange={(e) => setReference(e.target.value)} />
          </Field>
          <Field label="Notes">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save payment"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
