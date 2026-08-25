import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/otrava/app-shell";

export const Route = createFileRoute("/_app")({
  component: AppShell,
});
