"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateScreen, rotateToken, assignPlaylist } from "@/lib/actions/screens";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, Save } from "lucide-react";

interface Playlist {
  id: string;
  name: string;
  is_active: boolean;
}

interface ScreenActionsProps {
  screenId: string;
  screenName: string;
  assignedPlaylistId: string | null;
  playlists: Playlist[];
  playerToken: string;
  playerUrl: string;
}

export function ScreenActions({
  screenId,
  screenName,
  assignedPlaylistId,
  playlists,
  playerToken,
  playerUrl,
}: ScreenActionsProps) {
  const [name, setName] = useState(screenName);
  const [selectedPlaylist, setSelectedPlaylist] = useState(assignedPlaylistId ?? "");
  const [loading, setLoading] = useState(false);
  const [rotatingToken, setRotatingToken] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

  async function handleSave() {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.set("name", name);
      await updateScreen(screenId, formData);
      await assignPlaylist(screenId, selectedPlaylist);
      setSuccess("Screen updated successfully");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update screen");
    } finally {
      setLoading(false);
    }
  }

  async function handleRotateToken() {
    if (
      !confirm(
        "Rotating the player token will invalidate the current URL. You will need to update the URL on the Fire TV Stick. Continue?"
      )
    ) {
      return;
    }

    setRotatingToken(true);
    setError(null);

    try {
      await rotateToken(screenId);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to rotate token");
    } finally {
      setRotatingToken(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Screen Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="screen-name">Screen Name</Label>
            <Input
              id="screen-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Front TV"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="playlist-select">Assigned Playlist</Label>
            <Select
              id="playlist-select"
              value={selectedPlaylist}
              onChange={(e) => setSelectedPlaylist(e.target.value)}
            >
              <option value="">— No playlist assigned —</option>
              {playlists.map((pl) => (
                <option key={pl.id} value={pl.id}>
                  {pl.name} {!pl.is_active ? "(inactive)" : ""}
                </option>
              ))}
            </Select>
            <p className="text-xs text-gray-400">
              The player will pull from this playlist. Changes take effect within 5 minutes.
            </p>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-700">
              {success}
            </div>
          )}

          <Button onClick={handleSave} disabled={loading} className="gap-2">
            <Save className="h-4 w-4" />
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-red-900">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-900">Rotate Player Token</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Generates a new player URL. The old URL will stop working. Update Fully Kiosk Browser with the new URL.
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleRotateToken}
              disabled={rotatingToken}
              className="flex-shrink-0 gap-2"
            >
              <RefreshCw className={`h-3 w-3 ${rotatingToken ? "animate-spin" : ""}`} />
              {rotatingToken ? "Rotating..." : "Rotate"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
