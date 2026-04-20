import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Eye, Mail, FileText, Download, Package, ShoppingBag, ExternalLink, Search } from "lucide-react";
import { usePendingTray } from "@/lib/pendingTrayStore";
import { OFFER_EXPANDED } from "@/lib/offerExpanded";
import { LOCAL_OFFER_PDFS, type LocalOfferPdf } from "@/lib/localOfferPdfs";
import { DIXON_CATALOG, DIXON_CATALOG_SOURCE, type CatalogProduct } from "@/lib/dixonCatalog";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/offers")({
  head: () => ({
    meta: [
      { title: "Offers & Products — Dixon Command" },
      { name: "description", content: "Full Dixon offer stack and product catalog with PDFs and email-ready details." },
    ],
  }),
  component: OffersPage,
});

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

function OffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewing, setPreviewing] = useState<LocalOfferPdf | null>(null);
  const [query, setQuery] = useState("");
  const add = usePendingTray((s) => s.add);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("offers").select("*").order("sort_order");
      setOffers((data ?? []) as Offer[]);
      setLoading(false);
    })();
  }, []);

  const q = query.trim().toLowerCase();

  const filteredOffers = useMemo(() => {
    if (!q) return offers;
    return offers.filter((o) => {
      const detail = o.expanded_details || OFFER_EXPANDED[o.slug] || o.details || "";
      return (
        o.name.toLowerCase().includes(q) ||
        (o.type ?? "").toLowerCase().includes(q) ||
        detail.toLowerCase().includes(q)
      );
    });
  }, [offers, q]);

  const filteredCatalog = useMemo(() => {
    if (!q) return DIXON_CATALOG;
    return DIXON_CATALOG.map((cat) => ({
      ...cat,
      products: cat.products.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          (p.details ?? []).some((d) => d.toLowerCase().includes(q)),
      ),
    })).filter((cat) => cat.products.length > 0);
  }, [q]);

  const addProductToEmail = (catTitle: string, p: CatalogProduct) => {
    const lines = [
      p.name,
      p.description,
      ...(p.details ?? []),
      p.price ? `Price: ${p.price}` : "",
      p.msrp ? `MSRP: ${p.msrp}` : "",
    ].filter(Boolean);
    add({
      kind: "offer",
      id: `cat-${p.name}`,
      name: `${catTitle} — ${p.name}`,
      details: lines.join("\n"),
    });
    toast.success(`Added "${p.name}" to email tray`);
  };

  // default open: first offer + first catalog category, or all matches when searching
  const defaultOpen: string[] = q
    ? [...filteredOffers.map((o) => `offer-${o.id}`), ...filteredCatalog.map((c) => c.slug)]
    : [filteredOffers[0] ? `offer-${filteredOffers[0].id}` : "", filteredCatalog[0]?.slug ?? ""].filter(Boolean);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10 space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-semibold">Offers & Products</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tap any offer or category to expand. Use &ldquo;Add to email&rdquo; to drop items into your pending email tray.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <a href={DIXON_CATALOG_SOURCE} target="_blank" rel="noreferrer">
            <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
            View on dixongolf.com
          </a>
        </Button>
      </header>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search offers, products, prizes…"
          className="pl-9"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* DIXON OFFERS (from DB) */}
      <section className="space-y-2">
        <div className="flex items-center gap-2 px-1">
          <Package className="h-4 w-4 text-primary" />
          <h2 className="font-display text-lg font-semibold">Dixon Offers</h2>
          <Badge variant="secondary" className="ml-1">{filteredOffers.length}</Badge>
        </div>

        {loading ? (
          <div className="p-4 text-sm text-muted-foreground">Loading offers…</div>
        ) : filteredOffers.length === 0 ? (
          <Card><CardContent className="py-6 text-center text-sm text-muted-foreground">No offers match.</CardContent></Card>
        ) : (
          <Accordion type="multiple" defaultValue={defaultOpen} className="space-y-2">
            {filteredOffers.map((o) => {
              const offerPdfs = LOCAL_OFFER_PDFS[o.slug] ?? [];
              const detail = o.expanded_details || OFFER_EXPANDED[o.slug] || o.details || "";
              return (
                <AccordionItem
                  key={o.id}
                  value={`offer-${o.id}`}
                  className="border rounded-lg bg-card overflow-hidden"
                >
                  <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-secondary/40">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-primary-foreground"
                        style={{ background: "var(--gradient-fairway)" }}
                      >
                        <Package className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 text-left">
                        <div className="font-medium text-sm md:text-base truncate">{o.name}</div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {o.type}
                          {o.cost ? ` • ${o.cost}` : ""}
                        </div>
                      </div>
                      {offerPdfs.length > 0 && (
                        <Badge variant="outline" className="ml-auto mr-2 shrink-0 gap-1">
                          <FileText className="h-3 w-3" /> {offerPdfs.length}
                        </Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4 pt-0">
                    {o.when_to_introduce && (
                      <p className="mb-2 text-[11px] italic text-muted-foreground">When: {o.when_to_introduce}</p>
                    )}
                    <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground/90">
                      {detail}
                    </pre>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          add({ kind: "offer", id: o.id, name: o.name, details: stripInternalSections(detail) });
                          toast.success(`Added "${o.name}" to email tray`);
                        }}
                      >
                        <Mail className="mr-1.5 h-3 w-3" /> Add to email
                      </Button>
                    </div>
                    {offerPdfs.length > 0 && (
                      <div className="mt-3 space-y-1.5 border-t pt-2">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">PDFs</div>
                        {offerPdfs.map((p) => (
                          <div key={p.id} className="flex items-center gap-2 rounded-md border bg-secondary/30 px-2 py-1.5">
                            <FileText className="h-3.5 w-3.5 shrink-0 text-primary" />
                            <span className="flex-1 truncate text-xs" title={p.name}>{p.name}</span>
                            <button onClick={() => setPreviewing(p)} className="rounded p-1 hover:bg-background" title="Preview">
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                            <a href={p.file} target="_blank" rel="noreferrer" download className="rounded p-1 hover:bg-background" title="Download">
                              <Download className="h-3.5 w-3.5" />
                            </a>
                            <button
                              onClick={() => {
                                const absoluteUrl = typeof window !== "undefined" ? new URL(p.file, window.location.origin).toString() : p.file;
                                add({ kind: "pdf", id: p.id, name: p.name, driveFileId: "", driveUrl: absoluteUrl });
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
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </section>

      {/* DIXON GOLF CATALOG */}
      <section className="space-y-2 pt-2">
        <div className="flex items-center gap-2 px-1">
          <ShoppingBag className="h-4 w-4 text-primary" />
          <h2 className="font-display text-lg font-semibold">Dixon Golf Catalog</h2>
          <Badge variant="secondary" className="ml-1">{filteredCatalog.length}</Badge>
        </div>

        {filteredCatalog.length === 0 ? (
          <Card><CardContent className="py-6 text-center text-sm text-muted-foreground">No catalog items match.</CardContent></Card>
        ) : (
          <Accordion type="multiple" defaultValue={defaultOpen} className="space-y-2">
            {filteredCatalog.map(({ slug, title, Icon, blurb, products }) => (
              <AccordionItem key={slug} value={slug} className="border rounded-lg bg-card overflow-hidden">
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-secondary/40">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-primary-foreground"
                      style={{ background: "var(--gradient-fairway)" }}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 text-left">
                      <div className="font-medium text-sm md:text-base truncate">{title}</div>
                      {blurb && (
                        <div className="text-[11px] text-muted-foreground line-clamp-1 hidden md:block">{blurb}</div>
                      )}
                    </div>
                    <Badge variant="secondary" className="ml-auto mr-2 shrink-0">{products.length}</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 pt-0">
                  {blurb && <p className="text-xs text-muted-foreground mb-3 md:hidden">{blurb}</p>}
                  <div className="grid gap-2 sm:grid-cols-2">
                    {products.map((p) => (
                      <Card key={p.name} className="border-muted">
                        <CardHeader className="p-3 pb-1.5">
                          <CardTitle className="text-sm font-semibold leading-tight">{p.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 pt-0 space-y-2">
                          <p className="text-xs text-muted-foreground">{p.description}</p>
                          {p.details && p.details.length > 0 && (
                            <ul className="text-[11px] text-muted-foreground space-y-0.5 list-disc pl-4">
                              {p.details.map((d) => <li key={d}>{d}</li>)}
                            </ul>
                          )}
                          {(p.price || p.msrp) && (
                            <div className="flex items-baseline gap-2 pt-1">
                              {p.price && <span className="text-sm font-semibold text-foreground">{p.price}</span>}
                              {p.msrp && <span className="text-[11px] text-muted-foreground line-through">MSRP {p.msrp}</span>}
                            </div>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full mt-1"
                            onClick={() => addProductToEmail(title, p)}
                          >
                            <Mail className="mr-1.5 h-3 w-3" /> Add to email
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </section>

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
                add({ kind: "pdf", id: previewing.id, name: previewing.name, driveFileId: "", driveUrl: absoluteUrl });
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
