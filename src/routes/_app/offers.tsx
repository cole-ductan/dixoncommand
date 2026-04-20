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
    <div className="mx-auto max-w-6xl px-4 py-10 md:px-8 space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold">Offers & Products</h1>
        <p className="mt-1 text-muted-foreground">
          Every Dixon offer expanded with full pitch details. Click 📧 to drop the offer text or any PDF
          into your pending email tray.
        </p>
      </header>
      <OffersPanel variant="full" />
    </div>
  );
}
