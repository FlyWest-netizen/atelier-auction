import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

// GET /api/lots — public catalog of certified lots
export async function GET() {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("lots")
    .select("*, profiles(display_name)")
    .eq("status", "certified")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/lots — create a lot after authentication has already run client-side
// (the images + verdict + report are sent together; the client already has
// the AI report from /api/authenticate before calling this)
export async function POST(req) {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const body = await req.json();
  const { data, error } = await supabase
    .from("lots")
    .insert({
      seller_id: user.id,
      title: body.title,
      artist: body.artist,
      medium: body.medium,
      edition_info: body.editionInfo || null,
      year_claimed: body.yearClaimed,
      description: body.description,
      images: body.images,
      starting_bid: body.startingBid,
      current_bid: body.startingBid,
      status: body.status,
      ai_report: body.aiReport,
      ends_at: body.endsAt,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
