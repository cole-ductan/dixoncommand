import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";

import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Phone, LayoutDashboard, KanbanSquare, CalendarClock, BookOpen, LogOut, Flag, CalendarRange, Package, Loader2, FileText, StickyNote, Globe } from "lucide-react";
import { AddLeadDialog } from "@/components/AddLeadDialog";
import { PendingEmailTray } from "@/components/PendingEmailTray";
import { NotesTray } from "@/components/NotesTray";
import { GoogleConnectButton } from "@/components/GoogleConnectButton";

export function AppShell() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { location } = useRouterState();

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/auth", replace: true });
    }
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  const nav = [
    { to: "/", label: "Dashboard", Icon: LayoutDashboard, exact: true },
    { to: "/dixon", label: "Dixon", Icon: Globe },
    { to: "/call", label: "Live Call", Icon: Phone },
    { to: "/pipeline", label: "Pipeline", Icon: KanbanSquare },
    { to: "/follow-ups", label: "Follow-Ups", Icon: CalendarClock },
    { to: "/my-week", label: "My Week", Icon: CalendarRange },
    { to: "/playbook", label: "Playbook", Icon: BookOpen },
    { to: "/offers", label: "Offers & Products", Icon: Package },
    { to: "/flyers", label: "PDF Flyers", Icon: FileText },
    { to: "/notes", label: "Notes", Icon: StickyNote },
  ];

  const isActive = (to: string, exact?: boolean) =>
    exact ? location.pathname === to : location.pathname.startsWith(to);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Top navigation bar */}
      <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur">
        <div className="flex items-center gap-4 px-4 py-2">
          {/* Brand */}
          <div className="flex items-center gap-2 shrink-0">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-md text-primary-foreground shadow-[var(--shadow-fairway)]"
              style={{ background: "var(--gradient-fairway)" }}
            >
              <Flag className="h-3.5 w-3.5" />
            </div>
            <div className="hidden sm:block leading-tight">
              <div className="font-display text-sm font-semibold">Dixon</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Command Center</div>
            </div>
          </div>

          {/* Nav links */}
          <nav className="flex flex-1 items-center gap-1 overflow-x-auto">
            {nav.map(({ to, label, Icon, exact }) => (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors ${
                  isActive(to, exact)
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden lg:inline">{label}</span>
              </Link>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2 shrink-0">
            <AddLeadDialog trigger={<Button size="sm" variant="outline"><span className="text-base leading-none">+</span></Button>} />
            <Button asChild size="sm" variant="default">
              <Link to="/call" search={{ new: "1" } as any}><Phone className="mr-1 h-3.5 w-3.5" />Call</Link>
            </Button>
            <GoogleConnectButton />
            <div className="hidden md:flex items-center gap-2 border-l pl-2 ml-1">
              <span className="text-xs text-muted-foreground truncate max-w-[120px]">{user.email}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={async () => {
                  await supabase.auth.signOut();
                  navigate({ to: "/auth", replace: true });
                }}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 min-w-0">
        <Outlet />
      </main>

      <PendingEmailTray />
      <NotesTray />
    </div>
  );
}
