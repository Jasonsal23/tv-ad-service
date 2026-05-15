import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tv, ImageIcon, Eye, TrendingUp } from "lucide-react";

export const dynamic = "force-dynamic";

async function getDashboardStats() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: location } = await supabase
    .from("locations")
    .select("id")
    .eq("owner_user_id", user.id)
    .single();

  if (!location) return null;

  const locationId = location.id;
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [screensResult, onlineResult, activeAdsResult, impressionsResult] =
    await Promise.all([
      supabase
        .from("screens")
        .select("id", { count: "exact" })
        .eq("location_id", locationId),
      supabase
        .from("screens")
        .select("id", { count: "exact" })
        .eq("location_id", locationId)
        .gte("last_seen_at", twoMinutesAgo),
      supabase
        .from("ads")
        .select("id", { count: "exact" })
        .eq("location_id", locationId)
        .eq("status", "active"),
      supabase
        .from("impressions")
        .select(
          `id, screen_id, screens!inner(location_id)`,
          { count: "exact" }
        )
        .eq("screens.location_id", locationId)
        .gte("played_at", todayStart.toISOString()),
    ]);

  return {
    totalScreens: screensResult.count ?? 0,
    onlineScreens: onlineResult.count ?? 0,
    activeAds: activeAdsResult.count ?? 0,
    todayImpressions: impressionsResult.count ?? 0,
  };
}

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  if (!stats) {
    return (
      <div className="p-8">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 max-w-md">
          <h2 className="text-amber-800 font-semibold mb-2">No location found</h2>
          <p className="text-amber-700 text-sm">
            Your account does not have a location set up yet. Contact your
            administrator to get started.
          </p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Screens Online",
      value: `${stats.onlineScreens} / ${stats.totalScreens}`,
      subtitle: stats.onlineScreens === stats.totalScreens && stats.totalScreens > 0
        ? "All screens active"
        : stats.onlineScreens === 0
        ? "No screens online"
        : `${stats.totalScreens - stats.onlineScreens} offline`,
      icon: Tv,
      color: stats.onlineScreens > 0 ? "text-green-600" : "text-gray-400",
      bgColor: stats.onlineScreens > 0 ? "bg-green-50" : "bg-gray-50",
    },
    {
      title: "Active Ads",
      value: stats.activeAds.toString(),
      subtitle: "Currently running",
      icon: ImageIcon,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Today's Impressions",
      value: stats.todayImpressions.toLocaleString(),
      subtitle: "Ad plays today",
      icon: Eye,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Overview of your signage network
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">
                      {stat.value}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">{stat.subtitle}</p>
                  </div>
                  <div className={`${stat.bgColor} rounded-xl p-3`}>
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <QuickLink href="/ads/new" label="Upload new ad" description="Add a new advertisement to the system" />
              <QuickLink href="/screens" label="Manage screens" description="View and configure your TVs" />
              <QuickLink href="/playlists" label="Edit playlists" description="Reorder and manage ad rotations" />
              <QuickLink href="/advertisers" label="Add advertiser" description="Onboard a new local business" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <StatusRow
                label="Screens"
                online={stats.onlineScreens}
                total={stats.totalScreens}
              />
              <div className="pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-400">
                  Screens are considered online if they sent a heartbeat in the last 2 minutes.
                  The player pings every 60 seconds.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function QuickLink({
  href,
  label,
  description,
}: {
  href: string;
  label: string;
  description: string;
}) {
  return (
    <a
      href={href}
      className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
    >
      <div className="w-1.5 h-1.5 rounded-full bg-gray-300 group-hover:bg-gray-900 mt-1.5 flex-shrink-0 transition-colors" />
      <div>
        <p className="text-sm font-medium text-gray-900 group-hover:text-black">{label}</p>
        <p className="text-xs text-gray-400">{description}</p>
      </div>
    </a>
  );
}

function StatusRow({
  label,
  online,
  total,
}: {
  label: string;
  online: number;
  total: number;
}) {
  const percent = total > 0 ? (online / total) * 100 : 0;

  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm text-gray-500">
          {online}/{total} online
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-green-500 rounded-full transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
