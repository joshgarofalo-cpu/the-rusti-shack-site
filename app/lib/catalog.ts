import productsData from "@/data/products.json";
import categoriesData from "@/data/categories.json";

export type Variant = {
  sku: string;
  size: string | null;
  color: string | null;
  gender: string | null;
  unitPrice: number | null;
  unitCost: number | null;
  rentalRate: number | null;
  availability: string;
};

export type ColorOption = { color: string | null; image: string };

export type Availability = "Both" | "Sale only" | "Rental only";

export type Product = {
  sku: string;
  name: string;
  category: string;
  subcategory: string;
  price: number | null;
  unitCost: number | null;
  rentalRate: number | null;
  availability: Availability | string;
  supplier: string | null;
  yearIntroduced: number | null;
  type: "parent" | "standalone";
  colors: ColorOption[];
  variants: Variant[];
  image: string | null;
  lifestyle: string | null;
};

export type Category = {
  name: string;
  count: number;
  variantCount: number;
  photoCount: number;
  priceLow: number;
  priceHigh: number;
  rentable: number;
};

export const products = productsData as Product[];
export const categories = categoriesData as Category[];

/* Display order used across the site. */
export const CATEGORY_ORDER = [
  "Snorkel & Dive",
  "Surfing",
  "Beach Essentials",
  "Fishing",
  "Apparel",
];

/* A lifestyle photo that represents each category (for cards / headers). */
export const CATEGORY_IMAGE: Record<string, string> = {
  "Snorkel & Dive": "/lifestyle/SNK-001.jpg",
  Surfing: "/lifestyle/SUR-003.jpg",
  "Beach Essentials": "/lifestyle/BCH-005.jpg",
  Fishing: "/lifestyle/FSH-001.jpg",
  Apparel: "/lifestyle/APP-004.jpg",
};

export const CATEGORY_BLURB: Record<string, string> = {
  "Snorkel & Dive": "Masks, fins, snorkels & wetsuits for exploring the reef.",
  Surfing: "Boards, skimboards & kitesurf gear for every swell.",
  "Beach Essentials": "Towels, shade, coolers, sunnies & reef-safe sun care.",
  Fishing: "Rods, reels, tackle & fresh bait for the day's catch.",
  Apparel: "Rashguards, tees, hats & swimwear built for salt & sun.",
};

export function getProduct(sku: string): Product | undefined {
  return products.find((p) => p.sku === sku);
}

export function productsByCategory(category: string): Product[] {
  return products
    .filter((p) => p.category === category)
    .sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
}

/** Can this item be bought? */
export function isSellable(p: Product): boolean {
  return p.availability !== "Rental only";
}

/** Can this item be rented by the day? */
export function isRentable(p: Product): boolean {
  return p.availability !== "Sale only" && !!p.rentalRate;
}
