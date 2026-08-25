import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/dialog";
import { CustomerForm } from "@/components/otrava/customer-form";
import { DataTable, EmptyState, PageHeader, Td, Toolbar } from "@/components/otrava/primitives";
import { customerDisplayName, downloadText } from "@/lib/otrava/format";
import { customersCsv } from "@/lib/otrava/csv";
import { customerHasDocuments, useOtravaStore } from "@/lib/otrava/store";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_app/customers/")({
  component: CustomersPage,
});

function CustomersPage() {
  const customers = useOtravaStore((s) => s.customers);
  const saveCustomer = useOtravaStore((s) => s.saveCustomer);
  const deleteCustomer = useOtravaStore((s) => s.deleteCustomer);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    return customers
      .filter((c) =>
        !n
          ? true
          : [c.name, c.companyName, c.phone, c.email, c.code, c.city].some((f) =>
              f.toLowerCase().includes(n),
            ),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [customers, q]);

  const target = customers.find((c) => c.id === pendingDelete);
  const hasDocs = target
    ? customerHasDocuments(target.id, useOtravaStore.getState())
    : false;

  return (
    <div>
      <PageHeader
        title="Customers"
        description="People and organisations you quote and invoice."
        actions={
          <>
            <Button
              variant="outline"
              onClick={() =>
                downloadText(
                  "customers.csv",
                  customersCsv(useOtravaStore.getState()),
                  "text/csv",
                )
              }
            >
              Export CSV
            </Button>
            <Button onClick={() => setOpen(true)}>Add customer</Button>
          </>
        }
      />
      <Toolbar>
        <Input
          className="max-w-md"
          placeholder="Search name, company, phone, or email"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </Toolbar>
      {filtered.length === 0 ? (
        <EmptyState
          title="No customers yet."
          description="Add your first customer to begin managing quotations and invoices."
          action={<Button onClick={() => setOpen(true)}>Add customer</Button>}
        />
      ) : (
        <DataTable columns={["Code", "Name", "Phone", "Email", "City", "Status", ""]}>
          {filtered.map((c) => (
            <tr key={c.id} className="hover:bg-brand-light/60">
              <Td className="font-mono text-xs">{c.code}</Td>
              <Td>
                <Link
                  to="/customers/$customerId"
                  params={{ customerId: c.id }}
                  className="font-medium text-brand hover:underline"
                >
                  {customerDisplayName(c)}
                </Link>
              </Td>
              <Td>{c.phone || "—"}</Td>
              <Td>{c.email || "—"}</Td>
              <Td>{c.city || "—"}</Td>
              <Td>
                <Badge tone={c.active ? "success" : "neutral"}>
                  {c.active ? "Active" : "Inactive"}
                </Badge>
              </Td>
              <Td className="text-right">
                <Button variant="ghost" size="sm" onClick={() => setPendingDelete(c.id)}>
                  Delete
                </Button>
              </Td>
            </tr>
          ))}
        </DataTable>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title="Add customer" className="max-w-2xl">
          <CustomerForm
            busy={busy}
            onCancel={() => setOpen(false)}
            onSubmit={async (data) => {
              setBusy(true);
              try {
                await saveCustomer(data);
                toast.success("Customer saved.");
                setOpen(false);
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Could not save the customer.");
              } finally {
                setBusy(false);
              }
            }}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(v) => !v && setPendingDelete(null)}
        title={hasDocs ? "This customer has documents" : "Delete customer?"}
        description={
          hasDocs
            ? "This customer has quotations or invoices associated with them. For data integrity, the customer cannot be permanently deleted. You can deactivate the customer instead."
            : "This customer has no associated documents."
        }
        confirmLabel={hasDocs ? "Deactivate" : "Delete"}
        destructive={!hasDocs}
        onConfirm={async () => {
          if (!pendingDelete) return;
          const result = await deleteCustomer(pendingDelete);
          toast.success(result === "deleted" ? "Customer deleted." : "Customer deactivated.");
        }}
      />
    </div>
  );
}
