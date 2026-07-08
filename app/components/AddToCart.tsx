"use client";

import { useState } from "react";
import { useCart, type CartMode } from "./CartContext";

type Props = {
  sku: string;
  name: string;
  image: string | null;
  price: number | null;
  rentalRate: number | null;
  availability: string;
};

export default function AddToCart({
  sku,
  name,
  image,
  price,
  rentalRate,
  availability,
}: Props) {
  const { add } = useCart();
  const canBuy = availability !== "Rental only" && price != null;
  const canRent = availability !== "Sale only" && rentalRate != null;

  const [mode, setMode] = useState<CartMode>(canBuy ? "buy" : "rent");
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const unit = mode === "buy" ? price ?? 0 : rentalRate ?? 0;

  function handleAdd() {
    add({ sku, name, image, mode, price: unit }, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  }

  return (
    <div className="atc">
      {canBuy && canRent && (
        <div className="atc__modes" role="group" aria-label="Buy or rent">
          <button
            className={`atc__mode ${mode === "buy" ? "is-active" : ""}`}
            onClick={() => setMode("buy")}
          >
            Buy · ${price?.toFixed(2)}
          </button>
          <button
            className={`atc__mode ${mode === "rent" ? "is-active" : ""}`}
            onClick={() => setMode("rent")}
          >
            Rent · ${rentalRate?.toFixed(2)}<span className="atc__per">/day</span>
          </button>
        </div>
      )}

      <div className="atc__row">
        <div className="atc__qty" aria-label="Quantity">
          <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease quantity">−</button>
          <span>{qty}</span>
          <button onClick={() => setQty((q) => q + 1)} aria-label="Increase quantity">+</button>
        </div>
        <button className="btn btn--primary atc__add" onClick={handleAdd}>
          {added
            ? "Added ✓"
            : `Add to cart · $${(unit * qty).toFixed(2)}${mode === "rent" ? "/day" : ""}`}
        </button>
      </div>
      {mode === "rent" && (
        <p className="atc__note">Rental price is per day — pay when you pick up on the island.</p>
      )}
    </div>
  );
}
