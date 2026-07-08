import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { CartProvider } from "./components/CartContext";
import SiteHeader from "./components/SiteHeader";
import { CATEGORY_ORDER } from "./lib/catalog";

export const metadata: Metadata = {
  title: "The Rusti Shack — Beach & Dive Shop on Apo Island",
  description:
    "Snorkel gear, surf, fishing tackle, beach essentials and apparel — buy or rent it all at The Rusti Shack on Apo Island, Philippines.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <CartProvider>
          <SiteHeader />

          {children}

          <footer className="footer">
            <div className="footer__inner">
              <div>
                <div className="footer__brand">🐚 The Rusti Shack</div>
                <p style={{ marginTop: 8, maxWidth: 260, fontSize: "0.9rem" }}>
                  Your beach &amp; dive shop on Apo Island — gear to buy, gear to rent,
                  and everything you need for a perfect day on the reef.
                </p>
              </div>
              <div className="footer__cols">
                <div>
                  <h5>Shop</h5>
                  {CATEGORY_ORDER.map((c) => (
                    <Link key={c} href={`/shop?category=${encodeURIComponent(c)}`}>
                      {c}
                    </Link>
                  ))}
                </div>
                <div>
                  <h5>Explore</h5>
                  <Link href="/shop">All products</Link>
                  <Link href="/apo-island">About Apo Island</Link>
                  <Link href="/cart">Cart</Link>
                </div>
              </div>
            </div>
            <div className="footer__bottom">
              © 2026 The Rusti Shack · Apo Island, Negros Oriental, Philippines 🌴
            </div>
          </footer>
        </CartProvider>
      </body>
    </html>
  );
}
