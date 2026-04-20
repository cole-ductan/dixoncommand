import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mail, X, FileText, Sparkles, Trash2, Send } from "lucide-react";
import { usePendingTray, buildGmailComposeUrl, type TrayItem } from "@/lib/pendingTrayStore";
import { cn } from "@/lib/utils";

export function PendingEmailTray() {
  const { items, to, subject, body, open, setOpen, setTo, setSubject, setBody, remove, clear, add } =
    usePendingTray();

  const count = items.length;

  // Auto-compose body from items the first time they're added
  const [autoComposed, setAutoComposed] = useState(false);
  useEffect(() => {
    if (items.length > 0 && !autoComposed && body === "") {
      compose();
      setAutoComposed(true);
    }
    if (items.length === 0) setAutoComposed(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  const compose = () => {
    const offers = items.filter((i): i is Extract<TrayItem, { kind: "offer" }> => i.kind === "offer");
    const pdfs = items.filter((i): i is Extract<TrayItem, { kind: "pdf" }> => i.kind === "pdf");
    const tmpls = items.filter((i): i is Extract<TrayItem, { kind: "template" }> => i.kind === "template");

    const parts: string[] = [];
    if (tmpls[0]) {
      if (!subject) setSubject(tmpls[0].subject);
      parts.push(tmpls[0].body);
    }
    if (offers.length) {
      parts.push("");
      parts.push("---");
      for (const o of offers) {
        parts.push("");
        parts.push(`### ${o.name}`);
        parts.push(o.details);
      }
    }
    if (pdfs.length) {
      parts.push("");
      parts.push("---");
      parts.push("Attached resources:");
      for (const p of pdfs) {
        parts.push(`• ${p.name}: ${p.driveUrl}`);
      }
    }
    setBody(parts.join("\n"));
  };

  const sendViaGmail = () => {
    const url = buildGmailComposeUrl({ to, subject, body });
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (!open && count === 0) return null;

  // Floating button when collapsed
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full bg-primary text-primary-foreground shadow-lg px-3 py-2 sm:px-4 sm:py-2.5 hover:opacity-90"
      >
        <Mail className="h-4 w-4" />
        <span className="hidden sm:inline text-sm font-medium">Pending Email</span>
        <span className="rounded-full bg-primary-foreground/20 px-2 py-0.5 text-xs font-mono">
          {count}
        </span>
      </button>
    );
  }

  return (
    <div className="fixed inset-x-2 bottom-2 z-50 sm:left-auto sm:right-4 sm:bottom-4 sm:inset-x-auto sm:w-[420px] rounded-xl border bg-card shadow-2xl flex flex-col max-h-[80vh]">
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-primary" />
          <span className="font-display text-sm font-semibold">Pending Email</span>
          <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-mono">
            {count}
          </span>
        </div>
        <button onClick={() => setOpen(false)} className="rounded p-1 hover:bg-secondary">
          <X className="h-4 w-4" />
        </button>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3 space-y-3">
          {/* Items */}
          {count > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Attached
                </Label>
                <button
                  onClick={clear}
                  className="text-[10px] text-muted-foreground hover:text-destructive"
                >
                  Clear all
                </button>
              </div>
              {items.map((i) => (
                <div
                  key={`${i.kind}-${i.id}`}
                  className={cn(
                    "flex items-center gap-2 rounded-md border bg-secondary/40 px-2 py-1.5",
                  )}
                >
                  {i.kind === "pdf" ? (
                    <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  ) : i.kind === "template" ? (
                    <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  )}
                  <span className="text-xs flex-1 truncate" title={i.name}>
                    {i.name}
                  </span>
                  <span className="text-[9px] uppercase font-mono text-muted-foreground">
                    {i.kind}
                  </span>
                  <button
                    onClick={() => remove(i.id, i.kind)}
                    className="rounded p-0.5 hover:bg-background"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <Button size="sm" variant="ghost" className="w-full text-xs h-7" onClick={compose}>
                <Sparkles className="mr-1.5 h-3 w-3" />
                Recompose body from items
              </Button>
            </div>
          )}

          <div className="grid gap-1">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">To</Label>
            <Input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipient@example.com"
              className="h-8 text-sm"
            />
          </div>
          <div className="grid gap-1">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Subject
            </Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              className="h-8 text-sm"
            />
          </div>
          <div className="grid gap-1">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Body</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              placeholder="Write or recompose…"
              className="text-xs font-mono"
            />
          </div>
        </div>
      </ScrollArea>

      <div className="border-t p-3 flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            clear();
            setOpen(false);
          }}
        >
          <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Discard
        </Button>
        <Button size="sm" className="flex-1" onClick={sendViaGmail} disabled={!subject && !body}>
          <Send className="mr-1.5 h-3.5 w-3.5" /> Send via Gmail
        </Button>
      </div>
    </div>
  );
}
