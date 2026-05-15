import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: { token: string } }
) {
  const { token } = params;

  try {
    const supabase = createServiceClient();

    const { error } = await supabase
      .from("screens")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("player_token", token);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Heartbeat error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
