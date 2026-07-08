"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "./CartContext";

const LINKS = [
  { href: "/shop", label: "Shop" },
  { href: "/shop?category=Snorkel+%26+Dive", label: "Rentals" },
  { href: "/apo-island", label: "Apo Island" },
];

export default function SiteHeader() {
  const { count } = useCart();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close the mobile menu whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className="nav">
      <div className="nav__inner">
        <Link href="/" className="nav__brand">🐚 The Rusti Shack</Link>

        <nav className="nav__links" aria-label="Primary">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="nav__link">
              {l.label}
            </Link>
          ))}
          <CartLink count={count} />
        </nav>

        <div className="nav__mobile">
          <CartLink count={count} compact />
          <button
            className="nav__toggle"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {open && (
        <nav className="nav__drawer" aria-label="Mobile">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="nav__drawer-link">
              {l.label}
            </Link>
          ))}
          <Link href="/cart" className="nav__drawer-link">
            Cart{count > 0 ? ` (${count})` : ""}
          </Link>
        </nav>
      )}
    </header>
  );
}

function CartLink({ count, compact }: { count: number; compact?: boolean }) {
  return (
    <Link
      href="/cart"
      className={compact ? "nav__cart nav__cart--compact" : "nav__cart"}
      aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`}
    >
      🛒
      {count > 0 && <span className="nav__cart-badge">{count}</span>}
    </Link>
  );
}
