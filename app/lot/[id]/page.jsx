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
    default: return true;
  }
}

function LotCard({ lot, tag }) {
  return (
    <Link href={`/lot/${lot.id}`} style={{ display: "block", group: "" }} className="lot-card">
      <div style={{ aspectRatio: "4/5", background: "var(--parchment)", position: "relative", borderRadius: 6, overflow: "hidden", marginBottom: 12 }}>
        {lot.images?.[0] && <img src={lot.images[0]} alt={lot.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
        {tag && (
          <span className="mono" style={{ position: "absolute", top: 12, left: 12, background: "rgba(22,24,26,0.85)", color: "var(--gallery)", fontSize: 10, padding: "4px 10px", borderRadius: 20, letterSpacing: 0.6 }}>
            {tag}
          </span>
        )}
      </div>
      <p className="serif" style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.3 }}>{lot.title}</p>
      <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 2 }}>{lot.artist}</p>
      <p className="mono" style={{ fontSize: 14, color: "var(--green)", fontWeight: 600, marginTop: 8 }}>{fmtMoney(lot.current_bid)}</p>
    </Link>
  );
}

function Section({ eyebrow, title, children, empty }) {
  return (
    <section style={{ padding: "52px 0", borderBottom: "1px solid var(--line)" }}>
      <p className="mono" style={{ color: "var(--brass)", fontSize: 11, letterSpacing: 2.5, marginBottom: 8 }}>{eyebrow}</p>
      <h2 className="serif" style={{ fontSize: 30, fontWeight: 600, marginBottom: 28, letterSpacing: -0.3 }}>{title}</h2>
      {empty ? (
        <p style={{ color: "var(--muted)", fontSize: 13.5 }}>{empty}</p>
      ) : (
        <div style={{ display: "grid", gap: 28, gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
          {children}
        </div>
      )}
    </section>
  );
}

function CategorySidebar({ active }) {
  return (
    <aside style={{ paddingTop: 4 }}>
      <p className="mono" style={{ fontSize: 11, letterSpacing: 2, color: "var(--muted)", marginBottom: 18 }}>SHOP BY CATEGORY</p>
      <nav style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {CATEGORIES.map((cat) => {
          const isActive = cat === active;
          const href = cat === "All Art" ? "/" : `/?category=${encodeURIComponent(cat)}`;
          return (
            <Link
              key={cat}
              href={href}
              style={{
                fontSize: 14.5,
                color: isActive ? "var(--ink)" : "var(--muted)",
                fontWeight: isActive ? 600 : 400,
                borderLeft: isActive ? "2px solid var(--brass)" : "2px solid transparent",
                paddingLeft: 12,
                marginLeft: -14,
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
  const heroLot = featured[0] || active[0];

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
    <div>
      <style>{`
        .lot-card:hover img { transform: scale(1.03); }
        .lot-card img { transition: transform .4s ease; }
      `}</style>
      <main style={{ maxWidth: 1160, margin: "0 auto", padding: "0 24px 80px" }}>
        <header style={{ padding: "32px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="serif" style={{ fontSize: 22, fontWeight: 600, letterSpacing: -0.3 }}>The Atelier Auction</span>
          <Link href="/submit" className="mono" style={{ background: "var(--brass)", padding: "10px 18px", borderRadius: 3, fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
            + List Artwork
          </Link>
        </header>

        {heroLot ? (
          <Link href={`/lot/${heroLot.id}`} style={{ display: "block", position: "relative", borderRadius: 10, overflow: "hidden", marginBottom: 8, minHeight: 460, background: "var(--ink)" }}>
            {heroLot.images?.[0] && (
              <img src={heroLot.images[0]} alt={heroLot.title} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.72 }} />
            )}
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(0deg, rgba(22,24,26,0.88) 0%, rgba(22,24,26,0.1) 55%)" }} />
            <div style={{ position: "relative", padding: "48px 40px", minHeight: 460, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
              <p className="mono" style={{ color: "var(--brass-light)", fontSize: 12, letterSpacing: 2.5, marginBottom: 14 }}>
                {active.length} LOT{active.length === 1 ? "" : "S"} · EVERY PIECE AUTHENTICATED BEFORE LISTING
              </p>
              <h1 className="serif" style={{ fontSize: 48, lineHeight: 1.05, color: "var(--gallery)", maxWidth: 620, fontWeight: 600, letterSpacing: -0.5 }}>
                {heroLot.title}
              </h1>
              <p style={{ color: "var(--parchment)", fontSize: 15, marginTop: 10 }}>{heroLot.artist}</p>
              <p className="mono" style={{ color: "var(--brass-light)", fontSize: 20, fontWeight: 600, marginTop: 14 }}>{fmtMoney(heroLot.current_bid)}</p>
            </div>
          </Link>
        ) : (
          <section style={{ padding: "56px 0 40px" }}>
            <p className="mono" style={{ color: "var(--brass)", fontSize: 12, letterSpacing: 2.5, marginBottom: 12 }}>
              EVERY PIECE AUTHENTICATED BEFORE LISTING
            </p>
            <h1 className="serif" style={{ fontSize: 48, lineHeight: 1.05, maxWidth: 640, fontWeight: 600, letterSpacing: -0.5 }}>
              Where collectors meet the gavel.
            </h1>
          </section>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "190px 1fr", gap: 56, marginTop: 8 }}>
          <CategorySidebar active={activeCategory} />

          <div>
            {activeCategory !== "All Art" && (
              <p style={{ padding: "44px 0 0", color: "var(--muted)", fontSize: 13.5 }}>
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
    </div>
  );
}
