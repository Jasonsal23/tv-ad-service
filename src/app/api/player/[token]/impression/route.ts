import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";

const impressionSchema = z.object({
  ad_id: z.string().uuid(),
  duration_played_seconds: z.number().int().min(0).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: { token: string } }
) {
  const { token } = params;

  try {
    const body = await request.json();
    const { ad_id, duration_played_seconds } = impressionSchema.parse(body);

    const supabase = createServiceClient();

    // Find screen by token
    const { data: screen, error: screenError } = await supabase
      .from("screens")
      .select("id")
      .eq("player_token", token)
      .single();

    if (screenError || !screen) {
      return NextResponse.json({ error: "Screen not found" }, { status: 404 });
    }

    const { error } = await supabase.from("impressions").insert({
      ad_id,
      screen_id: screen.id,
      duration_played_seconds: duration_played_seconds ?? null,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    console.error("Impression error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
