import { adminSelect, adminInsert } from "./supabase-admin";
import { WEB } from "./orders";
import type { CheckoutPayload } from "./webstore";

// Web customers get IDs in their own C9xxxx block, distinct from counter sales.
const CUST_BASE = 90000;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Record the customer in Supabase (Customers_Core + Customers_Contact), reusing
 * their CustomerID if we've already seen the email. The street address lives on
 * Customers_Contact per Rusti's schema. Returns the CustomerID to stamp on the order.
 */
export async function upsertWebCustomer(
  p: CheckoutPayload
): Promise<{ id: string; isNew: boolean }> {
  const email = p.email.trim();

  // Returning customer? Match on email (case-insensitive) in Customers_Contact.
  const existing = await adminSelect<{ CustomerID: string }[]>(
    `Customers_Contact?Email=ilike.${encodeURIComponent(email)}&select=CustomerID&limit=1`
  );
  if (existing.length) return { id: existing[0].CustomerID, isNew: false };

  // Next free C9xxxx id (based on the highest existing web id).
  const all = await adminSelect<{ CustomerID: string }[]>(
    `Customers_Core?select=CustomerID`
  );
  let max = CUST_BASE;
  for (const c of all) {
    const m = /^C(\d+)$/.exec(c.CustomerID);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  const id = `C${max + 1}`;

  // Core first (Contact references it), then Contact with the address columns.
  await adminInsert("Customers_Core", [
    {
      CustomerID: id,
      FirstName: p.firstName.trim(),
      LastName: p.lastName.trim(),
      CustomerType: WEB.CustomerType,
      JoinDate: today(),
      City: p.city.trim(),
      Country: p.country.trim(),
    },
  ]);
  await adminInsert("Customers_Contact", [
    {
      CustomerID: id,
      Email: email,
      Phone: p.phone.trim(),
      LoyaltyMember: p.loyalty ? "Yes" : "No",
      StreetAddress: p.street.trim(),
      Region: p.region.trim(),
      PostalCode: p.postalCode.trim(),
    },
  ]);

  return { id, isNew: true };
}
