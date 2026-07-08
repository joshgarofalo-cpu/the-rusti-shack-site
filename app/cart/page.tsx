"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "../components/CartContext";

export default function CartPage() {
  const { items, total, setQty, remove, clear } = useCart();
  const [placed, setPlaced] = useState(false);

  if (placed) {
    return (
      <main>
        <div className="container">
          <div className="cart-empty">
            <div style={{ fontSize: "3rem" }}>🐢</div>
            <h1>Salamat! Order noted.</h1>
            <p>
              This is a demo checkout — no payment was taken. On the real shop you&apos;d
              pay here or settle up when you collect your gear on the island.
            </p>
            <Link href="/shop" className="btn btn--primary">Keep browsing</Link>
          </div>
        </div>
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main>
        <div className="container">
          <div className="cart-empty">
            <div style={{ fontSize: "3rem" }}>🛒</div>
            <h1>Your cart&apos;s empty</h1>
            <p>Looks like this one&apos;s still on the beach — go grab some gear.</p>
            <Link href="/shop" className="btn btn--primary">Browse the shop</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main>
      <div className="container">
        <h1 className="cart-title">Your cart</h1>
        <div className="cart">
          <div className="cart__items">
            {items.map((i) => (
              <div key={i.key} className="cart-item">
                <div className="cart-item__img">
                  {i.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={i.image} alt={i.name} />
                  ) : null}
                </div>
                <div className="cart-item__info">
                  <Link href={`/product/${i.sku}`} className="cart-item__name">{i.name}</Link>
                  <span className={`badge ${i.mode === "rent" ? "badge--rent" : "badge--sale"}`}>
                    {i.mode === "rent" ? "Rental · per day" : "Purchase"}
                  </span>
                  <span className="cart-item__price">
                    ${i.price.toFixed(2)}{i.mode === "rent" ? "/day" : ""} each
                  </span>
                </div>
                <div className="cart-item__qty">
                  <button onClick={() => setQty(i.key, i.qty - 1)} aria-label="Decrease quantity">−</button>
                  <span>{i.qty}</span>
                  <button onClick={() => setQty(i.key, i.qty + 1)} aria-label="Increase quantity">+</button>
                </div>
                <div className="cart-item__line">${(i.price * i.qty).toFixed(2)}</div>
                <button className="cart-item__remove" onClick={() => remove(i.key)} aria-label={`Remove ${i.name}`}>
                  ✕
                </button>
              </div>
            ))}
            <button className="cart__clear" onClick={clear}>Clear cart</button>
          </div>

          <aside className="cart__summary">
            <h2>Summary</h2>
            <div className="cart__row">
              <span>Subtotal</span>
              <span>${total.toFixed(2)}</span>
            </div>
            <p className="cart__hint">
              Rental days &amp; shipping are worked out when you collect or we post your order.
            </p>
            <button className="btn btn--primary cart__checkout" onClick={() => setPlaced(true)}>
              Checkout
            </button>
            <p className="cart__demo">Demo checkout — no payment is taken.</p>
          </aside>
        </div>
      </div>
    </main>
  );
}
