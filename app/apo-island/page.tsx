import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About Apo Island — The Rusti Shack",
  description:
    "Apo Island is a tiny marine sanctuary off Negros Oriental, Philippines — world-class snorkeling, diving and sea turtles. Here's how to visit.",
};

const cards = [
  {
    emoji: "🐠",
    title: "World-Class Snorkeling & Diving",
    body: "Apo Island is home to one of the Philippines' most thriving marine sanctuaries. Expect vibrant coral gardens, huge sea turtles, reef sharks and an endless rainbow of tropical fish just metres from shore.",
  },
  {
    emoji: "🌅",
    title: "Getting There",
    body: "Hop on a bangka (outrigger boat) from Malatapay Market on the Negros mainland — the crossing takes about 30 minutes. Day trips and overnight stays are both popular options.",
  },
  {
    emoji: "🌿",
    title: "Community-Led Conservation",
    body: "The island's marine sanctuary was established by locals in the 1980s — long before it became a government reserve. The community takes real pride in protecting the reef, and it shows.",
  },
  {
    emoji: "🏄",
    title: "Best Time to Visit",
    body: "The dry season (March–May) brings calm seas and excellent visibility. The shoulder months of November–February are also great. Avoid typhoon season (July–October) if you can.",
  },
  {
    emoji: "🍍",
    title: "Island Life",
    body: "With no cars and only a few hundred residents, Apo moves at a wonderfully slow pace. Enjoy fresh seafood, hammocks in the shade and starry skies far from city lights.",
  },
  {
    emoji: "🛒",
    title: "Stock Up at The Rusti Shack",
    body: "Before you hit the water, swing by The Rusti Shack for snorkel gear, beach towels, reef-safe sunscreen and everything else you need for a perfect day on Apo Island.",
  },
];

export default function ApoIsland() {
  return (
    <main>
      <section className="about-hero">
        <div className="container">
          <div style={{ fontSize: "3.5rem" }}>🏝️</div>
          <h1>Welcome to Apo Island</h1>
          <p>
            Tucked off the southern coast of Negros Oriental in the Philippines, Apo Island
            is a tiny paradise with crystal-clear waters, spectacular coral reefs and some of
            the friendliest sea turtles you&apos;ll ever meet. Whether you&apos;re a seasoned
            diver or a first-time snorkeler, this place will blow you away. 🐢
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="grid grid--3">
            {cards.map((c) => (
              <div key={c.title} className="info-card">
                <div className="info-card__emoji">{c.emoji}</div>
                <h3>{c.title}</h3>
                <p>{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="cta">
        <h2>Ready for the reef?</h2>
        <p>Grab your gear at The Rusti Shack and make the most of your day on the water.</p>
        <Link href="/#shop" className="btn btn--primary">Browse the Shop</Link>
      </section>
    </main>
  );
}
