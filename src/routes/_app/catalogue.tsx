import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select";
import { ItemForm } from "@/components/otrava/item-form";
import { DataTable, EmptyState, PageHeader, Td, Toolbar } from "@/components/otrava/primitives";
import { catalogueCsv } from "@/lib/otrava/csv";
import { downloadText, money } from "@/lib/otrava/format";
import { useOtravaStore } from "@/lib/otrava/store";
import type { CatalogueItem } from "@/lib/otrava/types";

export const Route = createFileRoute("/_app/catalogue")({
  component: CataloguePage,
});

function CataloguePage() {
  const company = useOtravaStore((s) => s.company);
  const items = useOtravaStore((s) => s.items);
  const saveItem = useOtravaStore((s) => s.saveItem);
  const deleteItem = useOtravaStore((s) => s.deleteItem);
  const loadSampleCatalogue = useOtravaStore((s) => s.loadSampleCatalogue);
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogueItem | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    return items
      .filter((i) => (type === "all" ? true : i.type === type))
      .filter((i) =>
        !n ? true : [i.name, i.code, i.category, i.description].some((f) => f.toLowerCase().includes(n)),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [items, q, type]);

  return (
    <div>
      <PageHeader
        title="Products & services"
        description="Catalogue prices are copied onto documents, so later price changes will not rewrite old invoices."
        actions={
          <>
            <Button
              variant="outline"
              onClick={() =>
                downloadText("catalogue.csv", catalogueCsv(useOtravaStore.getState()), "text/csv")
              }
            >
              Export CSV
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                await loadSampleCatalogue();
                toast.success("Sample services added where missing.");
              }}
            >
              Load sample services
            </Button>
            <Button onClick={() => { setEditing(null); setOpen(true); }}>Add item</Button>
          </>
        }
      />
      <Toolbar>
        <div className="flex w-full flex-col gap-2 sm:flex-row">
          <Input
            className="max-w-md"
            placeholder="Search catalogue"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <NativeSelect className="max-w-40" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="all">All types</option>
            <option value="service">Services</option>
            <option value="product">Products</option>
          </NativeSelect>
        </div>
      </Toolbar>
      {filtered.length === 0 ? (
        <EmptyState
          title="No products or services yet."
          description="Add the work you sell so quotations and invoices can be created in a few clicks."
          action={<Button onClick={() => setOpen(true)}>Add item</Button>}
        />
      ) : (
        <DataTable columns={["Code", "Name", "Type", "Category", "Price", "Tax", "Status", ""]}>
          {filtered.map((item) => (
            <tr key={item.id} className="hover:bg-brand-light/60">
              <Td className="font-mono text-xs">{item.code}</Td>
              <Td className="font-medium">{item.name}</Td>
              <Td className="capitalize">{item.type}</Td>
              <Td>{item.category || "—"}</Td>
              <Td className="tabular-nums">{money(item.price, company)}</Td>
              <Td className="tabular-nums">{item.taxRate}%</Td>
              <Td>
                <Badge tone={item.active ? "success" : "neutral"}>
                  {item.active ? "Active" : "Inactive"}
                </Badge>
              </Td>
              <Td className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditing(item);
                    setOpen(true);
                  }}
                >
                  Edit
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setPending(item.id)}>
                  Delete
                </Button>
              </Td>
            </tr>
          ))}
        </DataTable>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title={editing ? "Edit item" : "Add item"} className="max-w-2xl">
          <ItemForm
            initial={editing ?? undefined}
            defaultTaxRate={company.defaultTaxRate}
            busy={busy}
            onCancel={() => setOpen(false)}
            onSubmit={async (data) => {
              setBusy(true);
              try {
                await saveItem({ ...data, id: editing?.id });
                toast.success("Catalogue item saved.");
                setOpen(false);
              } finally {
                setBusy(false);
              }
            }}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(pending)}
        onOpenChange={(v) => !v && setPending(null)}
        title="Remove this item?"
        description="If it has been used on a document it will be deactivated instead of deleted, so historical invoices stay intact."
        confirmLabel="Remove"
        destructive
        onConfirm={async () => {
          if (pending) await deleteItem(pending);
          toast.success("Item updated.");
        }}
      />
    </div>
  );
}
