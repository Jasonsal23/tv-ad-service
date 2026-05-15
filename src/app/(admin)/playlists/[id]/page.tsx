import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PlaylistEditor } from "./playlist-editor";

export const dynamic = "force-dynamic";

async function getPlaylist(id: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: playlist } = await supabase
    .from("playlists")
    .select("*")
    .eq("id", id)
    .single();

  if (!playlist) return null;

  // Get items with ad data, ordered
  const { data: items } = await supabase
    .from("playlist_items")
    .select(`
      id,
      order_index,
      weight,
      ad:ads(
        id,
        title,
        media_url,
        media_type,
        duration_seconds,
        status,
        advertiser:advertisers(business_name)
      )
    `)
    .eq("playlist_id", id)
    .order("order_index", { ascending: true });

  // Get all active ads for this location (to add to playlist)
  const { data: location } = await supabase
    .from("locations")
    .select("id")
    .eq("owner_user_id", user.id)
    .single();

  const { data: availableAds } = await supabase
    .from("ads")
    .select(`
      id, title, media_type, duration_seconds, status,
      advertiser:advertisers(business_name)
    `)
    .eq("location_id", location?.id ?? "")
    .in("status", ["active", "draft", "paused"])
    .order("title");

  const normalizedItems = (items ?? []).map((item) => ({
    ...item,
    ad: Array.isArray(item.ad) ? (item.ad[0] ?? null) : item.ad,
  }));

  const normalizedAds = (availableAds ?? []).map((ad) => ({
    ...ad,
    advertiser: Array.isArray(ad.advertiser) ? (ad.advertiser[0] ?? null) : ad.advertiser,
  }));

  return {
    playlist,
    items: normalizedItems,
    availableAds: normalizedAds,
  };
}

export default async function PlaylistDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const data = await getPlaylist(params.id);
  if (!data) notFound();

  return (
    <PlaylistEditor
      playlist={data.playlist}
      initialItems={data.items}
      availableAds={data.availableAds}
    />
  );
}
