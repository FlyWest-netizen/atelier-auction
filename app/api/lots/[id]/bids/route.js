import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function POST(req, { params }) {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { amount } = await req.json();
  const lotId = params.id;

  const { data: lot, error: lotErr } = await supabase
    .from("lots")
    .select("current_bid, status, ends_at")
    .eq("id", lotId)
    .single();

  if (lotErr || !lot) return NextResponse.json({ error: "Lot not found." }, { status: 404 });
  if (lot.status !== "certified") return NextResponse.json({ error: "This lot isn't open for bidding." }, { status: 400 });
  if (new Date(lot.ends_at) < new Date()) return NextResponse.json({ error: "This auction has closed." }, { status: 400 });

  const minBid = Number(lot.current_bid) + Math.max(5, Math.round(lot.current_bid * 0.05));
  if (amount < minBid) {
    return NextResponse.json({ error: `Bid at least $${minBid}.` }, { status: 400 });
  }

  const { error: bidErr } = await supabase.from("bids").insert({ lot_id: lotId, bidder_id: user.id, amount });
  if (bidErr) return NextResponse.json({ error: bidErr.message }, { status: 500 });

  const { error: updateErr } = await supabase.from("lots").update({ current_bid: amount }).eq("id", lotId);
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, currentBid: amount });
}
