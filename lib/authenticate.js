// Runs server-side only (called from app/api/authenticate/route.js).
// The API key never reaches the browser.

export async function authenticateArtwork(images, meta) {
  const imageContent = images.map((dataUrl) => {
    const [header, base64] = dataUrl.split(",");
    const media_type = header.match(/data:(.*);base64/)[1];
    return { type: "image", source: { type: "base64", media_type, data: base64 } };
  });

  const prompt = `You are a light-touch triage screener embedded in an art auction platform's listing flow. Your job is to catch clear, visible red flags — not to demand a complete forensic photo set. Most submissions should pass.

Work details:
Artist (as claimed by seller): ${meta.artist}
Medium: ${meta.medium}
Edition: ${meta.editionInfo || "not specified (unique piece)"}
Completion year (as claimed by seller): ${meta.yearClaimed}
Seller notes: ${meta.description || "none provided"}

BASELINE REQUIREMENT (this is all that's needed to pass): a clear photo of the full piece, and a clear, legible photo of the signature. If both are present and nothing about them visibly contradicts the claimed artist, medium, or year, the verdict should be "certified" — do not withhold certification just because other extras (a date close-up, edition/chop marks, verso shots, a certificate) weren't included. Those are bonus context, not requirements.

Only use "flagged" when something you can actually SEE is concerning, for example: the signature looks printed/stamped rather than hand-applied where a hand signature is implied, the signature style looks inconsistent with itself, the medium/surface visibly contradicts what's claimed, or a visible date/inscription looks obviously altered. Ordinary photo limitations are NOT grounds for flagging.

Use "insufficient_photos" only if the full piece or the signature itself is missing, unreadable, or too blurry/cropped to assess at all.

Respond with ONLY valid JSON, no markdown fences, no preamble, in exactly this shape:
{
  "verdict": "certified" | "flagged" | "insufficient_photos",
  "confidence": <integer 0-100>,
  "summary": "<2-3 plain-English sentences for the seller, non-accusatory>",
  "checks": [
    {"label": "<short check name like 'Signature' or 'Full piece'>", "status": "pass" | "concern" | "unclear", "note": "<one sentence>"}
  ]
}
Include 3-5 checks. Always include "Signature" and a check for overall piece/medium consistency. Only add checks for date, edition marks, or documentation if those were actually photographed. Never assert a work is definitely a forgery; reserve "flagged" for genuinely visible inconsistencies and route those to human expert review.`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      messages: [{ role: "user", content: [...imageContent, { type: "text", text: prompt }] }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Anthropic API error: ${response.status} ${errText}`);
  }

  const data = await response.json();
  const text = (data.content || []).map((b) => b.text || "").join("");
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}
