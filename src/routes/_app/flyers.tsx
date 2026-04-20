import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Eye, Mail, FileText, Download, Search } from "lucide-react";
import { LOCAL_OFFER_PDFS, type LocalOfferPdf } from "@/lib/localOfferPdfs";
import { usePendingTray } from "@/lib/pendingTrayStore";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/flyers")({
  component: FlyersPage,
});

const OFFER_LABELS: Record<string, string> = {
  amateur_endorsement: "Amateur Endorsement",
  dixon_challenge: "Dixon Challenge (Par 3)",
  aurelius_challenge: "Aurelius Challenge (Par 5)",
  fiesta_bowl: "Fiesta Bowl Hole-in-One",
  legend_shootout: "LEGEND Shootout",
  cgt: "Charity Golf Today (CGT)",
  custom_products: "Custom Products",
  sponsorship_packages: "Sponsorship Packages",
  hole_in_one_insurance: "Hole-in-One Insurance",
  consulting: "Consulting",
  auction_referral: "Auction Referral",
};

type FlatPdf = LocalOfferPdf & { offerSlug: string; offerLabel: string };

function FlyersPage() {
  const [previewing, setPreviewing] = useState<FlatPdf | null>(null);
  const [query, setQuery] = useState("");
  const add = usePendingTray((s) => s.add);

  const grouped = useMemo(() => {
    const out: { slug: string; label: string; pdfs: FlatPdf[] }[] = [];
    for (const [slug, pdfs] of Object.entries(LOCAL_OFFER_PDFS)) {
      if (!pdfs.length) continue;
      const label = OFFER_LABELS[slug] ?? slug;
      const flat: FlatPdf[] = pdfs.map((p) => ({ ...p, offerSlug: slug, offerLabel: label }));
      const filtered = query
        ? flat.filter(
            (p) =>
              p.name.toLowerCase().includes(query.toLowerCase()) ||
              label.toLowerCase().includes(query.toLowerCase()),
          )
        : flat;
      if (filtered.length) out.push({ slug, label, pdfs: filtered });
    }
    return out;
  }, [query]);

  const totalCount = useMemo(
    () => Object.values(LOCAL_OFFER_PDFS).reduce((n, arr) => n + arr.length, 0),
    [],
  );

  const addToEmail = (p: FlatPdf) => {
    const absoluteUrl =
      typeof window !== "undefined" ? new URL(p.file, window.location.origin).toString() : p.file;
    add({
      kind: "pdf",
      id: p.id,
      name: p.name,
      driveFileId: "",
      driveUrl: absoluteUrl,
    });
    toast.success(`Added "${p.name}" to email tray`);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 md:p-6">
      <header className="space-y-1">
        <h1 className="font-display text-xl font-semibold md:text-2xl">PDF Flyers</h1>
        <p className="text-xs text-muted-foreground md:text-sm">
          {totalCount} flyers ready to preview, download, or attach to an email.
        </p>
      </header>

      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search flyers…"
          className="h-9 pl-8 text-sm"
        />
      </div>

      {grouped.length === 0 && (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          No flyers match "{query}"
        </div>
      )}

      <div className="space-y-5">
        {grouped.map((group) => (
          <section key={group.slug}>
            <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {group.label}
            </h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {group.pdfs.map((p) => (
                <article
                  key={p.id}
                  className="flex items-center gap-2 rounded-lg border bg-card p-2.5 shadow-[var(--shadow-card)]"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium" title={p.name}>
                      {p.name}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() => setPreviewing(p)}
                      title="Quick view"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button asChild size="sm" variant="ghost" className="h-8 w-8 p-0" title="Download">
                      <a href={p.file} target="_blank" rel="noreferrer" download>
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() => addToEmail(p)}
                      title="Add to email"
                    >
                      <Mail className="h-4 w-4" />
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>

      <Dialog open={!!previewing} onOpenChange={(v) => !v && setPreviewing(null)}>
        <DialogContent className="flex h-[90vh] w-[95vw] max-w-5xl flex-col gap-0 p-0">
          <DialogHeader className="border-b px-4 py-3">
            <DialogTitle className="text-sm font-medium">{previewing?.name}</DialogTitle>
          </DialogHeader>
          {previewing && (
            <iframe src={previewing.file} className="flex-1 w-full" title={previewing.name} />
          )}
          <div className="flex flex-wrap justify-end gap-2 border-t p-3">
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
                addToEmail(previewing);
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
