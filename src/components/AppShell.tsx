import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";

import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Phone, LayoutDashboard, KanbanSquare, CalendarClock, BookOpen, LogOut, Flag, CalendarRange, Package } from "lucide-react";
import { AddLeadDialog } from "@/components/AddLeadDialog";
import { PendingEmailTray } from "@/components/PendingEmailTray";
import { NotesTray } from "@/components/NotesTray";

export function AppShell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { location } = useRouterState();

  // Auth gate temporarily disabled for testing.

  const nav = [
    { to: "/", label: "Dashboard", Icon: LayoutDashboard, exact: true },
    { to: "/call", label: "Live Call", Icon: Phone },
    { to: "/pipeline", label: "Pipeline", Icon: KanbanSquare },
    { to: "/follow-ups", label: "Follow-Ups", Icon: CalendarClock },
    { to: "/my-week", label: "My Week", Icon: CalendarRange },
    { to: "/playbook", label: "Playbook", Icon: BookOpen },
    { to: "/offers", label: "Offers & Products", Icon: Package },
  ];

  const isActive = (to: string, exact?: boolean) =>
    exact ? location.pathname === to : location.pathname.startsWith(to);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-card md:flex">
        <div className="flex items-center gap-2 px-5 py-5 border-b">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-md text-primary-foreground shadow-[var(--shadow-fairway)]"
            style={{ background: "var(--gradient-fairway)" }}
          >
            <Flag className="h-4 w-4" />
          </div>
          <div className="leading-tight">
            <div className="font-display text-base font-semibold">Dixon</div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Command Center</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-2 py-3">
          {nav.map(({ to, label, Icon, exact }) => (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive(to, exact)
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="border-t p-3">
          <div className="mb-2 px-2 text-xs text-muted-foreground truncate">{user?.email ?? "Guest (auth disabled)"}</div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/auth", replace: true });
            }}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>

      {/* mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-30 border-b bg-card/95 backdrop-blur">
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-2">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-md text-primary-foreground"
              style={{ background: "var(--gradient-fairway)" }}
            >
              <Flag className="h-3.5 w-3.5" />
            </div>
            <span className="font-display font-semibold">Dixon</span>
          </div>
          <div className="flex items-center gap-1.5">
            <AddLeadDialog trigger={<Button size="sm" variant="outline"><span className="text-base leading-none">+</span></Button>} />
            <Button asChild size="sm" variant="default">
              <Link to="/call" search={{ new: "1" } as any}><Phone className="mr-1 h-3.5 w-3.5" />Call</Link>
            </Button>
          </div>
        </div>
        <nav className="flex overflow-x-auto px-2 pb-2 gap-1 text-xs">
          {nav.map(({ to, label, exact }) => (
            <Link
              key={to}
              to={to}
              className={`whitespace-nowrap rounded-md px-2.5 py-1 ${
                isActive(to, exact) ? "bg-secondary" : "text-muted-foreground"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>

      <main className="flex-1 min-w-0 pt-24 md:pt-0">
        <Outlet />
      </main>

      <PendingEmailTray />
      <NotesTray />
    </div>
  );
}
