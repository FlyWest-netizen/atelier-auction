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
