import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScreenActions } from "./screen-actions";

export const dynamic = "force-dynamic";

async function getScreen(id: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: screen } = await supabase
    .from("screens")
    .select("*")
    .eq("id", id)
    .single();

  if (!screen) return null;

  // Get assigned playlist
  const { data: screenPlaylist } = await supabase
    .from("screen_playlists")
    .select("playlist_id")
    .eq("screen_id", id)
    .single();

  // Get all playlists for this location
  const { data: location } = await supabase
    .from("locations")
    .select("id")
    .eq("owner_user_id", user.id)
    .single();

  const { data: playlists } = await supabase
    .from("playlists")
    .select("id, name, is_active")
    .eq("location_id", location?.id ?? "")
    .order("name");

  return {
    screen,
    assignedPlaylistId: screenPlaylist?.playlist_id ?? null,
    playlists: playlists ?? [],
  };
}

function isOnline(lastSeenAt: string | null): boolean {
  if (!lastSeenAt) return false;
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
  return new Date(lastSeenAt) > twoMinutesAgo;
}

export default async function ScreenDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const data = await getScreen(params.id);
  if (!data) notFound();

  const { screen, assignedPlaylistId, playlists } = data;
  const online = isOnline(screen.last_seen_at);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://signage.builtbyjason.dev";
  const playerUrl = `${baseUrl}/player/${screen.player_token}`;

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">{screen.name}</h1>
            <Badge variant={online ? "success" : "secondary"}>
              {online ? "Online" : "Offline"}
            </Badge>
          </div>
          <p className="text-gray-500 text-sm">
            {screen.last_seen_at
              ? `Last seen ${new Date(screen.last_seen_at).toLocaleString()}`
              : "Never connected"}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Player URL Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Player URL</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="bg-gray-50 rounded-lg p-3 font-mono text-sm text-gray-700 break-all">
              {playerUrl}
            </div>
            <p className="text-xs text-gray-400">
              Open this URL in Fully Kiosk Browser on the Fire TV Stick. Bookmark it as the start URL.
            </p>
            <div className="flex gap-2">
              <a
                href={playerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-700 underline"
              >
                Open player in new tab
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Screen Actions Card */}
        <ScreenActions
          screenId={screen.id}
          screenName={screen.name}
          assignedPlaylistId={assignedPlaylistId}
          playlists={playlists}
          playerToken={screen.player_token}
          playerUrl={playerUrl}
        />
      </div>
    </div>
  );
}
