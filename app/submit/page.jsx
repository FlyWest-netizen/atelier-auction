"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

function resizeImage(file, maxW = 1200, quality = 0.87) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const DURATIONS = [
  { label: "24 hours", ms: 24 * 60 * 60 * 1000 },
  { label: "3 days", ms: 3 * 24 * 60 * 60 * 1000 },
  { label: "7 days", ms: 7 * 24 * 60 * 60 * 1000 },
];

function ImageSlot({ label, required, image, onChange, onRemove }) {
  return (
    <div>
      <label style={labelStyle}>{label}{required ? " (required)" : " (optional)"}</label>
      {image ? (
        <div style={{ position: "relative", width: 120, height: 120 }}>
          <img src={image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 4 }} />
          <button type="button" onClick={onRemove} style={{ position: "absolute", top: -6, right: -6, background: "var(--ink)", color: "#fff", borderRadius: "50%", width: 22, height: 22, border: "none" }}>×</button>
        </div>
      ) : (
        <label style={{ width: 120, height: 120, border: "1.5px dashed var(--line)", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", background: "#fff", fontSize: 24, color: "#b3ab97" }}>
          +
          <input type="file" accept="image/*" onChange={onChange} style={{ display: "none" }} />
        </label>
      )}
    </div>
  );
}

export default function SubmitPage() {
  const router = useRouter();
  const supabase = supabaseBrowser();

  const [form, setForm] = useState({
    title: "", artist: "", medium: "", editionInfo: "", yearClaimed: "",
    dimensions: "", description: "", startingBid: "", duration: DURATIONS[1].ms,
  });
  const [fullImage, setFullImage] = useState(null);
  const [signatureImage, setSignatureImage] = useState(null);
  const [extraImages, setExtraImages] = useState([]);
  const [stage, setStage] = useState("form");
  const [report, setReport] = useState(null);
  const [err, setErr] = useState("");

  function set(key, value) { setForm((f) => ({ ...f, [key]: value })); }

  function handleSingle(setter) {
    return async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setter(await resizeImage(file));
    };
  }

  async function handleExtras(e) {
    const files = Array.from(e.target.files || []);
    const resized = await Promise.all(files.map((f) => resizeImage(f)));
    setExtraImages((prev) => [...prev, ...resized].slice(0, 4));
  }

  async function runAuthentication() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login?next=/submit"); return; }

    if (!form.title || !form.artist || !form.medium || !form.yearClaimed || !form.startingBid) {
      setErr("Title, artist, medium, completion year, and starting bid are required.");
      return;
    }
    if (!fullImage || !signatureImage) {
      setErr("Both the full artwork photo and the signature close-up are required.");
      return;
    }
    setErr("");
    setStage("scanning");

    const images = [fullImage, signatureImage, ...extraImages];

    const res = await fetch("/api/authenticate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        images,
        meta: { artist: form.artist, medium: form.medium, editionInfo: form.editionInfo, yearClaimed: form.yearClaimed, dimensions: form.dimensions, description: form.description },
      }),
    });

    if (!res.ok) {
      setErr("The authenticator couldn't complete — try again in a moment.");
      setStage("form");
      return;
    }

    const result = await res.json();
    setReport(result);
    setStage("report");
  }

  async function confirmListing() {
    const images = [fullImage, signatureImage, ...extraImages];
    const res = await fetch("/api/lots", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...form,
        startingBid: Number(form.startingBid),
        images,
        status: report.verdict,
        aiReport: report,
        endsAt: new Date(Date.now() + form.duration).toISOString(),
      }),
    });
    const lot = await res.json();
    router.push(report.verdict === "certified" ? `/lot/${lot.id}` : "/");
  }

  if (stage === "scanning") {
    return <main style={{ maxWidth: 560, margin: "80px auto", textAlign: "center" }}>
      <p className="mono">Examining signature, date, and edition marks…</p>
    </main>;
  }

  if (stage === "report" && report) {
    return (
      <main style={{ maxWidth: 560, margin: "60px auto", padding: "0 20px" }}>
        <h1 className="serif" style={{ fontSize: 26 }}>
          {report.verdict === "certified" ? "Passed screening" : report.verdict === "insufficient_photos" ? "Needs better photos" : "Flagged for review"}
        </h1>
        <p style={{ margin: "12px 0" }}>{report.summary}</p>
        <ul>
          {report.checks.map((c, i) => <li key={i}><strong>{c.label}</strong> ({c.status}): {c.note}</li>)}
        </ul>
        {report.verdict === "insufficient_photos" ? (
          <button onClick={() => setStage("form")}>Add better photos</button>
        ) : (
          <button onClick={confirmListing}>{report.verdict === "certified" ? "Go live for bidding" : "Send to human review"}</button>
        )}
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: "40px 20px 80px" }}>
      <h1 className="serif" style={{ fontSize: 30 }}>List a piece</h1>
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 20 }}>
        <div>
          <p style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 10 }}>The full artwork will always be the cover photo shown across the site. The signature photo is only ever shown inside the Verification tab.</p>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <ImageSlot label="Full artwork" required image={fullImage} onChange={handleSingle(setFullImage)} onRemove={() => setFullImage(null)} />
            <ImageSlot label="Signature close-up" required image={signatureImage} onChange={handleSingle(setSignatureImage)} onRemove={() => setSignatureImage(null)} />
          </div>
        </div>

        <div>
          <label style={labelStyle}>Optional extra photos — back, certificate, frame, texture ({extraImages.length}/4)</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {extraImages.map((img, i) => (
              <div key={i} style={{ position: "relative", width: 76, height: 76 }}>
                <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 4 }} />
                <button type="button" onClick={() => setExtraImages((p) => p.filter((_, idx) => idx !== i))} style={{ position: "absolute", top: -6, right: -6, background: "var(--ink)", color: "#fff", borderRadius: "50%", width: 20, height: 20, border: "none" }}>×</button>
              </div>
            ))}
            {extraImages.length < 4 && (
              <label style={{ width: 76, height: 76, border: "1.5px dashed var(--line)", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", background: "#fff" }}>
                +
                <input type="file" accept="image/*" multiple onChange={handleExtras} style={{ display: "none" }} />
              </label>
            )}
          </div>
        </div>

        <input placeholder="Title" value={form.title} onChange={(e) => set("title", e.target.value)} />
        <input placeholder="Artist" value={form.artist} onChange={(e) => set("artist", e.target.value)} />
        <input placeholder="Medium" value={form.medium} onChange={(e) => set("medium", e.target.value)} />
        <input placeholder="Completion year" value={form.yearClaimed} onChange={(e) => set("yearClaimed", e.target.value)} />
        <input placeholder="Edition (blank if unique)" value={form.editionInfo} onChange={(e) => set("editionInfo", e.target.value)} />
        <input placeholder="Dimensions (optional, e.g. 24 x 36 in)" value={form.dimensions} onChange={(e) => set("dimensions", e.target.value)} />
        <textarea placeholder="Description" value={form.description} onChange={(e) => set("description", e.target.value)} />
        <input type="number" placeholder="Starting bid (USD)" value={form.startingBid} onChange={(e) => set("startingBid", e.target.value)} />
        <select value={form.duration} onChange={(e) => set("duration", Number(e.target.value))}>
          {DURATIONS.map((d) => <option key={d.ms} value={d.ms}>{d.label}</option>)}
        </select>
        {err && <p style={{ color: "var(--live)" }}>{err}</p>}
        <button onClick={runAuthentication}>Authenticate & Continue</button>
      </div>
    </main>
  );
}

const labelStyle = { display: "block", fontSize: 11.5, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 };
