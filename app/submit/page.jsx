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

export default function SubmitPage() {
  const router = useRouter();
  const supabase = supabaseBrowser();

  const [form, setForm] = useState({
    title: "", artist: "", medium: "", editionInfo: "", yearClaimed: "",
    description: "", startingBid: "", duration: DURATIONS[1].ms,
  });
  const [images, setImages] = useState([]);
  const [stage, setStage] = useState("form"); // form | scanning | report
  const [report, setReport] = useState(null);
  const [err, setErr] = useState("");

  function set(key, value) { setForm((f) => ({ ...f, [key]: value })); }

  async function handleFiles(e) {
    const files = Array.from(e.target.files || []);
    const resized = await Promise.all(files.map((f) => resizeImage(f)));
    setImages((prev) => [...prev, ...resized].slice(0, 6));
  }

  async function runAuthentication() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login?next=/submit"); return; }

    if (!form.title || !form.artist || !form.medium || !form.yearClaimed || !form.startingBid) {
      setErr("Title, artist, medium, completion year, and starting bid are required.");
      return;
    }
    if (images.length < 2) {
      setErr("Add at least 2 photos — the full piece and the signature.");
      return;
    }
    setErr("");
    setStage("scanning");

    const res = await fetch("/api/authenticate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        images,
        meta: { artist: form.artist, medium: form.medium, editionInfo: form.editionInfo, yearClaimed: form.yearClaimed, description: form.description },
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
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 20 }}>
        <input type="file" accept="image/*" multiple onChange={handleFiles} />
        <div style={{ display: "flex", gap: 8 }}>
          {images.map((img, i) => <img key={i} src={img} alt="" style={{ width: 60, height: 60, objectFit: "cover" }} />)}
        </div>
        <input placeholder="Title" value={form.title} onChange={(e) => set("title", e.target.value)} />
        <input placeholder="Artist" value={form.artist} onChange={(e) => set("artist", e.target.value)} />
        <input placeholder="Medium" value={form.medium} onChange={(e) => set("medium", e.target.value)} />
        <input placeholder="Completion year" value={form.yearClaimed} onChange={(e) => set("yearClaimed", e.target.value)} />
        <input placeholder="Edition (blank if unique)" value={form.editionInfo} onChange={(e) => set("editionInfo", e.target.value)} />
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
