import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Eye, Mail, FileText, Download, ChevronRight } from "lucide-react";
import { usePendingTray } from "@/lib/pendingTrayStore";
import { OFFER_EXPANDED } from "@/lib/offerExpanded";
import { LOCAL_OFFER_PDFS, type LocalOfferPdf } from "@/lib/localOfferPdfs";
import { toast } from "sonner";

/**
 * Strip internal-only sections (HOW TO DELIVER IT ON THE CALL, TC NOTES)
 * from offer copy before sending to a client via email.
 */
function stripInternalSections(text: string): string {
  if (!text) return text;
  const internalHeaders = /^(HOW TO DELIVER IT ON THE CALL|TC NOTES)\s*:?\s*$/im;
  const lines = text.split("\n");
  const out: string[] = [];
  let skipping = false;
  for (const line of lines) {
    if (internalHeaders.test(line.trim())) {
      skipping = true;
      continue;
    }
    if (skipping && /^[A-Z][A-Z0-9 &/+\-]{2,}:\s*$/.test(line.trim())) {
      skipping = false;
    }
    if (!skipping) out.push(line);
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd();
}

type Offer = {
  id: string;
  slug: string;
  name: string;
  type: string | null;
  cost: string | null;
  when_to_introduce: string | null;
  details: string | null;
  expanded_details: string | null;
};

interface Props {
  /** "full" = expanded cards for /offers page. "rail" = compact for live-call rail. */
  variant?: "full" | "rail";
}

export function OffersPanel({ variant = "full" }: Props) {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewing, setPreviewing] = useState<LocalOfferPdf | null>(null);
  const add = usePendingTray((s) => s.add);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("offers").select("*").order("sort_order");
      setOffers((data ?? []) as any);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <div className="p-4 text-sm text-muted-foreground">Loading offers…</div>;
  }

  const isRail = variant === "rail";

  return (
    <div className={isRail ? "space-y-2" : "space-y-4"}>
      <div className={isRail ? "space-y-2" : "grid gap-4 md:grid-cols-2"}>
        {offers.map((o) => {
          const offerPdfs = LOCAL_OFFER_PDFS[o.slug] ?? [];
          const detail = o.expanded_details || OFFER_EXPANDED[o.slug] || o.details || "";
          return (
            <article
              key={o.id}
              className={
                isRail
                  ? "rounded-lg border bg-card p-3"
                  : "rounded-xl border bg-card p-5 shadow-[var(--shadow-card)]"
              }
            >
              <div className="flex items-baseline justify-between gap-2">
                <h3 className={isRail ? "font-display text-sm font-semibold" : "font-display text-lg font-semibold"}>
                  {o.name}
                </h3>
                <span className="whitespace-nowrap text-[10px] font-mono text-muted-foreground">{o.cost}</span>
              </div>
              <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">{o.type}</div>
              {o.when_to_introduce && (
                <p className="mt-1 text-[11px] italic text-muted-foreground">When: {o.when_to_introduce}</p>
              )}

              {isRail ? (
                <details className="mt-2 text-xs">
                  <summary className="cursor-pointer font-medium text-primary">Details</summary>
                  <pre className="mt-2 whitespace-pre-wrap font-sans text-[11px] leading-relaxed text-foreground/85">
                    {detail}
                  </pre>
                </details>
              ) : (
                <>
                  {/* Mobile: collapsed by default */}
                  <details className="mt-3 md:hidden text-sm">
                    <summary className="cursor-pointer font-medium text-primary">Show full pitch details</summary>
                    <pre className="mt-2 whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground/90">
                      {detail}
                    </pre>
                  </details>
                  {/* Desktop: always expanded */}
                  <pre className="mt-3 hidden md:block whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground/90">
                    {detail}
                  </pre>
                </>
              )}

              <div className="mt-3 flex flex-wrap gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    add({ kind: "offer", id: o.id, name: o.name, details: stripInternalSections(detail) });
                    toast.success(`Added "${o.name}" to email tray`);
                  }}
                >
                  <Mail className="mr-1.5 h-3 w-3" />
                  Add to email
                </Button>
              </div>

              {offerPdfs.length > 0 && (
                <div className="mt-3 space-y-1.5 border-t pt-2">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">PDFs</div>
                  {offerPdfs.map((p) => (
                    <div key={p.id} className="flex items-center gap-2 rounded-md border bg-secondary/30 px-2 py-1.5">
                      <FileText className="h-3.5 w-3.5 shrink-0 text-primary" />
                      <span className="flex-1 truncate text-xs" title={p.name}>
                        {p.name}
                      </span>
                      <button onClick={() => setPreviewing(p)} className="rounded p-1 hover:bg-background" title="Preview">
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <a
                        href={p.file}
                        target="_blank"
                        rel="noreferrer"
                        download
                        className="rounded p-1 hover:bg-background"
                        title="Download"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </a>
                      <button
                        onClick={() => {
                          const absoluteUrl = typeof window !== "undefined" ? new URL(p.file, window.location.origin).toString() : p.file;
                          add({
                            kind: "pdf",
                            id: p.id,
                            name: p.name,
                            driveFileId: "",
                            driveUrl: absoluteUrl,
                          });
                          toast.success(`Added "${p.name}" to email tray`);
                        }}
                        className="rounded p-1 hover:bg-background"
                        title="Add to email"
                      >
                        <Mail className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </article>
          );
        })}
      </div>

      <Dialog open={!!previewing} onOpenChange={(v) => !v && setPreviewing(null)}>
        <DialogContent className="flex h-[85vh] w-[95vw] max-w-5xl flex-col gap-0 p-0">
          <DialogHeader className="border-b px-4 py-3">
            <DialogTitle className="text-sm font-medium">{previewing?.name}</DialogTitle>
          </DialogHeader>
          {previewing && <iframe src={previewing.file} className="flex-1 w-full" title={previewing.name} />}
          <div className="flex justify-end gap-2 border-t p-3">
            {previewing && (
              <Button size="sm" variant="outline" asChild>
                <a href={previewing.file} target="_blank" rel="noreferrer" download>
                  <Download className="mr-1.5 h-3.5 w-3.5" /> Download
                </a>
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => {
                if (!previewing) return;
                const absoluteUrl = typeof window !== "undefined" ? new URL(previewing.file, window.location.origin).toString() : previewing.file;
                add({
                  kind: "pdf",
                  id: previewing.id,
                  name: previewing.name,
                  driveFileId: "",
                  driveUrl: absoluteUrl,
                });
                toast.success("Added to email tray");
                setPreviewing(null);
              }}
            >
              <Mail className="mr-1.5 h-3.5 w-3.5" /> Add to email
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
