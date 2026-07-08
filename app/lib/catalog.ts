import { sbSelect } from "./supabase";

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

export type CategoryMeta = {
  name: string;
  count: number;
  priceLow: number;
  priceHigh: number;
};

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

// PostgREST select: alias snake_case DB columns back to the app's camelCase.
const SELECT =
  "sku,name,category,subcategory,price,unitCost:unit_cost,rentalRate:rental_rate," +
  "availability,supplier,yearIntroduced:year_introduced,type,image,lifestyle,colors,variants";

/** Every product, ordered by price (high to low). */
export async function getAllProducts(): Promise<Product[]> {
  return sbSelect<Product[]>(`products?select=${SELECT}&order=price.desc.nullslast`);
}

export async function getProduct(sku: string): Promise<Product | undefined> {
  const rows = await sbSelect<Product[]>(
    `products?sku=eq.${encodeURIComponent(sku)}&select=${SELECT}&limit=1`
  );
  return rows[0];
}

export async function getProductsByCategory(category: string): Promise<Product[]> {
  return sbSelect<Product[]>(
    `products?category=eq.${encodeURIComponent(category)}&select=${SELECT}&order=price.desc.nullslast`
  );
}

/** Category cards/counters, derived from the live catalog. */
export async function getCategories(): Promise<CategoryMeta[]> {
  const products = await getAllProducts();
  return CATEGORY_ORDER.map((name) => {
    const inCat = products.filter((p) => p.category === name);
    const prices = inCat.map((p) => p.price ?? 0).filter((n) => n > 0);
    return {
      name,
      count: inCat.length,
      priceLow: prices.length ? Math.min(...prices) : 0,
      priceHigh: prices.length ? Math.max(...prices) : 0,
    };
  });
}

/** Can this item be bought? */
export function isSellable(p: Product): boolean {
  return p.availability !== "Rental only";
}

/** Can this item be rented by the day? */
export function isRentable(p: Product): boolean {
  return p.availability !== "Sale only" && !!p.rentalRate;
}
