"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const screenSchema = z.object({
  name: z.string().min(1, "Name is required"),
  location_id: z.string().uuid(),
});

export async function createScreen(formData: FormData) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: location } = await supabase
    .from("locations")
    .select("id")
    .eq("owner_user_id", user.id)
    .single();

  if (!location) throw new Error("No location found");

  const validated = screenSchema.parse({
    name: formData.get("name"),
    location_id: location.id,
  });

  const { data, error } = await supabase
    .from("screens")
    .insert(validated)
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/screens");
  return data;
}

export async function updateScreen(id: string, formData: FormData) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const name = formData.get("name") as string;
  if (!name) throw new Error("Name is required");

  const { data, error } = await supabase
    .from("screens")
    .update({ name })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath(`/screens/${id}`);
  revalidatePath("/screens");
  return data;
}

export async function rotateToken(screenId: string) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Generate new token using crypto
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const newToken = Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const { data, error } = await supabase
    .from("screens")
    .update({ player_token: newToken })
    .eq("id", screenId)
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath(`/screens/${screenId}`);
  return data;
}

export async function assignPlaylist(screenId: string, playlistId: string) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Remove existing playlist assignments for this screen
  await supabase
    .from("screen_playlists")
    .delete()
    .eq("screen_id", screenId);

  if (playlistId) {
    const { error } = await supabase
      .from("screen_playlists")
      .insert({ screen_id: screenId, playlist_id: playlistId });

    if (error) throw new Error(error.message);
  }

  revalidatePath(`/screens/${screenId}`);
  revalidatePath("/screens");
}
