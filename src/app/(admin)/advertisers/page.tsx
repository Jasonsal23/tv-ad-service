import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight, Mail, Phone, Plus } from "lucide-react";
import { CreateAdvertiserForm } from "./create-advertiser-form";

export const dynamic = "force-dynamic";

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

  const { data: advertisers } = await supabase
    .from("advertisers")
    .select(`
      *,
      ads(count)
    `)
    .eq("location_id", location.id)
    .order("business_name");

  return advertisers ?? [];
}

export default async function AdvertisersPage() {
  const advertisers = await getAdvertisers();

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Advertisers</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Local businesses running ads on your screens
          </p>
        </div>
        <CreateAdvertiserForm />
      </div>

      {advertisers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="bg-gray-100 rounded-full p-4 mb-4">
              <Plus className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">No advertisers yet</h3>
            <p className="text-gray-500 text-sm max-w-xs">
              Add your first advertiser to start selling ad slots.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {advertisers.map((advertiser) => {
            const adsRaw = advertiser.ads as unknown as { count: number }[] | null;
            const adCount = Array.isArray(adsRaw) ? (adsRaw[0]?.count ?? 0) : 0;

            return (
              <Card key={advertiser.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900">
                        {advertiser.business_name}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 mt-1">
                        {advertiser.contact_name && (
                          <span className="text-xs text-gray-500">
                            {advertiser.contact_name}
                          </span>
                        )}
                        {advertiser.contact_email && (
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {advertiser.contact_email}
                          </span>
                        )}
                        {advertiser.contact_phone && (
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {advertiser.contact_phone}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2.5 py-1">
                        {adCount} ad{adCount !== 1 ? "s" : ""}
                      </span>
                      <Link href={`/advertisers/${advertiser.id}`}>
                        <Button variant="outline" size="sm" className="gap-1">
                          View
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
