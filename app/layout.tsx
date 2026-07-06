import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

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
        <nav className="nav">
          <div className="nav__inner">
            <Link href="/" className="nav__brand">🐚 The Rusti Shack</Link>
            <div className="nav__links">
              <Link href="/#shop" className="nav__link">Shop</Link>
              <Link href="/#rentals" className="nav__link">Rentals</Link>
              <Link href="/apo-island" className="nav__link">Apo Island</Link>
              <Link href="/#visit" className="nav__cta">Visit Us</Link>
            </div>
          </div>
        </nav>

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
                <Link href="/#shop">Snorkel &amp; Dive</Link>
                <Link href="/#shop">Surfing</Link>
                <Link href="/#shop">Beach Essentials</Link>
                <Link href="/#shop">Fishing</Link>
                <Link href="/#shop">Apparel</Link>
              </div>
              <div>
                <h5>Explore</h5>
                <Link href="/apo-island">About Apo Island</Link>
                <Link href="/#rentals">Rent Gear</Link>
                <Link href="/#visit">Find the Shop</Link>
              </div>
            </div>
          </div>
          <div className="footer__bottom">
            © 2026 The Rusti Shack · Apo Island, Negros Oriental, Philippines 🌴
          </div>
        </footer>
      </body>
    </html>
  );
}
