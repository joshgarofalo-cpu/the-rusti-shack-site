"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "../components/CartContext";
import { shippingFee, FREE_SHIPPING_OVER } from "../lib/orders";

type Field = {
  name: string;
  label: string;
  required: boolean;
  half?: boolean;
  type?: string;
};

const FIELDS: Field[] = [
  { name: "firstName", label: "First name", required: true, half: true },
  { name: "lastName", label: "Last name", required: true, half: true },
  { name: "email", label: "Email", required: true, type: "email" },
  { name: "phone", label: "Phone", required: true, type: "tel" },
  { name: "street", label: "Street address", required: true },
  { name: "city", label: "City / town", required: true, half: true },
  { name: "region", label: "Region / state", required: false, half: true },
  { name: "postalCode", label: "Postal code", required: true, half: true },
  { name: "country", label: "Country", required: true, half: true },
];

type FormState = Record<string, string>;

export default function CheckoutPage() {
  const { items, total } = useCart();
  const [form, setForm] = useState<FormState>({});
  const [loyalty, setLoyalty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const shipping = shippingFee(total);
  const orderTotal = Math.round((total + shipping) * 100) / 100;

  if (items.length === 0) {
    return (
      <main>
        <div className="container">
          <div className="cart-empty">
            <div style={{ fontSize: "3rem" }}>🛒</div>
            <h1>Nothing to check out</h1>
            <p>Your cart is empty — add some gear first.</p>
            <Link href="/shop" className="btn btn--primary">Browse the shop</Link>
          </div>
        </div>
      </main>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          loyalty,
          items: items.map((i) => ({ sku: i.sku, qty: i.qty })),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error || "Something went wrong.");
        setSubmitting(false);
        return;
      }
      // Hand off to Stripe's hosted checkout. The cart is cleared on the
      // confirmation page once payment succeeds, so it survives a cancel.
      window.location.href = data.url;
    } catch {
      setError("Could not reach the shop. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <main>
      <div className="container">
        <h1 className="cart-title">Checkout</h1>
        <form className="checkout" onSubmit={handleSubmit}>
          <div className="checkout__form">
            <h2 className="checkout__h2">Where should we ship it?</h2>
            <div className="checkout__grid">
              {FIELDS.map((f) => (
                <label
                  key={f.name}
                  className={`field ${f.half ? "field--half" : ""}`}
                >
                  <span>
                    {f.label}
                    {f.required && <em aria-hidden> *</em>}
                  </span>
                  <input
                    name={f.name}
                    type={f.type ?? "text"}
                    required={f.required}
                    autoComplete={autoComplete(f.name)}
                    value={form[f.name] ?? ""}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, [f.name]: e.target.value }))
                    }
                  />
                </label>
              ))}
            </div>

            <label className="checkout__loyalty">
              <input
                type="checkbox"
                checked={loyalty}
                onChange={(e) => setLoyalty(e.target.checked)}
              />
              <span>Join the loyalty list for island news &amp; offers.</span>
            </label>

            {error && <p className="checkout__error" role="alert">{error}</p>}
          </div>

          <aside className="cart__summary checkout__summary">
            <h2>Your order</h2>
            <ul className="checkout__lines">
              {items.map((i) => (
                <li key={i.key}>
                  <span>{i.qty} × {i.name}</span>
                  <span>${(i.price * i.qty).toFixed(2)}</span>
                </li>
              ))}
            </ul>
            <div className="cart__row" style={{ fontSize: "1rem", fontWeight: 600 }}>
              <span>Subtotal</span><span>${total.toFixed(2)}</span>
            </div>
            <div className="cart__row" style={{ fontSize: "1rem", fontWeight: 600, marginTop: 0 }}>
              <span>Shipping</span>
              <span>{shipping === 0 ? "Free" : `$${shipping.toFixed(2)}`}</span>
            </div>
            <div className="cart__row">
              <span>Total</span><span>${orderTotal.toFixed(2)}</span>
            </div>
            {shipping > 0 && (
              <p className="cart__hint">Free worldwide shipping over ${FREE_SHIPPING_OVER}.</p>
            )}
            <button className="btn btn--primary cart__checkout" disabled={submitting}>
              {submitting ? "Redirecting to payment…" : "Continue to payment"}
            </button>
            <p className="cart__demo">
              Secure payment by Stripe. Test mode — use card 4242 4242 4242 4242.
            </p>
          </aside>
        </form>
      </div>
    </main>
  );
}

function autoComplete(name: string): string {
  switch (name) {
    case "firstName": return "given-name";
    case "lastName": return "family-name";
    case "email": return "email";
    case "phone": return "tel";
    case "street": return "address-line1";
    case "city": return "address-level2";
    case "region": return "address-level1";
    case "postalCode": return "postal-code";
    case "country": return "country-name";
    default: return "on";
  }
}
