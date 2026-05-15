"use client";

import { useState, useCallback } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { updatePlaylistItems, addAdToPlaylist, removeAdFromPlaylist } from "@/lib/actions/playlists";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import {
  GripVertical,
  Trash2,
  Plus,
  Save,
  ArrowLeft,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

interface Ad {
  id: string;
  title: string;
  media_type: string;
  duration_seconds: number;
  status: string;
  advertiser: { business_name: string } | null;
}

interface PlaylistItem {
  id: string;
  order_index: number;
  weight: number;
  ad: Ad | null;
}

interface Playlist {
  id: string;
  name: string;
  is_active: boolean;
}

interface PlaylistEditorProps {
  playlist: Playlist;
  initialItems: PlaylistItem[];
  availableAds: Ad[];
}

const statusVariant: Record<string, "default" | "success" | "warning" | "destructive" | "secondary"> = {
  active: "success",
  paused: "warning",
  draft: "secondary",
  expired: "destructive",
};

export function PlaylistEditor({
  playlist,
  initialItems,
  availableAds,
}: PlaylistEditorProps) {
  const [items, setItems] = useState<PlaylistItem[]>(initialItems);
  const [selectedAdId, setSelectedAdId] = useState("");
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const router = useRouter();

  const handleDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return;

    const reordered = Array.from(items);
    const [removed] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, removed);

    // Update order_index values
    const updated = reordered.map((item, idx) => ({
      ...item,
      order_index: idx,
    }));

    setItems(updated);
  }, [items]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      await updatePlaylistItems(
        playlist.id,
        items.map((item) => ({
          ad_id: item.ad!.id,
          order_index: item.order_index,
          weight: item.weight,
        }))
      );
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleAddAd = async () => {
    if (!selectedAdId) return;
    setAdding(true);
    setError(null);

    try {
      await addAdToPlaylist(playlist.id, selectedAdId);
      setSelectedAdId("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add ad");
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      await removeAdFromPlaylist(itemId, playlist.id);
      setItems((prev) => prev.filter((item) => item.id !== itemId));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove");
    }
  };

  // Ads already in the playlist
  const itemAdIds = new Set(items.map((item) => item.ad?.id).filter(Boolean));
  const addableAds = availableAds.filter((ad) => !itemAdIds.has(ad.id));

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <Link
          href="/playlists"
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Playlists
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{playlist.name}</h1>
              <Badge variant={playlist.is_active ? "success" : "secondary"}>
                {playlist.is_active ? "Active" : "Inactive"}
              </Badge>
            </div>
            <p className="text-gray-500 text-sm mt-1">
              Drag to reorder · Changes are saved manually
            </p>
          </div>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Order"}
          </Button>
        </div>
      </div>

      {saveSuccess && (
        <div className="rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-700 mb-4">
          Playlist order saved successfully.
        </div>
      )}
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700 mb-4">
          {error}
        </div>
      )}

      {/* Add ad */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Add Ad to Playlist</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Select
              value={selectedAdId}
              onChange={(e) => setSelectedAdId(e.target.value)}
              className="flex-1"
            >
              <option value="">Select an ad to add...</option>
              {addableAds.map((ad) => (
                <option key={ad.id} value={ad.id}>
                  {ad.title}{" "}
                  {ad.advertiser ? `(${ad.advertiser.business_name})` : ""} — {ad.status}
                </option>
              ))}
            </Select>
            <Button
              onClick={handleAddAd}
              disabled={!selectedAdId || adding}
              className="gap-2 flex-shrink-0"
            >
              <Plus className="h-4 w-4" />
              {adding ? "Adding..." : "Add"}
            </Button>
          </div>
          {addableAds.length === 0 && (
            <p className="text-xs text-gray-400 mt-2">
              All available ads are already in this playlist.{" "}
              <Link href="/ads/new" className="underline">
                Create a new ad.
              </Link>
            </p>
          )}
        </CardContent>
      </Card>

      {/* Playlist items — drag and drop */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Playlist Items ({items.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-gray-400">
                No ads in this playlist yet. Add some above.
              </p>
            </div>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="playlist-items">
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="space-y-2"
                  >
                    {items.map((item, index) => {
                      if (!item.ad) return null;
                      const ad = item.ad;

                      return (
                        <Draggable
                          key={item.id}
                          draggableId={item.id}
                          index={index}
                        >

                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                                snapshot.isDragging
                                  ? "border-gray-400 bg-white shadow-lg"
                                  : "border-gray-200 bg-white hover:border-gray-300"
                              }`}
                            >
                              {/* Drag handle */}
                              <div
                                {...provided.dragHandleProps}
                                className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing flex-shrink-0"
                              >
                                <GripVertical className="h-5 w-5" />
                              </div>

                              {/* Order number */}
                              <span className="text-xs font-mono text-gray-400 w-5 flex-shrink-0">
                                {index + 1}
                              </span>

                              {/* Ad info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {ad.title}
                                  </p>
                                  <Badge
                                    variant={statusVariant[ad.status] ?? "secondary"}
                                  >
                                    {ad.status}
                                  </Badge>
                                </div>
                                <p className="text-xs text-gray-400">
                                  {ad.advertiser?.business_name} ·{" "}
                                  {ad.media_type} · {ad.duration_seconds}s
                                </p>
                              </div>

                              {/* Actions */}
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <Link
                                  href={`/ads/${ad.id}`}
                                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
                                  target="_blank"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </Link>
                                <button
                                  onClick={() => handleRemoveItem(item.id)}
                                  className="p-1.5 text-gray-400 hover:text-red-600 rounded transition-colors"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </CardContent>
      </Card>

      {/* Preview link */}
      {items.length > 0 && (
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-400">
            To preview this playlist, assign it to a screen and open the player URL.
          </p>
        </div>
      )}
    </div>
  );
}
