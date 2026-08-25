import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Badge, statusTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select";
import { DataTable, EmptyState, PageHeader, Td, Toolbar } from "@/components/otrava/primitives";
import { quotationsCsv } from "@/lib/otrava/csv";
import { downloadText, formatDate, money, quotationStatusLabel } from "@/lib/otrava/format";
import { getQuotationMoney, useOtravaStore } from "@/lib/otrava/store";

export const Route = createFileRoute("/_app/quotations/")({
  component: QuotationsPage,
});

function QuotationsPage() {
  const company = useOtravaStore((s) => s.company);
  const app = useOtravaStore((s) => s.app);
  const quotations = useOtravaStore((s) => s.quotations);
  const deleteQuotation = useOtravaStore((s) => s.deleteQuotation);
  const duplicateQuotation = useOtravaStore((s) => s.duplicateQuotation);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [pending, setPending] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    return quotations
      .map((doc) => ({ doc, money: getQuotationMoney(doc, company.taxEnabled) }))
      .filter(({ doc, money: m }) => (status === "all" ? true : m.status === status))
      .filter(({ doc }) =>
        !n
          ? true
          : [doc.number, doc.customerSnapshot.name, doc.customerSnapshot.companyName].some((f) =>
              f.toLowerCase().includes(n),
            ),
      )
      .sort((a, b) => b.doc.date.localeCompare(a.doc.date));
  }, [quotations, q, status, company.taxEnabled]);

  return (
    <div>
      <PageHeader
        title="Quotations"
        description="Prepare, send, and convert quotations into invoices."
        actions={
          <>
            <Button
              variant="outline"
              onClick={() =>
                downloadText(
                  "quotations.csv",
                  quotationsCsv(useOtravaStore.getState()),
                  "text/csv",
                )
              }
            >
              Export CSV
            </Button>
            <Button asChild>
              <Link to="/quotations/new">New quotation</Link>
            </Button>
          </>
        }
      />
      <Toolbar>
        <div className="flex w-full flex-col gap-2 sm:flex-row">
          <Input
            className="max-w-md"
            placeholder="Search number or customer"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <NativeSelect className="max-w-48" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
            <option value="expired">Expired</option>
            <option value="converted">Converted</option>
          </NativeSelect>
        </div>
      </Toolbar>
      {filtered.length === 0 ? (
        <EmptyState
          title="No quotations yet."
          description="Create a quotation, add line items, then print, export PDF, or convert it to an invoice."
          action={
            <Button asChild>
              <Link to="/quotations/new">New quotation</Link>
            </Button>
          }
        />
      ) : (
        <DataTable columns={["Number", "Date", "Customer", "Status", "Total", ""]}>
          {filtered.map(({ doc, money: m }) => (
            <tr key={doc.id} className="hover:bg-brand-light/60">
              <Td>
                <Link
                  className="font-medium text-brand hover:underline"
                  to="/quotations/$quotationId"
                  params={{ quotationId: doc.id }}
                >
                  {doc.number}
                </Link>
              </Td>
              <Td>{formatDate(doc.date, app.dateFormat)}</Td>
              <Td>{doc.customerSnapshot.name}</Td>
              <Td>
                <Badge tone={statusTone(m.status)}>{quotationStatusLabel(m.status)}</Badge>
              </Td>
              <Td className="tabular-nums">{money(m.totals.grandTotal, company)}</Td>
              <Td className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    const copy = await duplicateQuotation(doc.id);
                    toast.success(`Duplicated as ${copy.number}.`);
                  }}
                >
                  Duplicate
                </Button>
                {doc.status !== "converted" ? (
                  <Button variant="ghost" size="sm" onClick={() => setPending(doc.id)}>
                    Delete
                  </Button>
                ) : null}
              </Td>
            </tr>
          ))}
        </DataTable>
      )}
      <ConfirmDialog
        open={Boolean(pending)}
        onOpenChange={(v) => !v && setPending(null)}
        title="Delete quotation?"
        description="This cannot be undone. Converted quotations are kept for history."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (pending) await deleteQuotation(pending);
          toast.success("Quotation deleted.");
        }}
      />
    </div>
  );
}
