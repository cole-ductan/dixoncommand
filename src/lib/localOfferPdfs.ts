/**
 * Static manifest of offer PDFs bundled with the app (served from /public/offer-pdfs/).
 * No cloud import needed — these files ship with the build.
 */
export type LocalOfferPdf = {
  id: string;
  name: string;
  file: string; // path under /public
};

export const LOCAL_OFFER_PDFS: Record<string, LocalOfferPdf[]> = {
  amateur_endorsement: [
    { id: "ae-sheet", name: "Amateur Endorsement Sheet", file: "/offer-pdfs/amateur-endorsement.pdf" },
  ],
  dixon_challenge: [
    { id: "dc-sheet", name: "Dixon Challenge Sheet", file: "/offer-pdfs/dixon-challenge-sheet.pdf" },
    { id: "all-in-one", name: "All-In-One Challenges Products", file: "/offer-pdfs/all-in-one-challenges-products.pdf" },
  ],
  aurelius_challenge: [
    { id: "ac-sheet", name: "Aurelius Challenge Sheet", file: "/offer-pdfs/aurelius-challenge-sheet.pdf" },
    { id: "ac-flyer", name: "Aurelius Challenge Flyer", file: "/offer-pdfs/aurelius-challenge-flyer.pdf" },
  ],
  fiesta_bowl: [
    { id: "fb-flyer", name: "Fiesta Bowl Hole-In-One Flyer", file: "/offer-pdfs/fiesta-bowl-flyer.pdf" },
  ],
  legend_shootout: [
    { id: "ls-sheet", name: "LEGEND Shootout Info Sheet", file: "/offer-pdfs/legend-shootout-sheet.pdf" },
    { id: "ls-flyer", name: "LEGEND Shootout Flyer", file: "/offer-pdfs/legend-shootout-flyer.pdf" },
  ],
  cgt: [
    { id: "about", name: "About Dixon Golf", file: "/offer-pdfs/about-company.pdf" },
  ],
  custom_products: [
    { id: "cp-quick", name: "Custom Products Quick View", file: "/offer-pdfs/custom-products-quick-view.pdf" },
    { id: "cp-bundles", name: "Custom Products Example Bundles", file: "/offer-pdfs/custom-products-bundles.pdf" },
    { id: "ball-varieties", name: "Dixon Ball Varieties", file: "/offer-pdfs/ball-varieties.pdf" },
    { id: "ball-earth", name: "Dixon Earth Info Sheet", file: "/offer-pdfs/ball-dixon-earth.pdf" },
    { id: "ball-fire", name: "Dixon Fire Info Sheet", file: "/offer-pdfs/ball-dixon-fire.pdf" },
    { id: "ball-spirit", name: "Dixon Spirit Info Sheet", file: "/offer-pdfs/ball-dixon-spirit.pdf" },
    { id: "ball-wind", name: "Dixon Wind Info Sheet", file: "/offer-pdfs/ball-dixon-wind.pdf" },
  ],
  sponsorship_packages: [
    { id: "sponsor-event", name: "Sponsor Event Sheet", file: "/offer-pdfs/sponsor-event-sheet.pdf" },
    { id: "ball-sponsor-1", name: "Golf Ball Sponsor Flyer", file: "/offer-pdfs/ball-sponsor-flyer-1.pdf" },
    { id: "ball-sponsor-2", name: "Golf Ball Sponsor Flyer (Alt)", file: "/offer-pdfs/ball-sponsor-flyer-2.pdf" },
  ],
  hole_in_one_insurance: [],
  consulting: [],
  auction_referral: [],
};
