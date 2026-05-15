import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, ChevronRight, ListVideo } from "lucide-react";
import { CreatePlaylistForm } from "./create-playlist-form";

export const dynamic = "force-dynamic";

async function getPlaylists() {
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

  const { data: playlists } = await supabase
    .from("playlists")
    .select(`
      *,
      playlist_items(count),
      screen_playlists(
        screen:screens(name)
      )
    `)
    .eq("location_id", location.id)
    .order("created_at", { ascending: false });

  return playlists ?? [];
}

export default async function PlaylistsPage() {
  const playlists = await getPlaylists();

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Playlists</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Manage ad rotations for your screens
          </p>
        </div>
        <CreatePlaylistForm />
      </div>

      {playlists.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="bg-gray-100 rounded-full p-4 mb-4">
              <ListVideo className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">No playlists yet</h3>
            <p className="text-gray-500 text-sm max-w-xs">
              Create a playlist and assign it to a screen to start showing ads.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {playlists.map((playlist) => {
            const itemCount = Array.isArray(playlist.playlist_items)
              ? playlist.playlist_items.length
              : (playlist.playlist_items as { count: number }[])?.[0]?.count ?? 0;

            const assignedScreens = ((playlist.screen_playlists as unknown as { screen: { name: string } | { name: string }[] }[]) ?? []).map((sp) => ({
              screen: Array.isArray(sp.screen) ? sp.screen[0] : sp.screen,
            })).filter((sp) => sp.screen);

            return (
              <Card key={playlist.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-gray-900">{playlist.name}</p>
                        <Badge variant={playlist.is_active ? "success" : "secondary"}>
                          {playlist.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span>{itemCount} ad{itemCount !== 1 ? "s" : ""}</span>
                        {assignedScreens.length > 0 && (
                          <span>
                            Assigned to:{" "}
                            {assignedScreens.map((sp) => sp.screen.name).join(", ")}
                          </span>
                        )}
                      </div>
                    </div>
                    <Link href={`/playlists/${playlist.id}`}>
                      <Button variant="outline" size="sm" className="gap-1">
                        Manage
                        <ChevronRight className="h-3 w-3" />
                      </Button>
                    </Link>
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
