import { Target, Shirt, Briefcase, Wrench, Trophy, Gift, Crown } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type CatalogProduct = {
  name: string;
  description: string;
  details?: string[];
  price?: string;
  msrp?: string;
};

export type CatalogCategory = {
  slug: string;
  title: string;
  Icon: LucideIcon;
  blurb?: string;
  products: CatalogProduct[];
};

export const DIXON_CATALOG_SOURCE =
  "https://www.dixongolf.com/customproducts.php?e=30490&c=249cee";

export const DIXON_CATALOG: CatalogCategory[] = [
  {
    slug: "cat-golf-balls",
    title: "Golf Balls",
    Icon: Target,
    products: [
      {
        name: "Dixon Wind (dozen)",
        description: "Designed for the mid to high handicap player looking for great distance.",
        details: ["Min Qty: 12", "4 Color Logo, 1\"", "Up to 2 logos", "10 Days (5 with Rush)"],
        msrp: "$29.99",
        price: "$23.99",
      },
      {
        name: "Dixon Earth (dozen)",
        description: "Dixon's most popular ball, built for the low to mid handicap player.",
        details: ["Min Qty: 12", "4 Color Logo, 1\"", "Up to 2 logos", "10 Days (5 with Rush)"],
        msrp: "$39.95",
        price: "$27.99",
      },
      {
        name: "Dixon Fire (dozen)",
        description: "Tour Performance and quality for the golfer who demands the best.",
        details: ["Min Qty: 12", "4 Color Logo, 1\"", "Up to 2 logos", "10 Days (5 with Rush)"],
        msrp: "$74.95",
        price: "$44.99",
      },
      {
        name: "Dixon Spirit (dozen)",
        description: "The world's first 100% eco-friendly golf ball designed for her.",
        details: ["Min Qty: 12", "4 Color Logo, 1\"", "Up to 2 logos", "10 Days (5 with Rush)"],
        msrp: "$32.99",
        price: "$26.99",
      },
    ],
  },
  {
    slug: "cat-apparel",
    title: "Apparel",
    Icon: Shirt,
    products: [
      {
        name: "Dixon Tour One White Polo",
        description: "Keep your golfers cool and dry while they represent your organization.",
        details: ["Min Qty: 10", "Full Color Sublimation", "Front 6\"x4\", Sleeve 4\"x3\", Back 10\"x10\"", "Up to 3 logos", "14 Days (10 with Rush)"],
        msrp: "$49.95",
        price: "$34.99",
      },
      {
        name: "Pullover",
        description: "Ideal for early morning tee-times or windy days — practical for everyday wear.",
        details: ["Min Qty: 25", "Full Color Sublimation (limited by grey fabric)", "Front 6\"x4\", Sleeve 3\"x6\"", "Up to 3 logos", "14 Days (10 with Rush)"],
        msrp: "$79.99",
        price: "$44.99",
      },
    ],
  },
  {
    slug: "cat-bags",
    title: "Bags & Containers",
    Icon: Briefcase,
    products: [
      {
        name: "White Totes",
        description: "Perfect for tournament goodie bags. Min 25 bags with logo.",
        details: ["Min Qty: 1", "Full Color Sublimation", "11\"x9.5\"", "Up to 2 logos", "10 Days (5 Rush)"],
        msrp: "$6.99",
        price: "$2.49",
      },
      {
        name: "Dixon Trunk Organizer",
        description: "Compact locker to organize shoes, tees, balls, gloves & sunscreen.",
        details: ["Min Qty: 20", "White vinyl, 8\"x3\"", "1 logo", "21 Days (14 Rush)"],
        msrp: "$49.95",
        price: "$34.99",
      },
    ],
  },
  {
    slug: "cat-accessories",
    title: "Accessories",
    Icon: Wrench,
    products: [
      { name: "Metal Divot Tool", description: "Sleek, durable divot tool with your logo.", details: ["Min Qty: 25", "Full Color Print", "1 logo", "10 Days (5 Rush)"], msrp: "$11.99", price: "$5.99" },
      { name: "Poker Chip Ball Marker", description: "High quality ball marker coin set into a poker chip.", details: ["Min Qty: 25", "Full Color Print", "1 logo", "10 Days (5 Rush)"], msrp: "$11.99", price: "$5.99" },
      { name: "15in Golf Towel", description: "Standard waffle pattern golf towel in full color.", details: ["Min Qty: 25", "Full Color Print", "10\"x10\"", "Up to 2 logos", "10 Days (5 Rush)"], msrp: "$14.99", price: "$6.99" },
      { name: "Switch Blade Divot Tool", description: "Reliable gadget for every player's gift bag.", details: ["Min Qty: 25", "Full Color Print", "1 logo", "10 Days (5 Rush)"], msrp: "$15.99", price: "$8.49" },
      { name: "Pop Socket", description: "Practical accessory and easy way to increase visibility.", details: ["Min Qty: 50", "Full Color Print", "1.25\"", "10 Days (5 Rush)"], msrp: "$9.99", price: "$2.99" },
      { name: "Bamboo Tee with Logo (bag of 8)", description: "Customized eco-friendly bamboo tees, 8 per bag.", details: ["Min Qty: 100", "Full Color Print", "2\"", "10 Days (5 Rush)"], msrp: "$7.99", price: "$3.99" },
      { name: "Dixon Golf Pin Flags — 14\" x 20\"", description: "Full color pin flags with tube-style attachment.", details: ["Min Qty: 5"], msrp: "$49.99", price: "$29.99" },
      { name: "Slap Drink Koozie", description: "Slap koozie that wraps standard cans, keeps drinks cold.", details: ["Min Qty: 25", "Full Color Sublimation", "3\"x9\"", "Up to 3 logos", "10 Days (5 Rush)"], msrp: "$9.99", price: "$4.49" },
      { name: "Dixon Mini Golf Bag Cooler", description: "Holds 8 cans plus side pockets — perfect for the course.", details: ["Min Qty: 25", "Color vinyl", "1 logo", "21 Days (14 Rush)"], msrp: "$29.99", price: "$16.99" },
      { name: "Flask (with Sticker Logo)", description: "Reusable insulated bottle for registration gifts.", details: ["Min Qty: 12", "Full Color Print", "3\"", "10 Days (5 Rush)"], msrp: "$34.99", price: "$19.99" },
    ],
  },
  {
    slug: "cat-hole-in-one",
    title: "Hole-In-One Contests",
    Icon: Trophy,
    blurb: "Insurance-backed prize contests with signage included.",
    products: [
      { name: "Lifetime Experiences", description: "HIO or 50ft putt insurance featuring once-in-a-lifetime travel experiences. Buy 3 holes, get the 4th free.", details: ["HIO or 50ft Putt Insurance", "Choose one or multiple experiences", "Includes airfare, hotel & event tickets", "Includes 18\"x24\" signage"], price: "Starting at $325/Hole" },
      { name: "Privileges Travel Card", description: "Hit a Hole-In-One and receive a $1,000 PRIVILEGES Travel card.", details: ["1 Hole: $100", "4 Holes: $195", "4 Holes w/ Signs: $295"] },
      { name: "Cash Prize Shootout", description: "Four players get a chance at big cash prizes at a HIO shootout hole.", details: ["$25,000 — $195", "$50,000 — $295", "$100,000 — $495", "$1,000,000 — $2,995"] },
      { name: "Exclusive Country Club Vacation", description: "Play & stay at a world-renowned country club. Package valued at over $4,000.", details: ["120-yard attempt; rules apply", "3 day / 2 night stay", "Choice of 6 exclusive clubs", "Includes 18\"x24\" signage"], price: "$250/Hole" },
      { name: "Caribbean Cruise", description: "Win a 5 night / 6 day Royal Caribbean cruise on a 140-yd HIO attempt.", details: ["140-yard attempt; rules apply", "Choice of travel dates", "Includes 18\"x24\" signage"], price: "$200/Hole" },
    ],
  },
  {
    slug: "cat-putting",
    title: "Putting Contest / Closest to the Pin",
    Icon: Target,
    products: [
      { name: "Putting Contest", description: "Raise money while offering huge prizes for sinking a 50ft putt.", details: ["Privileges Travel Card Prize: $100", "$5,000 Cash Prize: $495", "Lifetime Experience Prize: $995", "Includes 18\"x24\" signage"] },
      { name: "RedView Closest to the Pin Contest", description: "Each attendee gets a chance to win a RedView 900 Pro Rangefinder.", details: ["Guaranteed prize challenge", "RedView 900 Pro Rangefinder", "Includes 18\"x24\" signage"], price: "$250" },
    ],
  },
  {
    slug: "cat-gifts-under-50",
    title: "Gift Items $50 and Below",
    Icon: Gift,
    blurb: "Top teams, raffle winners, sponsor thank-yous, goodie bag fillers. *No minimum qty.",
    products: [
      { name: "Dixon Golf Tees (8 pack)", description: "Bamboo eco-friendly tees, 2 3/4\" length, resealable bag.", msrp: "$2.99", price: "$0.79" },
      { name: "LED Flashlight", description: "800 Lumen — Light/Strobe/SOS modes, IPX6 waterproof. By RedView.", details: ["300mAh, up to 12 hrs", "18650 or 3x AAA"], msrp: "$25", price: "$15.00" },
      { name: "Dixon Golf Trunk Organizer", description: "Mesh-ventilated, water-resistant polyester. 13.5\"W x 6.75\"H x 6.75\"D.", msrp: "$49.95", price: "$34.99" },
      { name: "5x7 Wood and Brass Plaque", description: "Acknowledge sponsors and winners with a stylish keepsake.", msrp: "$44.99", price: "$20" },
      { name: "Schwetty Golf Balls", description: "Dozen of the hottest balls in golf — 6 x 2-ball sleeves.", msrp: "$29.95", price: "$22.95" },
      { name: "Gladiator Wedge", description: "Steel head, CNC milled face, satin black, 56° loft. By Aurelius.", msrp: "$99.99", price: "$49.99" },
      { name: "Solar Panel", description: "23% efficiency, 10W 5V 1.3A USB charging. By RedView.", msrp: "$50", price: "$30.00" },
      { name: "Centurion Hybrid", description: "Stainless steel composite head, durable steel shaft. By Aurelius.", msrp: "$149.99", price: "$49.99" },
    ],
  },
  {
    slug: "cat-gifts-over-50",
    title: "Gift Items $50 and Higher",
    Icon: Crown,
    blurb: "Premium prizes for top teams, sponsors and standout goodie bags. *No minimum qty.",
    products: [
      { name: "Dixon $100 Gift Card", description: "Use towards golf balls, apparel and accessories on dixongolf.com.", msrp: "$100", price: "$75" },
      { name: "Massage Gun", description: "20-speed deep tissue, LCD touchscreen, 6 heads, portable case. By Mel's Fitness.", msrp: "$150", price: "$129.99" },
      { name: "Noise Canceling Wireless Headphones", description: "Over-ear, V5.0 BT, 35±3dB NR, 750mAh / 35hr battery. By Cruze.", msrp: "$250", price: "$150" },
      { name: "Golf Rangefinder", description: "Slope, height, fog mode, READi 2, range up to 900M. By RedView.", msrp: "$250", price: "$199.99" },
      { name: "Emperor Driver", description: "Brushed titanium head with copper finish, graphite shaft. By Aurelius.", msrp: "$349.99", price: "$199.99" },
      { name: "Lite Scooter", description: "250W motor, 16 mph, 5.2aH battery, foldable, 8.5\" tires. By Mi.", msrp: "$700", price: "$500" },
    ],
  },
];
