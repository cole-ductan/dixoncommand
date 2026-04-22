import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Loader2, Link2, Link2Off, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  startGoogleOAuth,
  getGoogleStatus,
  disconnectGoogle,
} from "@/lib/google.functions";
import { useAuth } from "@/hooks/useAuth";

type Status = { connected: boolean; email: string | null };

export function GoogleConnectButton() {
  const startFn = useServerFn(startGoogleOAuth);
  const statusFn = useServerFn(getGoogleStatus);
  const disconnectFn = useServerFn(disconnectGoogle);
  const { session, loading: authLoading } = useAuth();

  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    try {
      const s = await statusFn();
      setStatus({ connected: s.connected, email: s.email });
    } catch {
      setStatus({ connected: false, email: null });
    }
  };

  useEffect(() => {
    // Only call the server fn once we have an authenticated session,
    // otherwise the auth middleware throws a Response (401) and surfaces
    // as an unhandled "[object Response]" runtime error.
    if (authLoading) return;
    if (!session) {
      setStatus({ connected: false, email: null });
      return;
    }
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, session?.access_token]);

  const connect = async () => {
    setBusy(true);
    try {
      const { url } = await startFn({
        data: {
          origin: window.location.origin,
          returnTo: window.location.pathname + window.location.search,
        },
      });
      window.location.href = url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to start Google connection");
      setBusy(false);
    }
  };

  const disconnect = async () => {
    setBusy(true);
    try {
      await disconnectFn();
      toast.success("Google account disconnected");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to disconnect");
    } finally {
      setBusy(false);
    }
  };

  if (status === null) {
    return (
      <Button size="sm" variant="ghost" className="h-8 px-2" disabled>
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      </Button>
    );
  }

  if (!status.connected) {
    return (
      <Button size="sm" variant="outline" className="h-8" onClick={connect} disabled={busy}>
        {busy ? (
          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
        ) : (
          <Link2 className="mr-1.5 h-3.5 w-3.5" />
        )}
        Connect Google
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="ghost" className="h-8 gap-1.5 text-xs" disabled={busy}>
          <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
          <span className="hidden md:inline truncate max-w-[140px]">
            {status.email ?? "Google"}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs">Google Connection</DropdownMenuLabel>
        {status.email && (
          <div className="px-2 pb-2 text-xs text-muted-foreground truncate">{status.email}</div>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={connect} disabled={busy}>
          <Link2 className="mr-2 h-3.5 w-3.5" /> Reconnect
        </DropdownMenuItem>
        <DropdownMenuItem onClick={disconnect} disabled={busy} className="text-destructive">
          <Link2Off className="mr-2 h-3.5 w-3.5" /> Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}