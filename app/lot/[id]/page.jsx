"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

function fmtMoney(n) {
  return "$" + Number(n).toLocaleString("en-US");
}

function confidenceBand(score) {
  if (score >= 75) return { label: "High Confidence", color: "var(--green)", bg: "var(--green-bg)" };
  if (score >= 45) return { label: "Moderate Confidence", color: "var(--flag)", bg: "var(--flag-bg)" };
  return { label: "Low Confidence", color: "var(--live)", bg: "#f6e3e0" };
}

function Card({ children, style }) {
  return (
    <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 8, padding: 22, ...style }}>
      {children}
    </div>
  );
}

function CheckRow({ label, status }) {
  const icon = status === "pass" ? "✓" : status === "concern" ? "!" : "•";
  const color = status === "pass" ? "var(--green)" : status === "concern" ? "var(--flag)" : "var(--muted)";
  const text = status === "pass" ? "Verified" : status === "concern" ? "Concern" : "Unclear";
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "1px solid var(--line)" }}>
      <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5 }}>
        <span style={{ color, fontWeight: 700, width: 16, textAlign: "center" }}>{icon}</span>
        {label}
      </span>
      <span className="mono" style={{ fontSize: 12, color }}>{text}</span>
    </div>
  );
}

function AuthenticationCard({ report }) {
  const [expanded, setExpanded] = useState(false);
  if (!report) return null;
  const band = confidenceBand(report.confidence);

  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <span className="mono" style={{ fontSize: 11, letterSpacing: 1.5, color: "var(--muted)" }}>✓ VERIFIED BY AI</span>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
          <span style={{ fontSize: 13, color: "var(--muted)" }}>Overall Confidence</span>
          <span className="mono" style={{ fontSize: 22, fontWeight: 700, color: band.color }}>{report.confidence}%</span>
        </div>
        <div style={{ height: 6, borderRadius: 4, background: "var(--line)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${report.confidence}%`, background: band.color, borderRadius: 4 }} />
        </div>
        <p className="mono" style={{ fontSize: 11, color: band.color, marginTop: 6 }}>{band.label}</p>
      </div>

      <div>
        {report.checks?.map((c, i) => <CheckRow key={i} label={c.label} status={c.status} />)}
      </div>

      <button
        onClick={() => setExpanded((v) => !v)}
        style={{ marginTop: 14, background: "none", border: "none", color: "var(--brass)", fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0 }}
      >
        {expanded ? "Hide full report" : "View Full Authentication Report"}
      </button>

      {expanded && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
          <p style={{ fontSize: 13.5, color: "#3a3a36", lineHeight: 1.6, marginBottom: 10 }}>{report.summary}</p>
          {report.checks?.map((c, i) => (
            <p key={i} style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 6 }}>
              <strong style={{ color: "var(--ink)" }}>{c.label}:</strong> {c.note}
            </p>
          ))}
        </div>
      )}
    </Card>
  );
}

export default function LotDetail() {
  const { id } = useParams();
  const router = useRouter();
  const supabase = supabaseBrowser();
  const [lot, setLot] = useState(null);
  const [amount, setAmount] = useState("");
  const [err, setErr] = useState("");
  const [tab, setTab] = useState("gallery");

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
  const coverImage = lot.images?.[0];
  const signatureImage = lot.images?.[1];
  const otherImages = (lot.images || []).slice(2);
  const report = lot.ai_report;

  return (
    <main style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 20px 80px" }}>
      <div style={{ display: "grid", gap: 32, gridTemplateColumns: "1fr 1fr" }}>
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <button onClick={() => setTab("gallery")} style={{ background: "none", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", color: tab === "gallery" ? "var(--ink)" : "var(--muted)", borderBottom: tab === "gallery" ? "2px solid var(--brass)" : "2px solid transparent", paddingBottom: 6 }}>
              Gallery
            </button>
            <button onClick={() => setTab("verification")} style={{ background: "none", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", color: tab === "verification" ? "var(--ink)" : "var(--muted)", borderBottom: tab === "verification" ? "2px solid var(--brass)" : "2px solid transparent", paddingBottom: 6 }}>
              Verification Images
            </button>
          </div>

          {tab === "gallery" ? (
            <>
              {coverImage && <img src={coverImage} alt={lot.title} style={{ width: "100%", borderRadius: 8 }} />}
              {otherImages.length > 0 && (
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  {otherImages.map((img, i) => (
                    <img key={i} src={img} alt="" style={{ width: 70, height: 70, objectFit: "cover", borderRadius: 4 }} />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div>
              {signatureImage ? (
                <>
                  <p style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 8 }}>Signature close-up used for authentication</p>
                  <img src={signatureImage} alt="Signature" style={{ width: "100%", borderRadius: 8 }} />
                </>
              ) : (
                <p style={{ color: "var(--muted)" }}>No verification image on file.</p>
              )}
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Card>
            <p className="mono" style={{ fontSize: 12, color: "var(--brass)", letterSpacing: 1.5 }}>{lot.artist?.toUpperCase()}</p>
            <h1 className="serif" style={{ fontSize: 28, fontWeight: 600, margin: "6px 0" }}>{lot.title}</h1>
            <p style={{ color: "var(--muted)", fontSize: 13.5 }}>
              {lot.medium} · {lot.year_claimed}{lot.edition_info ? ` · Edition ${lot.edition_info}` : " · Unique"}
              {lot.dimensions ? ` · ${lot.dimensions}` : ""}
            </p>
            <p style={{ marginTop: 12, color: "#3a3a36", fontSize: 14, lineHeight: 1.6 }}>{lot.description}</p>
            <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 10 }}>Listed by {lot.sellerName || lot.seller_id}</p>
          </Card>

          <Card>
            <p className="mono" style={{ fontSize: 20, color: "var(--green)", fontWeight: 600 }}>{fmtMoney(lot.current_bid)}</p>
            {!closed ? (
              <>
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ flex: 1 }} />
                  <button onClick={placeBid}>Place Bid</button>
                </div>
                {err && <p style={{ color: "var(--live)" }}>{err}</p>}
              </>
            ) : (
              <p>Auction closed.</p>
            )}
          </Card>

          <AuthenticationCard report={report} />

          {report?.artistSummary && (
            <Card>
              <p className="mono" style={{ fontSize: 11, letterSpacing: 1.5, color: "var(--muted)", marginBottom: 8 }}>ABOUT THE ARTIST</p>
              <p style={{ fontSize: 13.5, lineHeight: 1.6, color: "#3a3a36" }}>{report.artistSummary}</p>
            </Card>
          )}

          {report?.artworkInsight && (
            <Card>
              <p className="mono" style={{ fontSize: 11, letterSpacing: 1.5, color: "var(--muted)", marginBottom: 8 }}>AI ARTWORK INSIGHT</p>
              <p style={{ fontSize: 13.5, lineHeight: 1.6, color: "#3a3a36" }}>{report.artworkInsight}</p>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}
