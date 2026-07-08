/**
 * Record shapes that mirror Rusti's spreadsheet ("her books"), so web orders
 * drop straight into the same columns. See the dataset's DataDictionary.
 */

// How web orders map onto the books (from Rusti's instructions):
export const WEB = {
  LocationID: "SHIP-INTL", // web orders ship out internationally
  SalesAssociate: "WEB", // nobody rings them up — WEB marks a website sale
  Channel: "Shipping",
  PaymentMethod: "Card", // card payments through the site
  CustomerType: "Shipping", // international online buyer
} as const;

// Simple, transparent international shipping rule (Rusti can change the numbers).
export const SHIPPING_FLAT = 14.9;
export const FREE_SHIPPING_OVER = 250;
export function shippingFee(subtotal: number): number {
  return subtotal >= FREE_SHIPPING_OVER ? 0 : SHIPPING_FLAT;
}

/** Orders sheet — one row per order. */
export type OrderRecord = {
  OrderID: string; // e.g. ORD900001
  OrderDate: string; // YYYY-MM-DD
  CustID: string; // FK -> Customers_Core.CustomerID
  LocationID: string; // SHIP-INTL
  SalesAssociate: string; // WEB
  Channel: string; // Shipping
  ShippingFee: number;
  OrderTotal: number; // line revenue + shipping
  PaymentMethod: string; // Card
  // New with the website — street addresses used to live on courier slips.
  ShipName: string;
  ShipStreet: string;
  ShipCity: string;
  ShipRegion: string;
  ShipPostalCode: string;
  ShipCountry: string;
};

/** OrderLines sheet — one row per item in an order. */
export type OrderLineRecord = {
  OrderID: string;
  LineNumber: number;
  ProductCode: string; // SKU
  Quantity: number;
  UnitPrice: number;
  DiscountPct: number; // 0 online (no promos yet)
  LineRevenue: number; // Qty x UnitPrice x (1 - Discount/100)
  LineCost: number; // Qty x UnitCost
};

/** Customers_Core — who they are. */
export type CustomerCore = {
  CustomerID: string; // e.g. C90001
  FirstName: string;
  LastName: string;
  CustomerType: string; // Shipping
  JoinDate: string; // first transaction date
  City: string;
  Country: string;
};

/** Customers_Contact — how to reach them. */
export type CustomerContact = {
  CustomerID: string;
  Email: string;
  Phone: string;
  LoyaltyMember: string; // Yes / No
};

export type CheckoutLineInput = {
  sku: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
};

export function buildOrderLines(
  orderId: string,
  lines: CheckoutLineInput[]
): OrderLineRecord[] {
  return lines.map((l, i) => {
    const discount = 0;
    const revenue = round2(l.quantity * l.unitPrice * (1 - discount / 100));
    const cost = round2(l.quantity * l.unitCost);
    return {
      OrderID: orderId,
      LineNumber: i + 1,
      ProductCode: l.sku,
      Quantity: l.quantity,
      UnitPrice: round2(l.unitPrice),
      DiscountPct: discount,
      LineRevenue: revenue,
      LineCost: cost,
    };
  });
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
