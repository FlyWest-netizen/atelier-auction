import Link from "next/link";
import { supabaseServer } from "@/lib/supabase-server";

const CATEGORIES = ["Sculptures", "Paintings", "Drawings & Watercolor Paintings", "Prints", "Photography", "Editions", "All Art"];

function fmtMoney(n) {
  return "$" + Number(n).toLocaleString("en-US");
}

function matchesCategory(lot, category) {
  const m = (lot.medium || "").toLowerCase();
  switch (category) {
    case "Sculptures": return m.includes("sculpture");
    case "Paintings": return m.includes("paint") && !m.includes("watercolor");
    case "Drawings & Watercolor Paintings": return m.includes("watercolor") || m.includes("drawing") || m.includes("pencil") || m.includes("charcoal") || m.includes("ink");
    case "Prints": return m.includes("print") || m.includes("lithograph") || m.includes("etching") || m.includes("screenprint");
    case "Photography": return m.includes("photo");
    case "Editions": return !!(lot.edition_info && lot.edition_info.trim());
    default: return true; // All Art
  }
}

function LotCard({ lot, tag }) {
  return (
    <Link href={`/lot/${lot.id}`} style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 4, overflow: "hidden", display: "block" }}>
      <div style={{ aspectRatio: "4/3", background: "var(--parchment)", position: "relative" }}>
        {lot.images?.[0] && <img src={lot.images[0]} alt={lot.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
        {tag && (
          <span className="mono" style={{ position: "absolute", top: 10, left: 10, background: "var(--ink)", color: "var(--gallery)", fontSize: 10, padding: "3px 8px", borderRadius: 20, letterSpacing: 0.5 }}>
            {tag}
          </span>
        )}
      </div>
      <div style={{ padding: 14 }}>
        <p className="serif" style={{ fontSize: 16, fontWeight: 600 }}>{lot.title}</p>
        <p style={{ fontSize: 12.5, color: "var(--muted)" }}>{lot.artist}</p>
        <p className="mono" style={{ fontSize: 15, color: "var(--green)", fontWeight: 600, marginTop: 6 }}>{fmtMoney(lot.current_bid)}</p>
      </div>
    </Link>
  );
}

function Section({ eyebrow, title, children, empty }) {
  return (
    <section style={{ padding: "36px 0", borderBottom: "1px solid var(--line)" }}>
      <p className="mono" style={{ color: "var(--brass)", fontSize: 11, letterSpacing: 2, marginBottom: 6 }}>{eyebrow}</p>
      <h2 className="serif" style={{ fontSize: 26, fontWeight: 600, marginBottom: 20 }}>{title}</h2>
      {empty ? (
        <p style={{ color: "var(--muted)", fontSize: 13.5 }}>{empty}</p>
      ) : (
        <div style={{ display: "grid", gap: 20, gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))" }}>
          {children}
        </div>
      )}
    </section>
  );
}

function CategorySidebar({ active }) {
  return (
    <aside style={{ paddingTop: 36 }}>
      <p className="serif" style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Shop by Category</p>
      <nav style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {CATEGORIES.map((cat) => {
          const isActive = cat === active;
          const href = cat === "All Art" ? "/" : `/?category=${encodeURIComponent(cat)}`;
          return (
            <Link
              key={cat}
              href={href}
              style={{
                fontSize: 15,
                color: isActive ? "var(--brass)" : "var(--ink)",
                fontWeight: isActive ? 600 : 400,
                textDecoration: isActive ? "underline" : "none",
              }}
            >
              {cat}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export default async function Home({ searchParams }) {
  const activeCategory = searchParams?.category || "All Art";
  const supabase = supabaseServer();

  const { data: lots } = await supabase
    .from("lots")
    .select("*, profiles(display_name)")
    .eq("status", "certified")
    .order("created_at", { ascending: false });

  const { data: bids } = await supabase.from("bids").select("lot_id");

  const allItems = lots || [];
  const items = allItems.filter((l) => matchesCategory(l, activeCategory));
  const now = Date.now();
  const active = items.filter((l) => new Date(l.ends_at) > now);
  const soldLots = items.filter((l) => new Date(l.ends_at) <= now && Number(l.current_bid) > Number(l.starting_bid));

  const featured = [...active].sort((a, b) => Number(b.current_bid) - Number(a.current_bid)).slice(0, 4);
  const newlyAdded = active.slice(0, 4);
  const recentlySold = [...soldLots].sort((a, b) => new Date(b.ends_at) - new Date(a.ends_at)).slice(0, 4);

  const bidCounts = {};
  (bids || []).forEach((b) => { bidCounts[b.lot_id] = (bidCounts[b.lot_id] || 0) + 1; });

  const artistTotals = {};
  items.forEach((lot) => {
    const count = bidCounts[lot.id] || 0;
    if (count > 0) artistTotals[lot.artist] = (artistTotals[lot.artist] || 0) + count;
  });
  const trendingArtists = Object.entries(artistTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([artist, count]) => ({
      artist,
      count,
      lot: items.find((l) => l.artist === artist && bidCounts[l.id] > 0),
    }));

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px 80px" }}>
      <header style={{ padding: "28px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className="serif" style={{ fontSize: 22, fontWeight: 600 }}>The Atelier Auction</span>
        <Link href="/submit" className="mono" style={{ background: "var(--brass)", padding: "9px 16px", borderRadius: 3, fontSize: 13, fontWeight: 600 }}>
          + List Artwork
        </Link>
      </header>

      <section style={{ padding: "40px 0", borderBottom: "1px solid var(--line)" }}>
        <p className="mono" style={{ color: "var(--brass)", fontSize: 12, letterSpacing: 2, marginBottom: 10 }}>
          {active.length} LOT{active.length === 1 ? "" : "S"} · EVERY PIECE AUTHENTICATED BEFORE LISTING
        </p>
        <h1 className="serif" style={{ fontSize: 40, lineHeight: 1.1, maxWidth: 620, fontWeight: 600 }}>
          Where collectors meet the gavel.
        </h1>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 40 }}>
        <CategorySidebar active={activeCategory} />

        <div>
          {activeCategory !== "All Art" && (
            <p style={{ padding: "36px 0 0", color: "var(--muted)", fontSize: 13.5 }}>
              Showing <strong style={{ color: "var(--ink)" }}>{activeCategory}</strong> — {items.length} piece{items.length === 1 ? "" : "s"}
            </p>
          )}

          {allItems.length === 0 ? (
            <p style={{ padding: "60px 0", color: "var(--muted)" }}>No lots yet — be the first to list one.</p>
          ) : items.length === 0 ? (
            <p style={{ padding: "60px 0", color: "var(--muted)" }}>No pieces in this category yet.</p>
          ) : (
            <>
              <Section
                eyebrow="TOP VALUE, LIVE NOW"
                title="Featured Collection"
                empty={featured.length === 0 ? "No active lots yet." : null}
              >
                {featured.map((lot) => <LotCard key={lot.id} lot={lot} tag="Featured" />)}
              </Section>

              <Section
                eyebrow="JUST LISTED"
                title="Newly Added"
                empty={newlyAdded.length === 0 ? "Nothing new right now." : null}
              >
                {newlyAdded.map((lot) => <LotCard key={lot.id} lot={lot} tag="New" />)}
              </Section>

              <Section
                eyebrow="GETTING THE MOST BIDS"
                title="Trending Artists"
                empty={trendingArtists.length === 0 ? "No bidding activity yet — trends will show up here once bids come in." : null}
              >
                {trendingArtists.map(({ artist, count, lot }) => lot && (
                  <LotCard key={artist} lot={lot} tag={`${count} bid${count === 1 ? "" : "s"}`} />
                ))}
              </Section>

              <Section
                eyebrow="CLOSED WITH WINNING BIDS"
                title="Recently Sold"
                empty={recentlySold.length === 0 ? "No completed sales yet." : null}
              >
                {recentlySold.map((lot) => <LotCard key={lot.id} lot={lot} tag="Sold" />)}
              </Section>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
