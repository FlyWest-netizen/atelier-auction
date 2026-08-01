import { NextResponse } from "next/server";
import { authenticateArtwork } from "@/lib/authenticate";

export async function POST(req) {
  try {
    const { images, meta } = await req.json();

    if (!images || images.length < 2) {
      return NextResponse.json(
        { error: "At least 2 photos are required: the full piece and the signature." },
        { status: 400 }
      );
    }

    const result = await authenticateArtwork(images, meta);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Authentication error:", err);
    return NextResponse.json({ error: "Authentication check failed. Try again." }, { status: 500 });
  }
}
