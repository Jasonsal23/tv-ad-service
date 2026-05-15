import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { updateAd } from "@/lib/actions/ads";
import { ArrowLeft, Eye } from "lucide-react";

export const dynamic = "force-dynamic";

const statusVariant: Record<string, "default" | "success" | "warning" | "destructive" | "secondary"> = {
  active: "success",
  paused: "warning",
  draft: "secondary",
  expired: "destructive",
};

async function getAd(id: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: ad } = await supabase
    .from("ads")
    .select(`
      *,
      advertiser:advertisers(id, business_name)
    `)
    .eq("id", id)
    .single();

  if (!ad) return null;

  const { data: location } = await supabase
    .from("locations")
    .select("id")
    .eq("owner_user_id", user.id)
    .single();

  const { data: advertisers } = await supabase
    .from("advertisers")
    .select("id, business_name")
    .eq("location_id", location?.id ?? "")
    .order("business_name");

  // Get impression count
  const { count: impressionCount } = await supabase
    .from("impressions")
    .select("id", { count: "exact" })
    .eq("ad_id", id);

  return { ad, advertisers: advertisers ?? [], impressionCount: impressionCount ?? 0 };
}

export default async function AdDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const data = await getAd(params.id);
  if (!data) notFound();

  const { ad, advertisers, impressionCount } = data;

  async function handleUpdate(formData: FormData) {
    "use server";
    await updateAd(params.id, formData);
    redirect(`/ads/${params.id}`);
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
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">{ad.title}</h1>
          <Badge variant={statusVariant[ad.status] ?? "secondary"}>
            {ad.status}
          </Badge>
        </div>
      </div>

      {/* Stats */}
      <Card className="mb-6">
        <CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div className="bg-purple-50 rounded-lg p-2">
              <Eye className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{impressionCount.toLocaleString()}</p>
              <p className="text-xs text-gray-500">Total Impressions</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Media Preview */}
      {ad.media_url && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Media Preview</CardTitle>
          </CardHeader>
          <CardContent>
            {ad.media_type === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={ad.media_url}
                alt={ad.title}
                className="w-full max-h-64 object-contain rounded-lg bg-gray-50"
              />
            ) : (
              <video
                src={ad.media_url}
                controls
                className="w-full max-h-64 rounded-lg bg-black"
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Edit Ad</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={handleUpdate} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                name="title"
                defaultValue={ad.title}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="advertiser_id">Advertiser *</Label>
              <Select
                id="advertiser_id"
                name="advertiser_id"
                defaultValue={ad.advertiser_id}
                required
              >
                {advertisers.map((adv) => (
                  <option key={adv.id} value={adv.id}>
                    {adv.business_name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="media_url">Media URL *</Label>
              <Input
                id="media_url"
                name="media_url"
                type="url"
                defaultValue={ad.media_url}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="media_type">Media Type *</Label>
                <Select
                  id="media_type"
                  name="media_type"
                  defaultValue={ad.media_type}
                  required
                >
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
                  defaultValue={ad.duration_seconds}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  name="start_date"
                  type="date"
                  defaultValue={ad.start_date ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">End Date</Label>
                <Input
                  id="end_date"
                  name="end_date"
                  type="date"
                  defaultValue={ad.end_date ?? ""}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select id="status" name="status" defaultValue={ad.status}>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="expired">Expired</option>
              </Select>
            </div>

            <div className="pt-2 flex gap-3">
              <Button type="submit" className="flex-1">
                Save Changes
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
