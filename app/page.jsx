import Link from "next/link";
import { supabaseServer } from "@/lib/supabase-server";

const CATALOGUES = ["Prints", "Sculptures", "All Art"];

function fmtMoney(n) {
  return "$" + Number(n).toLocaleString("en-US");
}

function matchesCategory(lot, category) {
  const m = (lot.medium || "").toLowerCase();
  switch (category) {
    case "Sculptures": return m.includes("sculpture");
    case "Prints": return m.includes("print") || m.includes("lithograph") || m.includes("etching") || m.includes("screenprint");
    default: return true; // All Art
  }
}

function LotCard({ lot, tag }) {
  return (
    <Link href={`/lot/${lot.id}`} style={{ display: "block" }} className="lot-card">
      <div style={{ aspectRatio: "4/5", background: "var(--parchment)", position: "relative", borderRadius: 6, overflow: "hidden", marginBottom: 12 }}>
        {lot.images?.[0] && <img src={lot.images[0]} alt={lot.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
        {tag && (
          <span className="mono" style={{ position: "absolute", top: 12, left: 12, background: "rgba(22,24,26,0.85)", color: "var(--gallery)", fontSize: 10, padding: "4px 10px", borderRadius: 20, letterSpacing: 0.6 }}>
            {tag}
          </span>
        )}
      </div>
      <p className="serif" style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.3 }}>{lot.title}</p>
      <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 2 }}>{lot.artist}</p>
      <p className="mono" style={{ fontSize: 14, color: "var(--green)", fontWeight: 600, marginTop: 8 }}>{fmtMoney(lot.current_bid)}</p>
    </Link>
  );
}

function Section({ eyebrow, title, children, empty }) {
  return (
    <section style={{ padding: "52px 0", borderBottom: "1px solid var(--line)" }}>
      <p className="mono" style={{ color: "var(--brass)", fontSize: 11, letterSpacing: 2.5, marginBottom: 8 }}>{eyebrow}</p>
      <h2 className="serif" style={{ fontSize: 26, fontWeight: 700, marginBottom: 28, letterSpacing: -0.3 }}>{title}</h2>
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
  const now = Date.now();
  const allActive = allItems.filter((l) => new Date(l.ends_at) > now);
  const catalogueCounts = Object.fromEntries(
    CATALOGUES.map((cat) => [cat, allActive.filter((l) => matchesCategory(l, cat)).length])
  );

  const items = allItems.filter((l) => matchesCategory(l, activeCategory));
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
    <div>
      <style>{`
        .lot-card:hover img { transform: scale(1.03); }
        .lot-card img { transition: transform .4s ease; }
        .catalogue-link { color: var(--muted); }
        .catalogue-link.active, .catalogue-link:hover { color: var(--ink); }
      `}</style>
      <main style={{ maxWidth: 1160, margin: "0 auto", padding: "0 24px 80px" }}>
        <header style={{ padding: "32px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="serif" style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.3 }}>The Atelier Auction</span>
          <Link href="/submit" className="mono" style={{ background: "var(--brass)", padding: "10px 18px", borderRadius: 3, fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
            + List Artwork
          </Link>
        </header>

        <section style={{ padding: "40px 0 36px", textAlign: "center" }}>
          <h1 className="serif" style={{ fontSize: 42, lineHeight: 1.08, fontWeight: 700, letterSpacing: -0.6, maxWidth: 720, margin: "0 auto" }}>
            Discover and bid on works from exciting artists
          </h1>
          <nav style={{ display: "flex", justifyContent: "center", gap: 28, marginTop: 26 }}>
            {CATALOGUES.map((cat) => {
              const href = cat === "All Art" ? "/" : `/?category=${encodeURIComponent(cat)}`;
              const count = cat === "All Art" ? allActive.length : catalogueCounts[cat];
              return (
                <Link key={cat} href={href} className={`catalogue-link${activeCategory === cat ? " active" : ""}`} style={{ fontSize: 15, fontWeight: 600 }}>
                  {cat === "All Art" ? "All works" : cat} <span className="mono" style={{ fontSize: 13, opacity: 0.7 }}>{count}</span>
                </Link>
              );
            })}
          </nav>
        </section>

        {allItems.length === 0 ? (
          <p style={{ padding: "60px 0", color: "var(--muted)", textAlign: "center" }}>No lots yet — be the first to list one.</p>
        ) : items.length === 0 ? (
          <p style={{ padding: "60px 0", color: "var(--muted)", textAlign: "center" }}>No pieces in this catalogue yet.</p>
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
                <LotCard key={artist} lot={lot} tag={`${count} bid${count === 1 ? "" : "s"}`}
