import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { customerDisplayName } from "@/lib/otrava/format";
import { useOtravaStore } from "@/lib/otrava/store";

export function SearchCommand({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const customers = useOtravaStore((s) => s.customers);
  const items = useOtravaStore((s) => s.items);
  const quotations = useOtravaStore((s) => s.quotations);
  const invoices = useOtravaStore((s) => s.invoices);
  const [q, setQ] = useState("");

  const results = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return [];
    const hits: Array<{ label: string; path: string; group: string }> = [];
    for (const c of customers) {
      if (
        [c.name, c.companyName, c.phone, c.email, c.code].some((f) =>
          f.toLowerCase().includes(n),
        )
      ) {
        hits.push({
          group: "Customers",
          label: customerDisplayName(c),
          path: `/customers/${c.id}`,
        });
      }
    }
    for (const item of items) {
      if ([item.name, item.code, item.description].some((f) => f.toLowerCase().includes(n))) {
        hits.push({ group: "Catalogue", label: item.name, path: "/catalogue" });
      }
    }
    for (const doc of quotations) {
      if (
        [doc.number, doc.customerSnapshot.name, doc.customerSnapshot.companyName].some((f) =>
          f.toLowerCase().includes(n),
        )
      ) {
        hits.push({
          group: "Quotations",
          label: `${doc.number} · ${doc.customerSnapshot.name}`,
          path: `/quotations/${doc.id}`,
        });
      }
    }
    for (const doc of invoices) {
      if (
        [doc.number, doc.customerSnapshot.name, doc.customerSnapshot.companyName].some((f) =>
          f.toLowerCase().includes(n),
        )
      ) {
        hits.push({
          group: "Invoices",
          label: `${doc.number} · ${doc.customerSnapshot.name}`,
          path: `/invoices/${doc.id}`,
        });
      }
    }
    return hits.slice(0, 20);
  }, [q, customers, items, quotations, invoices]);

  const go = (path: string) => {
    onOpenChange(false);
    setQ("");
    void navigate({ to: path });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Search" description="Find customers, documents, and catalogue items.">
        <Input
          autoFocus
          placeholder="Name, phone, email, invoice or quotation number"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <ul className="mt-3 max-h-72 overflow-auto">
          {q && results.length === 0 ? (
            <li className="px-2 py-6 text-center text-sm text-muted">No matching records.</li>
          ) : (
            results.map((r) => (
              <li key={r.path + r.label}>
                <button
                  type="button"
                  className="flex w-full flex-col rounded-md px-3 py-2 text-left hover:bg-brand-light"
                  onClick={() => go(r.path)}
                >
                  <span className="text-[11px] tracking-wide text-muted uppercase">{r.group}</span>
                  <span className="text-sm text-foreground">{r.label}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
