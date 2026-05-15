"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const adSchema = z.object({
  title: z.string().min(1, "Title is required"),
  advertiser_id: z.string().uuid("Valid advertiser is required"),
  media_url: z.string().url("Valid URL is required"),
  media_type: z.enum(["image", "video"]),
  duration_seconds: z.coerce.number().int().min(1).max(300),
  status: z.enum(["draft", "active", "paused", "expired"]),
  start_date: z.string().optional().or(z.literal("")),
  end_date: z.string().optional().or(z.literal("")),
});

export async function createAd(formData: FormData) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: location } = await supabase
    .from("locations")
    .select("id")
    .eq("owner_user_id", user.id)
    .single();

  if (!location) throw new Error("No location found");

  const raw = {
    title: formData.get("title"),
    advertiser_id: formData.get("advertiser_id"),
    media_url: formData.get("media_url"),
    media_type: formData.get("media_type"),
    duration_seconds: formData.get("duration_seconds"),
    status: formData.get("status"),
    start_date: formData.get("start_date") || "",
    end_date: formData.get("end_date") || "",
  };

  const validated = adSchema.parse(raw);

  const { data, error } = await supabase
    .from("ads")
    .insert({
      ...validated,
      location_id: location.id,
      start_date: validated.start_date || null,
      end_date: validated.end_date || null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/ads");
  return data;
}

export async function updateAd(id: string, formData: FormData) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const raw = {
    title: formData.get("title"),
    advertiser_id: formData.get("advertiser_id"),
    media_url: formData.get("media_url"),
    media_type: formData.get("media_type"),
    duration_seconds: formData.get("duration_seconds"),
    status: formData.get("status"),
    start_date: formData.get("start_date") || "",
    end_date: formData.get("end_date") || "",
  };

  const validated = adSchema.parse(raw);

  const { data, error } = await supabase
    .from("ads")
    .update({
      ...validated,
      start_date: validated.start_date || null,
      end_date: validated.end_date || null,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath(`/ads/${id}`);
  revalidatePath("/ads");
  return data;
}

export async function toggleAdStatus(id: string, currentStatus: string) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const newStatus = currentStatus === "active" ? "paused" : "active";

  const { data, error } = await supabase
    .from("ads")
    .update({ status: newStatus })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/ads");
  revalidatePath(`/ads/${id}`);
  return data;
}
