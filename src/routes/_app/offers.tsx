import { createFileRoute } from "@tanstack/react-router";
import { OffersPanel } from "@/components/OffersPanel";

export const Route = createFileRoute("/_app/offers")({
  head: () => ({
    meta: [
      { title: "Offers & Products — Dixon Command" },
      { name: "description", content: "Full Dixon offer stack with PDFs and email-ready details." },
    ],
  }),
  component: OffersPage,
});

function OffersPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10 space-y-4 md:space-y-6">
      <header>
        <h1 className="font-display text-2xl md:text-3xl font-semibold">Offers & Products</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every Dixon offer expanded with full pitch details. Tap an offer&rsquo;s &ldquo;Add to email&rdquo;
          to drop it into your pending email tray.
        </p>
      </header>
      <OffersPanel variant="full" />
    </div>
  );
}
