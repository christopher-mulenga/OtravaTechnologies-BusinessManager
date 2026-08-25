import { useEffect, useState } from "react";
import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  Archive,
  BarChart3,
  FileText,
  LayoutDashboard,
  Menu,
  Package,
  Receipt,
  Search,
  Settings,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchCommand } from "@/components/otrava/search-command";
import { cn } from "@/lib/utils";
import { useOtravaStore } from "@/lib/otrava/store";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/catalogue", label: "Products & services", icon: Package },
  { to: "/quotations", label: "Quotations", icon: FileText },
  { to: "/invoices", label: "Invoices", icon: Receipt },
  { to: "/documents", label: "Documents", icon: Wallet },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/backup", label: "Backup", icon: Archive },
  { to: "/settings", label: "Settings", icon: Settings },
];

function isActive(pathname: string, to: string) {
  if (to === "/") return pathname === "/";
  return pathname === to || pathname.startsWith(`${to}/`);
}

export function AppShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const company = useOtravaStore((s) => s.company);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.ctrlKey || e.metaKey;
      if (meta && (e.key === "k" || e.key === "f")) {
        e.preventDefault();
        setSearch(true);
      }
      if (meta && e.key.toLowerCase() === "b") {
        e.preventDefault();
        window.location.assign("/backup");
      }
      if (e.key === "Escape") {
        setOpen(false);
        setSearch(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 p-3" aria-label="Main">
      {NAV.map((item) => {
        const Icon = item.icon;
        const active = isActive(pathname, item.to);
        return (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-active text-white"
                : "text-sidebar-foreground/90 hover:bg-white/10",
            )}
          >
            <Icon className="size-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-dvh bg-background">
      <aside className="hidden w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-3 px-4 py-5">
          {company.logoDataUrl ? (
            <img
              src={company.logoDataUrl}
              alt=""
              className="size-9 rounded-md object-cover"
            />
          ) : (
            <div className="flex size-9 items-center justify-center rounded-md bg-brand text-sm font-bold text-white">
              O
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{company.name}</p>
            <p className="text-[11px] text-sidebar-muted">Business manager</p>
          </div>
        </div>
        {nav}
        <p className="px-4 py-3 text-[11px] text-sidebar-muted">Offline · Local data</p>
      </aside>

      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-brand-dark/50"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          />
          <aside className="relative flex h-full w-64 flex-col bg-sidebar text-sidebar-foreground">
            <div className="flex items-center justify-between px-4 py-4">
              <span className="font-semibold">{company.name}</span>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close menu">
                <X className="text-white" />
              </Button>
            </div>
            {nav}
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex min-h-14 items-center gap-2 border-b border-border bg-surface px-3 sm:px-5">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu />
          </Button>
          <p className="hidden truncate text-sm font-medium text-foreground sm:block">
            {company.name}
          </p>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" onClick={() => setSearch(true)} className="min-h-10">
              <Search />
              <span className="hidden sm:inline">Search</span>
              <kbd className="hidden rounded border border-border px-1.5 text-[10px] text-muted md:inline">
                Ctrl F
              </kbd>
            </Button>
            <Button variant="ghost" size="icon" asChild aria-label="Settings">
              <Link to="/settings">
                <Settings />
              </Link>
            </Button>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
      <SearchCommand open={search} onOpenChange={setSearch} />
    </div>
  );
}
