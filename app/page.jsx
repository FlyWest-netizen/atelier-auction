import Link from "next/link";
import { supabaseServer } from "@/lib/supabase-server";

function fmtMoney(n) {
  return "$" + Number(n).toLocaleString("en-US");
}

export default async function Home() {
  const supabase = supabaseServer();
  const { data: lots } = await supabase
    .from("lots")
    .select("*, profiles(display_name)")
    .eq("status", "certified")
    .order("created_at", { ascending: false });

  const items = lots || [];

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
          {items.length} LOT{items.length === 1 ? "" : "S"} · EVERY PIECE AUTHENTICATED BEFORE LISTING
        </p>
        <h1 className="serif" style={{ fontSize: 40, lineHeight: 1.1, maxWidth: 620, fontWeight: 600 }}>
          Where collectors meet the gavel.
        </h1>
      </section>

      {items.length === 0 ? (
        <p style={{ padding: "60px 0", color: "var(--muted)" }}>No lots yet — be the first to list one.</p>
      ) : (
        <div className="grid" style={{ display: "grid", gap: 24, gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", padding: "36px 0" }}>
          {items.map((lot) => (
            <Link key={lot.id} href={`/lot/${lot.id}`} style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ aspectRatio: "4/3", background: "var(--parchment)" }}>
                {lot.images?.[0] && <img src={lot.images[0]} alt={lot.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
              </div>
              <div style={{ padding: 14 }}>
                <p className="serif" style={{ fontSize: 16, fontWeight: 600 }}>{lot.title}</p>
                <p style={{ fontSize: 12.5, color: "var(--muted)" }}>{lot.artist}</p>
                <p className="mono" style={{ fontSize: 15, color: "var(--green)", fontWeight: 600, marginTop: 6 }}>{fmtMoney(lot.current_bid)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
