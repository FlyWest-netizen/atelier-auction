import Link from "next/link";
import { supabaseServer } from "@/lib/supabase-server";

function fmtMoney(n) {
  return "$" + Number(n).toLocaleString("en-US");
}

function Nav() {
  return (
    <header style={{ padding: "28px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span className="display" style={{ fontSize: 18 }}>The Atelier Auction</span>
      <nav style={{ display: "flex", alignItems: "center", gap: 28 }}>
        <Link href="/" style={{ fontSize: 13.5, color: "var(--muted)" }}>Marketplace</Link>
        <Link href="/submit" className="btn-pill">List a Work →</Link>
      </nav>
    </header>
  );
}

function ArtCard({ lot, tag }) {
  const report = lot.ai_report;
  return (
    <Link href={`/lot/${lot.id}`} className="artwork-hover" style={{ display: "block", borderRadius: 18 }}>
      <div style={{ aspectRatio: "4/5", background: "var(--beige)", position: "relative", borderRadius: 18, overflow: "hidden", marginBottom: 14 }}>
        {lot.images?.[0] && <img src={lot.images[0]} alt={lot.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
        {tag && (
          <span className="mono" style={{ position: "absolute", top: 14, left: 14, background: "rgba(255,255,255,0.85)", backdropFilter: "blur(6px)", color: "var(--ink)", fontSize: 10, padding: "5px 11px", borderRadius: 20, letterSpacing: 0.6 }}>
            {tag}
          </span>
        )}
      </div>
      <p className="eyebrow" style={{ marginBottom: 4 }}>{lot.medium}</p>
      <p className="display" style={{ fontSize: 18, lineHeight: 1.25 }}>{lot.title}</p>
      <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>{lot.artist}</p>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
        <span className="mono" style={{ fontSize: 15, fontWeight: 700 }}>{fmtMoney(lot.current_bid)}</span>
        {report && (
          <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "var(--verify)" }}>
            <span className="mono" style={{ fontWeight: 700 }}>{report.confidence}%</span> Verified
          </span>
        )}
      </div>
    </Link>
  );
}

function Section({ eyebrow, title, children, empty }) {
  return (
    <section style={{ padding: "70px 0", borderBottom: "1px solid var(--line)" }}>
      <p className="eyebrow" style={{ marginBottom: 10 }}>{eyebrow}</p>
      <h2 className="display" style={{ fontSize: 30, marginBottom: 36 }}>{title}</h2>
      {empty ? (
        <p style={{ color: "var(--muted)", fontSize: 14 }}>{empty}</p>
      ) : (
        <div style={{ display: "grid", gap: 36, gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))" }}>
          {children}
        </div>
      )}
    </section>
  );
}

function MetaverseEntrance() {
  const steps = [
    { n: "01", title: "Capture", body: "The full artwork and a close-up of the signature — the same two photos every listing already requires." },
    { n: "02", title: "Verify", body: "AI authentication reads the signature, medium, and condition, producing a confidence score in seconds." },
    { n: "03", title: "Enter the metaverse", body: "A verified digital record travels with the piece, ready for virtual galleries and future drops." },
  ];
  return (
    <section style={{ background: "var(--ink)", borderRadius: 28, padding: "72px 48px", margin: "12px 0 8px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 20% 20%, rgba(37,99,235,0.16), transparent 55%)" }} />
      <div style={{ position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--action)" }} />
          <p className="mono" style={{ fontSize: 11, letterSpacing: 3, color: "rgba(255,255,255,0.55)" }}>AI-NATIVE PROVENANCE</p>
        </div>
        <h2 className="display" style={{ fontSize: 38, color: "#fff", maxWidth: 640, marginBottom: 14 }}>
          Where art enters the metaverse
        </h2>
        <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 15, maxWidth: 480, marginBottom: 56 }}>
          Every physical work is captured, authenticated, and given a persistent verified identity — ready to move between gallery walls and virtual space.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 32 }}>
          {steps.map((s, i) => (
            <div key={s.n} style={{ position: "relative", paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.14)" }}>
              <span className="mono" style={{ fontSize: 13, color: i === 2 ? "var(--verify)" : "rgba(255,255,255,0.35)" }}>{s.n}</span>
              <p className="display" style={{ fontSize: 18, color: "#fff", margin: "10px 0 8px" }}>{s.title}</p>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.6 }}>{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default async function Home() {
  const supabase = supabaseServer();

  const { data: lots } = await supabase
    .from("lots")
    .select("*, profiles(display_name)")
    .eq("status", "certified")
    .order("created_at", { ascending: false });

  const { data: bids } = await supabase.from("bids").select("lot_id");

  const items = lots || [];
  const now = Date.now();
  const active = items.filter((l) => new Date(l.ends_at) > now);
  const soldLots = items.filter((l) => new Date(l.ends_at) <= now && Number(l.current_bid) > Number(l.starting_bid));

  const curated = [...active].sort((a, b) => Number(b.current_bid) - Number(a.current_bid)).slice(0, 4);
  const liveAuctions = active.slice(0, 8);
  const emerging = active.slice(0, 4);
  const recentlySold = [...soldLots].sort((a, b) => new Date(b.ends_at) - new Date(a.ends_at)).slice(0, 4);

  const bidCounts = {};
  (bids || []).forEach((b) => { bidCounts[b.lot_id] = (bidCounts[b.lot_id] || 0) + 1; });
  const artistTotals = {};
  items.forEach((lot) => {
    const count = bidCounts[lot.id] || 0;
    if (count > 0) artistTotals[lot.artist] = (artistTotals[lot.artist] || 0) + count;
  });
  const trending = Object.entries(artistTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([artist, count]) => ({ artist, count, lot: items.find((l) => l.artist === artist && bidCounts[l.id] > 0) }));

  const heroLot = curated[0] || active[0];

  return (
    <div>
      <main style={{ maxWidth: 1240, margin: "0 auto", padding: "0 28px 100px" }}>
        <Nav />

        {heroLot ? (
          <Link href={`/lot/${heroLot.id}`} style={{ display: "block", position: "relative", borderRadius: 28, overflow: "hidden", minHeight: "78vh", background: "var(--ink)" }}>
            {heroLot.images?.[0] && (
              <img src={heroLot.images[0]} alt={heroLot.title} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
            )}
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(0deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.05) 45%, rgba(0,0,0,0.15) 100%)" }} />
            <div style={{ position: "relative", height: "78vh", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "56px" }}>
              <h1 className="display" style={{ fontSize: 54, lineHeight: 1.02, color: "#fff", maxWidth: 620 }}>
                Discover Verified<br />Contemporary Art.
              </h1>
              <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 16, marginTop: 16, maxWidth: 440 }}>
                Every work is AI-authenticated before entering the marketplace.
              </p>
            </div>
          </Link>
        ) : (
          <section style={{ padding: "80px 0 40px", textAlign: "center" }}>
            <h1 className="display" style={{ fontSize: 48 }}>Discover Verified Contemporary Art.</h1>
            <p style={{ color: "var(--muted)", fontSize: 16, marginTop: 14 }}>Every work is AI-authenticated before entering the marketplace.</p>
          </section>
        )}

        <MetaverseEntrance />

        {items.length === 0 ? (
          <p style={{ padding: "80px 0", color: "var(--muted)", textAlign: "center" }}>No works listed yet — be the first.</p>
        ) : (
          <>
            <Section eyebrow="GETTING THE MOST BIDS" title="Trending" empty={trending.length === 0 ? "No bidding activity yet." : null}>
              {trending.map(({ artist, count, lot }) => lot && <ArtCard key={artist} lot={lot} tag={`${count} bid${count === 1 ? "" : "s"}`} />)}
            </Section>

            <Section eyebrow="OPEN FOR BIDDING" title="Live Auctions" empty={liveAuctions.length === 0 ? "No live auctions right now." : null}>
              {liveAuctions.map((lot) => <ArtCard key={lot.id} lot={lot} />)}
            </Section>

            <Section eyebrow="TOP VALUE" title="Curated Selection" empty={curated.length === 0 ? "Nothing curated yet." : null}>
              {curated.map((lot) => <ArtCard key={lot.id} lot={lot} tag="Curated" />)}
            </Section>

            <Section eyebrow="JUST LISTED" title="Emerging Artists" empty={emerging.length === 0 ? "Nothing new right now." : null}>
              {emerging.map((lot) => <ArtCard key={lot.id} lot={lot} tag="New" />)}
            </Section>

            <Section eyebrow="CLOSED WITH WINNING BIDS" title="Recently Sold" empty={recentlySold.length === 0 ? "No completed sales yet." : null}>
              {recentlySold.map((lot) => <ArtCard key={lot.id} lot={lot} tag="Sold" />)}
            </Section>
          </>
        )}
      </main>
    </div>
  );
}
