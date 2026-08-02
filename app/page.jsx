import Link from "next/link";
import { supabaseServer } from "@/lib/supabase-server";

function fmtMoney(n) {
  return "$" + Number(n).toLocaleString("en-US");
}

const PARTICLES = Array.from({ length: 18 }).map((_, i) => ({
  top: (i * 37) % 100,
  left: (i * 53) % 100,
  size: 2 + (i % 3),
  dur: 4 + (i % 5),
  delay: (i * 0.4) % 4,
}));

function EntranceHero({ heroImage }) {
  return (
    <section style={{ position: "relative", height: "100vh", minHeight: 640, borderRadius: 28, overflow: "hidden", background: "radial-gradient(circle at 50% 40%, #170B34 0%, #0A0620 55%, #030109 100%)" }}>
      <style>{`
        @keyframes gridMove { from { background-position: 0 0; } to { background-position: 0 60px; } }
        @keyframes pulseGlow { 0%, 100% { opacity: 0.55; transform: scale(1); } 50% { opacity: 0.9; transform: scale(1.08); } }
        @keyframes spinSlow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes spinSlowRev { from { transform: rotate(360deg); } to { transform: rotate(0deg); } }
        @keyframes scanLine { 0% { transform: translateY(-100%); opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { transform: translateY(100%); opacity: 0; } }
        @keyframes floatDot { 0%, 100% { transform: translateY(0); opacity: 0.25; } 50% { transform: translateY(-16px); opacity: 0.9; } }
        @keyframes bounceChevron { 0%, 100% { transform: translateY(0); opacity: 0.4; } 50% { transform: translateY(8px); opacity: 0.9; } }
        .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
      `}</style>
      <h1 className="sr-only">The Atelier Auction — discover AI-authenticated contemporary art</h1>

      <div style={{
        position: "absolute", left: 0, right: 0, bottom: 0, height: "58%",
        backgroundImage: "linear-gradient(rgba(94,133,255,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(94,133,255,0.35) 1px, transparent 1px)",
        backgroundSize: "56px 56px",
        transform: "perspective(500px) rotateX(62deg)",
        transformOrigin: "bottom",
        animation: "gridMove 3.5s linear infinite",
        maskImage: "linear-gradient(to top, black 20%, transparent 95%)",
        WebkitMaskImage: "linear-gradient(to top, black 20%, transparent 95%)",
      }} />

      <div style={{
        position: "absolute", top: "38%", left: "50%", width: 520, height: 520, marginLeft: -260, marginTop: -260,
        borderRadius: "50%", background: "radial-gradient(circle, rgba(90,130,255,0.55), transparent 65%)",
        filter: "blur(50px)", animation: "pulseGlow 4.5s ease-in-out infinite",
      }} />

      <div style={{
        position: "absolute", top: "50%", left: "50%", width: 620, height: 620, marginLeft: -310, marginTop: -310,
        borderRadius: "50%", border: "1px solid rgba(255,255,255,0.12)", animation: "spinSlow 26s linear infinite",
      }} />
      <div style={{
        position: "absolute", top: "50%", left: "50%", width: 460, height: 460, marginLeft: -230, marginTop: -230,
        borderRadius: "50%", border: "1px dashed rgba(94,133,255,0.28)", animation: "spinSlowRev 18s linear infinite",
      }} />

      {heroImage && (
        <div style={{
          position: "absolute", top: "50%", left: "50%", width: 300, height: 380, marginLeft: -150, marginTop: -210,
          borderRadius: 12, overflow: "hidden",
          transform: "perspective(1000px) rotateY(-9deg) rotateX(3deg)",
          boxShadow: "0 0 0 1px rgba(94,133,255,0.4), 0 40px 100px -20px rgba(37,99,235,0.55)",
        }}>
          <img src={heroImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.82, filter: "saturate(1.05) contrast(1.05)" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(10,6,32,0.15), rgba(10,6,32,0.5))" }} />
          <div style={{
            position: "absolute", left: 0, right: 0, height: 60,
            background: "linear-gradient(180deg, transparent, rgba(148,180,255,0.55), transparent)",
            animation: "scanLine 3.2s ease-in-out infinite",
          }} />
        </div>
      )}

      {PARTICLES.map((p, i) => (
        <div key={i} aria-hidden="true" style={{
          position: "absolute", top: `${p.top}%`, left: `${p.left}%`,
          width: p.size, height: p.size, borderRadius: "50%",
          background: "#BFD1FF", animation: `floatDot ${p.dur}s ease-in-out infinite`, animationDelay: `${p.delay}s`,
        }} />
      ))}

      <div aria-hidden="true" style={{ position: "absolute", left: "50%", bottom: 28, marginLeft: -8, width: 16, height: 16, animation: "bounceChevron 2s ease-in-out infinite" }}>
        <svg viewBox="0 0 16 16" width="16" height="16"><path d="M2 5 L8 11 L14 5" stroke="rgba(255,255,255,0.7)" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </div>
      <span className="sr-only">Scroll to explore the marketplace</span>
    </section>
  );
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
        <EntranceHero heroImage={heroLot?.images?.[0]} />

        <Nav />

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
