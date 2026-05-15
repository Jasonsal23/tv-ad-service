"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const advertiserSchema = z.object({
  business_name: z.string().min(1, "Business name is required"),
  contact_name: z.string().optional(),
  contact_email: z.string().email().optional().or(z.literal("")),
  contact_phone: z.string().optional(),
  notes: z.string().optional(),
});

export async function createAdvertiser(formData: FormData) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: location } = await supabase
    .from("locations")
    .select("id")
    .eq("owner_user_id", user.id)
    .single();

  if (!location) throw new Error("No location found");

  const validated = advertiserSchema.parse({
    business_name: formData.get("business_name"),
    contact_name: formData.get("contact_name") || undefined,
    contact_email: formData.get("contact_email") || "",
    contact_phone: formData.get("contact_phone") || undefined,
    notes: formData.get("notes") || undefined,
  });

  const { data, error } = await supabase
    .from("advertisers")
    .insert({ ...validated, location_id: location.id })
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/advertisers");
  return data;
}

export async function updateAdvertiser(id: string, formData: FormData) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const validated = advertiserSchema.parse({
    business_name: formData.get("business_name"),
    contact_name: formData.get("contact_name") || undefined,
    contact_email: formData.get("contact_email") || "",
    contact_phone: formData.get("contact_phone") || undefined,
    notes: formData.get("notes") || undefined,
  });

  const { data, error } = await supabase
    .from("advertisers")
    .update(validated)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath(`/advertisers/${id}`);
  revalidatePath("/advertisers");
  return data;
}
