import { useEffect } from "react";
import { Toaster } from "sonner";
import { SetupWizard } from "@/components/otrava/setup-wizard";
import { useOtravaStore } from "@/lib/otrava/store";

function applyTheme(theme: "light" | "dark" | "system") {
  const root = document.documentElement;
  const dark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  root.classList.toggle("dark", dark);
}

export function OtravaRoot({ children }: { children: React.ReactNode }) {
  const hydrate = useOtravaStore((s) => s.hydrate);
  const ready = useOtravaStore((s) => s.ready);
  const setupComplete = useOtravaStore((s) => s.app.setupComplete);
  const theme = useOtravaStore((s) => s.app.theme);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!ready) return;
    applyTheme(theme);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme(theme);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [ready, theme]);

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background text-foreground">
        <div className="text-center">
          <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
            Otrava Technologies
          </p>
          <p className="mt-3 text-sm text-muted">Loading your local workspace…</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {setupComplete ? children : <SetupWizard />}
      <Toaster richColors position="top-right" />
    </>
  );
}
