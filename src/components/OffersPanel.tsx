import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Eye, Mail, FileText, Download, CloudDownload } from "lucide-react";
import { usePendingTray } from "@/lib/pendingTrayStore";
import { useServerFn } from "@tanstack/react-start";
import { mirrorOfferPdfsToStorage } from "@/lib/driveOffers.functions";
import { OFFER_EXPANDED } from "@/lib/offerExpanded";
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
    // A new ALL-CAPS header (e.g. "VALUE:", "REDEMPTION:") ends the skipped block
    if (skipping && /^[A-Z][A-Z0-9 &/+\-]{2,}:\s*$/.test(line.trim())) {
      skipping = false;
    }
    if (!skipping) out.push(line);
  }
  // Trim trailing blank lines
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

type OfferPdf = {
  id: string;
  offer_slug: string;
  name: string;
  drive_file_id: string | null;
  drive_url: string | null;
  storage_path: string | null;
  public_url: string | null;
};

interface Props {
  /** "full" = expanded cards for /offers page. "rail" = compact for live-call rail. */
  variant?: "full" | "rail";
}

export function OffersPanel({ variant = "full" }: Props) {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [pdfs, setPdfs] = useState<OfferPdf[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [previewing, setPreviewing] = useState<OfferPdf | null>(null);
  const add = usePendingTray((s) => s.add);
  const seedFn = useServerFn(mirrorOfferPdfsToStorage);

  const load = async () => {
    setLoading(true);
    const [o, p] = await Promise.all([
      supabase.from("offers").select("*").order("sort_order"),
      supabase.from("offer_pdfs").select("*").order("sort_order"),
    ]);
    setOffers((o.data ?? []) as any);
    setPdfs((p.data ?? []) as any);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const importFromDrive = async () => {
    setSeeding(true);
    try {
      const res: any = await seedFn({} as any);
      if (res?.ok) {
        toast.success(`Imported ${res.inserted} PDFs to your app (uploaded ${res.uploaded ?? res.inserted})`);
        await load();
      } else {
        toast.error("Import failed: " + (res?.error ?? "unknown"));
      }
    } catch (e: any) {
      toast.error("Import failed: " + (e?.message ?? "unknown"));
    } finally {
      setSeeding(false);
    }
  };

  const pdfsFor = (slug: string) => pdfs.filter((p) => p.offer_slug === slug);
  const fileUrl = (p: OfferPdf) => p.public_url || p.drive_url || "";
  const isStored = (p: OfferPdf) => !!p.public_url;

  if (loading) {
    return <div className="p-4 text-sm text-muted-foreground">Loading offers…</div>;
  }

  const isRail = variant === "rail";
  const hasStoredPdfs = pdfs.some((p) => p.public_url);
  const needsImport = pdfs.length === 0 || !hasStoredPdfs;

  return (
    <div className={isRail ? "space-y-2" : "space-y-4"}>
      {!isRail && (
        <div className="flex items-center justify-between gap-2">
          {needsImport ? (
            <div className="flex-1 rounded-lg border border-dashed bg-secondary/30 p-3 text-xs">
              <div className="font-medium text-foreground">PDFs not imported yet</div>
              <div className="mt-0.5 text-muted-foreground">
                Click <strong>Import PDFs</strong> below — this is a one-time copy from Drive into your app.
                After this, PDFs live inside Dixon Command and never need to sync again.
              </div>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">
              {pdfs.filter((p) => p.public_url).length} PDFs hosted in your app
            </div>
          )}
          <Button size="sm" variant={needsImport ? "default" : "outline"} onClick={importFromDrive} disabled={seeding}>
            <CloudDownload className={`mr-1.5 h-3.5 w-3.5 ${seeding ? "animate-pulse" : ""}`} />
            {seeding ? "Importing…" : needsImport ? "Import PDFs" : "Re-import"}
          </Button>
        </div>
      )}

      <div className={isRail ? "space-y-2" : "grid gap-4 md:grid-cols-2"}>
        {offers.map((o) => {
          const offerPdfs = pdfsFor(o.slug);
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
                <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground/90">
                  {detail}
                </pre>
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
                      <FileText className={`h-3.5 w-3.5 shrink-0 ${isStored(p) ? "text-primary" : "text-muted-foreground"}`} />
                      <span className="flex-1 truncate text-xs" title={p.name}>
                        {p.name}
                      </span>
                      <button onClick={() => setPreviewing(p)} className="rounded p-1 hover:bg-background" title="Preview">
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      {fileUrl(p) && (
                        <a
                          href={fileUrl(p)}
                          target="_blank"
                          rel="noreferrer"
                          download
                          className="rounded p-1 hover:bg-background"
                          title="Download"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </a>
                      )}
                      <button
                        onClick={() => {
                          add({
                            kind: "pdf",
                            id: p.id,
                            name: p.name,
                            driveFileId: p.drive_file_id ?? "",
                            driveUrl: fileUrl(p),
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
          {previewing && fileUrl(previewing) && <iframe src={fileUrl(previewing)} className="flex-1 w-full" title={previewing.name} />}
          <div className="flex justify-end gap-2 border-t p-3">
            {previewing && fileUrl(previewing) && (
              <Button size="sm" variant="outline" asChild>
                <a href={fileUrl(previewing)} target="_blank" rel="noreferrer" download>
                  <Download className="mr-1.5 h-3.5 w-3.5" /> Download
                </a>
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => {
                if (!previewing) return;
                add({
                  kind: "pdf",
                  id: previewing.id,
                  name: previewing.name,
                  driveFileId: previewing.drive_file_id ?? "",
                  driveUrl: fileUrl(previewing),
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
