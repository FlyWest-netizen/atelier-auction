"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

function fmtMoney(n) {
  return "$" + Number(n).toLocaleString("en-US");
}

export default function LotDetail() {
  const { id } = useParams();
  const router = useRouter();
  const supabase = supabaseBrowser();
  const [lot, setLot] = useState(null);
  const [amount, setAmount] = useState("");
  const [err, setErr] = useState("");

  async function load() {
    const { data } = await supabase.from("lots").select("*, profiles(display_name)").eq("id", id).single();
    setLot(data);
    if (data) setAmount(Number(data.current_bid) + Math.max(5, Math.round(data.current_bid * 0.05)));
  }

  useEffect(() => { load(); }, [id]);

  async function placeBid() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push(`/login?next=/lot/${id}`); return; }

    const res = await fetch(`/api/lots/${id}/bids`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ amount: Number(amount) }),
    });
    const result = await res.json();
    if (!res.ok) { setErr(result.error); return; }
    setErr("");
    load();
  }

  if (!lot) return <main style={{ maxWidth: 700, margin: "60px auto" }}>Loading…</main>;

  const closed = new Date(lot.ends_at) < new Date();

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "40px 20px 80px", display: "grid", gap: 40, gridTemplateColumns: "1fr 1fr" }}>
      <div>
        {lot.images?.[0] && <img src={lot.images[0]} alt={lot.title} style={{ width: "100%", borderRadius: 4 }} />}
      </div>
      <div>
        <p className="mono" style={{ color: "var(--brass)", fontSize: 12 }}>{lot.artist?.toUpperCase()}</p>
        <h1 className="serif" style={{ fontSize: 30 }}>{lot.title}</h1>
        <p style={{ color: "var(--muted)" }}>{lot.medium} · {lot.year_claimed}{lot.edition_info ? ` · Edition ${lot.edition_info}` : " · Unique"}</p>
        <p style={{ margin: "14px 0" }}>{lot.description}</p>

        <div style={{ border: "1px solid var(--line)", borderRadius: 4, padding: 18, background: "#fff" }}>
          <p className="mono" style={{ fontSize: 20, color: "var(--green)", fontWeight: 600 }}>{fmtMoney(lot.current_bid)}</p>
          {!closed ? (
            <>
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
                <button onClick={placeBid}>Place Bid</button>
              </div>
              {err && <p style={{ color: "var(--live)" }}>{err}</p>}
            </>
          ) : (
            <p>Auction closed.</p>
          )}
        </div>

        {lot.ai_report && (
          <div style={{ marginTop: 20, border: "1px solid var(--line)", borderRadius: 4, padding: 18, background: "#fff" }}>
            <p className="mono" style={{ fontSize: 11, color: "var(--green)" }}>AUTHENTICATION REPORT · {lot.ai_report.confidence}% CONFIDENCE</p>
            <p style={{ fontSize: 13.5, margin: "8px 0" }}>{lot.ai_report.summary}</p>
            <ul>
              {lot.ai_report.checks.map((c, i) => <li key={i}><strong>{c.label}</strong>: {c.note}</li>)}
            </ul>
          </div>
        )}
      </div>
    </main>
  );
}
