import { createFileRoute } from "@tanstack/react-router";
import { DocumentEditor } from "@/components/otrava/document-editor";

export const Route = createFileRoute("/_app/invoices/new")({
  component: () => <DocumentEditor kind="invoice" />,
});
