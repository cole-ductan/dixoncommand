import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mail, RefreshCw, Search, ExternalLink, Loader2 } from "lucide-react";
import { listGmailMessages } from "@/lib/google.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/inbox")({
  component: InboxPage,
});

type Msg = {
  id: string;
  threadId: string;
  snippet: string;
  subject: string;
  from: string;
  date: string;
  unread: boolean;
};

function InboxPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("in:inbox");
  const [error, setError] = useState<string | null>(null);

  const load = async (query = q) => {
    setLoading(true);
    setError(null);
    try {
      const res = await listGmailMessages({ data: { q: query, maxResults: 25 } });
      setMessages(res.messages);
    } catch (e: any) {
      const msg = e?.message ?? "Failed to load Gmail";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-10">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold md:text-4xl flex items-center gap-2">
            <Mail className="h-7 w-7 text-primary" /> Inbox
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Your connected Gmail inbox.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="outline">
            <a href="https://mail.google.com" target="_blank" rel="noreferrer">
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Open Gmail
            </a>
          </Button>
          <Button size="sm" onClick={() => load()} disabled={loading}>
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          load(q);
        }}
        className="mb-4 flex gap-2"
      >
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Gmail search (e.g. is:unread, from:client@example.com)"
            className="pl-8 h-9 text-sm"
          />
        </div>
        <Button size="sm" type="submit" variant="outline">Search</Button>
      </form>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
          <div className="mt-1 text-xs text-muted-foreground">
            If you haven't connected Google yet, click the Google button in the top bar.
          </div>
        </div>
      )}

      <div className="rounded-xl border bg-card shadow-[var(--shadow-card)]">
        <ScrollArea className="h-[65vh]">
          {loading ? (
            <div className="flex items-center justify-center p-10 text-muted-foreground text-sm">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading messages…
            </div>
          ) : messages.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              No messages.
            </div>
          ) : (
            <ul className="divide-y">
              {messages.map((m) => (
                <li key={m.id} className={`px-4 py-3 hover:bg-secondary/50 ${m.unread ? "bg-primary/5" : ""}`}>
                  <a
                    href={`https://mail.google.com/mail/u/0/#inbox/${m.threadId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="block"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <span className={`text-sm truncate ${m.unread ? "font-semibold" : "font-medium"}`}>
                        {m.from}
                      </span>
                      <span className="shrink-0 text-[10px] font-mono text-muted-foreground">
                        {m.date && new Date(m.date).toLocaleString()}
                      </span>
                    </div>
                    <div className={`text-sm truncate ${m.unread ? "text-foreground" : "text-foreground/80"}`}>
                      {m.subject}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{m.snippet}</div>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}