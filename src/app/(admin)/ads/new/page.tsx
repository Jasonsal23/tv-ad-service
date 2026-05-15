import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { createAd } from "@/lib/actions/ads";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

async function getAdvertisers() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: location } = await supabase
    .from("locations")
    .select("id")
    .eq("owner_user_id", user.id)
    .single();

  if (!location) return [];

  const { data } = await supabase
    .from("advertisers")
    .select("id, business_name")
    .eq("location_id", location.id)
    .order("business_name");

  return data ?? [];
}

export default async function NewAdPage({
  searchParams,
}: {
  searchParams: { advertiser_id?: string };
}) {
  const advertisers = await getAdvertisers();

  async function handleCreate(formData: FormData) {
    "use server";
    const ad = await createAd(formData);
    redirect(`/ads/${ad.id}`);
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <Link
          href="/ads"
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Ads
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">New Ad</h1>
        <p className="text-gray-500 mt-1 text-sm">Upload a new advertisement</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ad Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={handleCreate} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                name="title"
                placeholder="e.g. Joe's Pizza Summer Special"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="advertiser_id">Advertiser *</Label>
              <Select
                id="advertiser_id"
                name="advertiser_id"
                defaultValue={searchParams.advertiser_id ?? ""}
                required
              >
                <option value="">Select an advertiser...</option>
                {advertisers.map((adv) => (
                  <option key={adv.id} value={adv.id}>
                    {adv.business_name}
                  </option>
                ))}
              </Select>
              {advertisers.length === 0 && (
                <p className="text-xs text-amber-600">
                  No advertisers found.{" "}
                  <Link href="/advertisers" className="underline">
                    Add an advertiser first.
                  </Link>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="media_url">Media URL *</Label>
              <Input
                id="media_url"
                name="media_url"
                type="url"
                placeholder="https://your-storage.supabase.co/..."
                required
              />
              <p className="text-xs text-gray-400">
                Paste a direct URL to the image or video file (Supabase Storage, Cloudinary, etc.)
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="media_type">Media Type *</Label>
                <Select id="media_type" name="media_type" required>
                  <option value="image">Image</option>
                  <option value="video">Video</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration_seconds">Duration (seconds)</Label>
                <Input
                  id="duration_seconds"
                  name="duration_seconds"
                  type="number"
                  min="1"
                  max="300"
                  defaultValue="10"
                />
                <p className="text-xs text-gray-400">For images only</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date</Label>
                <Input id="start_date" name="start_date" type="date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">End Date</Label>
                <Input id="end_date" name="end_date" type="date" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select id="status" name="status" defaultValue="draft">
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
              </Select>
            </div>

            <div className="pt-2 flex gap-3">
              <Button type="submit" className="flex-1">
                Create Ad
              </Button>
              <Link href="/ads">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
