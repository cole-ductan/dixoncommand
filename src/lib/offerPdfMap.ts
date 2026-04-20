/**
 * Maps each offer slug to PDF file-name patterns from the Drive folders.
 * Patterns are matched case-insensitive against the file name.
 */
export const OFFER_PDF_MAP: Record<string, string[]> = {
  amateur_endorsement: ["Amateur Endorsement Sheet"],
  dixon_challenge: ["Dixon Challenge Sheet"],
  aurelius_challenge: ["Aurelius Challenge Sheet", "Aurelius Challenge - Flyer"],
  fiesta_bowl: ["Fiesta Bowl"],
  legend_shootout: ["Legend Shootout", "Legent Shootout"],
  cgt: [], // no PDF — platform demo
  custom_products: [
    "Custom Products Quick View",
    "Custom Products Example Bundles",
    "Golf Ball Dixon Earth",
    "Golf Ball Dixon Fire",
    "Golf Ball Dixon Wind",
    "Golf Ball Dixon Spirit",
    "Golf Ball Dixon Vareities",
    "Golf Ball Dixon Varieties",
    "Golf Ball Sponsor Flyer",
    "All In One Challenges - Products",
  ],
  sponsorship_packages: ["Sponsor Event Sheet", "Golf Ball Sponsor Flyer"],
  hole_in_one_insurance: [],
  consulting: ["About Company Sheet"],
  auction_referral: [],
};

export const DRIVE_FOLDER_IDS = [
  "1eZF_51OCOUP0mNsMhRzWacXmpWXB2D5N",
  "1s5-1sxULOG7IHEZizbvb5zGHhOortBO8",
];
