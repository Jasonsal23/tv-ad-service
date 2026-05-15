import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, ExternalLink, ChevronRight } from "lucide-react";
import { CreateScreenForm } from "./create-screen-form";

export const dynamic = "force-dynamic";

async function getScreens() {
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

  const { data: screens } = await supabase
    .from("screens")
    .select("*")
    .eq("location_id", location.id)
    .order("created_at", { ascending: true });

  return screens ?? [];
}

function isOnline(lastSeenAt: string | null): boolean {
  if (!lastSeenAt) return false;
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
  return new Date(lastSeenAt) > twoMinutesAgo;
}

export default async function ScreensPage() {
  const screens = await getScreens();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://signage.builtbyjason.dev";

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Screens</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Manage your TVs and their player URLs
          </p>
        </div>
        <CreateScreenForm />
      </div>

      {screens.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="bg-gray-100 rounded-full p-4 mb-4">
              <Plus className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">No screens yet</h3>
            <p className="text-gray-500 text-sm max-w-xs">
              Add your first screen to get started. Each TV needs its own screen entry.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {screens.map((screen) => {
            const online = isOnline(screen.last_seen_at);
            const playerUrl = `${baseUrl}/player/${screen.player_token}`;

            return (
              <Card key={screen.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="relative flex-shrink-0">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            online ? "bg-green-500" : "bg-gray-300"
                          }`}
                        />
                        {online && (
                          <div className="absolute inset-0 w-3 h-3 rounded-full bg-green-500 animate-ping opacity-75" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900">{screen.name}</p>
                          <Badge variant={online ? "success" : "secondary"}>
                            {online ? "Online" : "Offline"}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-400 truncate mt-0.5 max-w-sm">
                          {screen.last_seen_at
                            ? `Last seen ${new Date(screen.last_seen_at).toLocaleString()}`
                            : "Never connected"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <a
                        href={playerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 border border-gray-200 rounded-md px-3 py-1.5 hover:bg-gray-50 transition-colors"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Player URL
                      </a>
                      <Link href={`/screens/${screen.id}`}>
                        <Button variant="outline" size="sm" className="gap-1">
                          Manage
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
