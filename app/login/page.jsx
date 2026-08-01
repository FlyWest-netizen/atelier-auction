"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

function LoginForm() {
  const supabase = supabaseBrowser();
  const params = useSearchParams();
  const next = params.get("next") || "/";
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  async function sendLink() {
    await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}${next}` },
    });
    setSent(true);
  }

  return (
    <main style={{ maxWidth: 400, margin: "80px auto", padding: "0 20px" }}>
      <h1 className="serif" style={{ fontSize: 26 }}>Sign in</h1>
      {sent ? (
        <p style={{ marginTop: 12 }}>Check your email for a sign-in link.</p>
      ) : (
        <>
          <input placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: "100%", marginTop: 16 }} />
          <button onClick={sendLink} style={{ marginTop: 12 }}>Send magic link</button>
        </>
      )}
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main style={{ maxWidth: 400, margin: "80px auto" }}>Loading…</main>}>
      <LoginForm />
    </Suspense>
  );
}
