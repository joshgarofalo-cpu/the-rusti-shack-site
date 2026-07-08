"use client";

import { useState } from "react";
import { useCart } from "./CartContext";

type Props = {
  sku: string;
  name: string;
  image: string | null;
  price: number | null;
};

/** Online the shop only sells — no rental option here (rentals stay on the island). */
export default function AddToCart({ sku, name, image, price }: Props) {
  const { add } = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  if (price == null) return null;

  function handleAdd() {
    add({ sku, name, image, price: price as number }, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  }

  return (
    <div className="atc">
      <div className="atc__row">
        <div className="atc__qty" aria-label="Quantity">
          <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease quantity">−</button>
          <span>{qty}</span>
          <button onClick={() => setQty((q) => q + 1)} aria-label="Increase quantity">+</button>
        </div>
        <button className="btn btn--primary atc__add" onClick={handleAdd}>
          {added ? "Added ✓" : `Add to cart · $${(price * qty).toFixed(2)}`}
        </button>
      </div>
    </div>
  );
}
