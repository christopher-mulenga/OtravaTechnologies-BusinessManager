import { createFileRoute } from "@tanstack/react-router";
import { DocumentEditor } from "@/components/otrava/document-editor";

export const Route = createFileRoute("/_app/quotations/new")({
  component: () => <DocumentEditor kind="quotation" />,
});
