import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Phone, MessageSquare, Eye, Plus } from "lucide-react";
import { EditAdvertiserForm } from "./edit-advertiser-form";

export const dynamic = "force-dynamic";

async function getAdvertiser(id: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: advertiser } = await supabase
    .from("advertisers")
    .select("*")
    .eq("id", id)
    .single();

  if (!advertiser) return null;

  const { data: ads } = await supabase
    .from("ads")
    .select(`
      *,
      impressions(count)
    `)
    .eq("advertiser_id", id)
    .order("created_at", { ascending: false });

  return { advertiser, ads: ads ?? [] };
}

const statusVariant: Record<string, "default" | "success" | "warning" | "destructive" | "secondary"> = {
  active: "success",
  paused: "warning",
  draft: "secondary",
  expired: "destructive",
};

export default async function AdvertiserDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const data = await getAdvertiser(params.id);
  if (!data) notFound();

  const { advertiser, ads } = data;

  const totalImpressions = ads.reduce((sum, ad) => {
    const raw = ad.impressions as unknown as { count: number }[] | null;
    const count = Array.isArray(raw) ? (raw[0]?.count ?? 0) : 0;
    return sum + count;
  }, 0);

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {advertiser.business_name}
          </h1>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            {advertiser.contact_name && (
              <span className="text-sm text-gray-600">{advertiser.contact_name}</span>
            )}
            {advertiser.contact_email && (
              <a
                href={`mailto:${advertiser.contact_email}`}
                className="text-sm text-gray-500 flex items-center gap-1 hover:text-gray-900"
              >
                <Mail className="h-3.5 w-3.5" />
                {advertiser.contact_email}
              </a>
            )}
            {advertiser.contact_phone && (
              <a
                href={`tel:${advertiser.contact_phone}`}
                className="text-sm text-gray-500 flex items-center gap-1 hover:text-gray-900"
              >
                <Phone className="h-3.5 w-3.5" />
                {advertiser.contact_phone}
              </a>
            )}
          </div>
        </div>
        <EditAdvertiserForm advertiser={advertiser} />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="bg-blue-50 rounded-lg p-2">
                <Eye className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{totalImpressions.toLocaleString()}</p>
                <p className="text-xs text-gray-500">Total Impressions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="bg-purple-50 rounded-lg p-2">
                <MessageSquare className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{ads.length}</p>
                <p className="text-xs text-gray-500">Total Ads</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {advertiser.notes && (
        <Card className="mb-6">
          <CardContent className="p-5">
            <p className="text-sm font-medium text-gray-700 mb-1">Notes</p>
            <p className="text-sm text-gray-600">{advertiser.notes}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Ads</CardTitle>
            <Link href={`/ads/new?advertiser_id=${advertiser.id}`}>
              <Button size="sm" className="gap-1">
                <Plus className="h-3.5 w-3.5" />
                New Ad
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {ads.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">
              No ads yet for this advertiser.
            </p>
          ) : (
            <div className="space-y-3">
              {ads.map((ad) => {
                const raw2 = ad.impressions as unknown as { count: number }[] | null;
                const impressionCount = Array.isArray(raw2) ? (raw2[0]?.count ?? 0) : 0;

                return (
                  <div
                    key={ad.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900">{ad.title}</p>
                        <Badge variant={statusVariant[ad.status] ?? "secondary"}>
                          {ad.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {ad.media_type} · {ad.duration_seconds}s ·{" "}
                        {impressionCount.toLocaleString()} impressions
                      </p>
                    </div>
                    <Link href={`/ads/${ad.id}`}>
                      <Button variant="ghost" size="sm">
                        Edit
                      </Button>
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
