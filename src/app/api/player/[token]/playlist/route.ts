import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: { token: string } }
) {
  const { token } = params;

  try {
    const supabase = createServiceClient();

    // Find the screen by token
    const { data: screen, error: screenError } = await supabase
      .from("screens")
      .select("id, location_id, name")
      .eq("player_token", token)
      .single();

    if (screenError || !screen) {
      return NextResponse.json(
        { error: "Screen not found" },
        { status: 404 }
      );
    }

    // Find the active playlist assigned to this screen
    const { data: screenPlaylist, error: spError } = await supabase
      .from("screen_playlists")
      .select("playlist_id")
      .eq("screen_id", screen.id)
      .single();

    if (spError || !screenPlaylist) {
      return NextResponse.json(
        { items: [], screen: { id: screen.id, name: screen.name } },
        { status: 200 }
      );
    }

    // Get playlist items with ad data
    const { data: items, error: itemsError } = await supabase
      .from("playlist_items")
      .select(
        `
        id,
        ad_id,
        order_index,
        weight,
        ads (
          id,
          title,
          media_url,
          media_type,
          duration_seconds,
          status,
          start_date,
          end_date
        )
      `
      )
      .eq("playlist_id", screenPlaylist.playlist_id)
      .order("order_index", { ascending: true });

    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    const today = new Date().toISOString().split("T")[0];

    type AdRow = {
      id: string;
      title: string;
      media_url: string;
      media_type: string;
      duration_seconds: number;
      status: string;
      start_date: string | null;
      end_date: string | null;
    };

    const activeItems = (items || [])
      .map((item) => {
        const raw = item.ads;
        const ad: AdRow | null = Array.isArray(raw) ? (raw[0] ?? null) : (raw as AdRow | null);
        return { ...item, ad };
      })
      .filter(({ ad }) => {
        if (!ad) return false;
        if (ad.status !== "active") return false;
        if (ad.start_date && ad.start_date > today) return false;
        if (ad.end_date && ad.end_date < today) return false;
        return true;
      })
      .map(({ id, ad }) => ({
        id,
        ad_id: ad!.id,
        title: ad!.title,
        media_url: ad!.media_url,
        media_type: ad!.media_type,
        duration_seconds: ad!.duration_seconds,
      }));

    return NextResponse.json({
      items: activeItems,
      screen: { id: screen.id, name: screen.name },
    });
  } catch (err) {
    console.error("Playlist route error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
