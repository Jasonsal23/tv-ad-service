import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, ChevronRight } from "lucide-react";
import { AdStatusToggle } from "./ad-status-toggle";

export const dynamic = "force-dynamic";

async function getAds(status?: string) {
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

  let query = supabase
    .from("ads")
    .select(`
      *,
      advertiser:advertisers(business_name)
    `)
    .eq("location_id", location.id)
    .order("created_at", { ascending: false });

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data } = await query;
  return data ?? [];
}

const statusVariant: Record<string, "default" | "success" | "warning" | "destructive" | "secondary"> = {
  active: "success",
  paused: "warning",
  draft: "secondary",
  expired: "destructive",
};

const tabs = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Paused", value: "paused" },
  { label: "Draft", value: "draft" },
  { label: "Expired", value: "expired" },
];

export default async function AdsPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const currentStatus = searchParams.status ?? "all";
  const ads = await getAds(currentStatus);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ads</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Manage all advertisements across your screens
          </p>
        </div>
        <Link href="/ads/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Ad
          </Button>
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {tabs.map((tab) => (
          <Link
            key={tab.value}
            href={`/ads?status=${tab.value}`}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
              currentStatus === tab.value
                ? "bg-white border border-b-white border-gray-200 text-gray-900 -mb-px"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {ads.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="bg-gray-100 rounded-full p-4 mb-4">
              <Plus className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">No ads found</h3>
            <p className="text-gray-500 text-sm">
              {currentStatus === "all"
                ? "Create your first ad to get started."
                : `No ${currentStatus} ads.`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {ads.map((ad) => {
            const advertiser = ad.advertiser as { business_name: string } | null;

            return (
              <Card key={ad.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-gray-900 truncate">{ad.title}</p>
                        <Badge variant={statusVariant[ad.status] ?? "secondary"}>
                          {ad.status}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {ad.media_type}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        {advertiser && (
                          <span>{advertiser.business_name}</span>
                        )}
                        <span>{ad.duration_seconds}s</span>
                        {ad.start_date && (
                          <span>
                            {ad.start_date} → {ad.end_date ?? "no end"}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <AdStatusToggle adId={ad.id} currentStatus={ad.status} />
                      <Link href={`/ads/${ad.id}`}>
                        <Button variant="outline" size="sm" className="gap-1">
                          Edit
                          <ChevronRight className="h-3 w-3" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
