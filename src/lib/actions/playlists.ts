"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const playlistSchema = z.object({
  name: z.string().min(1, "Name is required"),
  is_active: z.boolean().default(true),
});

export async function createPlaylist(formData: FormData) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: location } = await supabase
    .from("locations")
    .select("id")
    .eq("owner_user_id", user.id)
    .single();

  if (!location) throw new Error("No location found");

  const validated = playlistSchema.parse({
    name: formData.get("name"),
    is_active: formData.get("is_active") === "true",
  });

  const { data, error } = await supabase
    .from("playlists")
    .insert({ ...validated, location_id: location.id })
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/playlists");
  return data;
}

export async function updatePlaylistItems(
  playlistId: string,
  items: { ad_id: string; order_index: number; weight: number }[]
) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Delete existing items and re-insert in new order
  const { error: deleteError } = await supabase
    .from("playlist_items")
    .delete()
    .eq("playlist_id", playlistId);

  if (deleteError) throw new Error(deleteError.message);

  if (items.length > 0) {
    const { error: insertError } = await supabase.from("playlist_items").insert(
      items.map((item) => ({
        playlist_id: playlistId,
        ad_id: item.ad_id,
        order_index: item.order_index,
        weight: item.weight,
      }))
    );

    if (insertError) throw new Error(insertError.message);
  }

  revalidatePath(`/playlists/${playlistId}`);
  revalidatePath("/playlists");
}

export async function addAdToPlaylist(playlistId: string, adId: string) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Get current max order_index
  const { data: existing } = await supabase
    .from("playlist_items")
    .select("order_index")
    .eq("playlist_id", playlistId)
    .order("order_index", { ascending: false })
    .limit(1);

  const nextIndex = existing && existing.length > 0 ? existing[0].order_index + 1 : 0;

  const { error } = await supabase.from("playlist_items").insert({
    playlist_id: playlistId,
    ad_id: adId,
    order_index: nextIndex,
    weight: 1,
  });

  if (error) throw new Error(error.message);

  revalidatePath(`/playlists/${playlistId}`);
}

export async function removeAdFromPlaylist(playlistItemId: string, playlistId: string) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("playlist_items")
    .delete()
    .eq("id", playlistItemId);

  if (error) throw new Error(error.message);

  revalidatePath(`/playlists/${playlistId}`);
}
