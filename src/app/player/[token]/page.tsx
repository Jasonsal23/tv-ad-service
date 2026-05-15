"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface PlaylistItem {
  id: string;
  ad_id: string;
  title: string;
  media_url: string;
  media_type: "image" | "video";
  duration_seconds: number;
}

interface PlayerPageProps {
  params: { token: string };
}

export default function PlayerPage({ params }: PlayerPageProps) {
  const { token } = params;

  const [playlist, setPlaylist] = useState<PlaylistItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const nextImgRef = useRef<HTMLImageElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playlistRef = useRef<PlaylistItem[]>([]);
  const currentIndexRef = useRef(0);

  const fetchPlaylist = useCallback(async () => {
    try {
      const res = await fetch(`/api/player/${token}/playlist`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.items && data.items.length > 0) {
        setPlaylist(data.items);
        playlistRef.current = data.items;
      }
      setLoading(false);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch playlist:", err);
      if (playlistRef.current.length === 0) {
        setError("Unable to load playlist. Retrying...");
        setLoading(false);
      }
      // If we already have a playlist cached, keep playing silently
    }
  }, [token]);

  const recordImpression = useCallback(
    async (adId: string, durationSeconds: number) => {
      try {
        await fetch(`/api/player/${token}/impression`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ad_id: adId, duration_played_seconds: durationSeconds }),
        });
      } catch {
        // Fire-and-forget — don't break the player if this fails
      }
    },
    [token]
  );

  const advanceSlide = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    setCurrentIndex((prev) => {
      const next = (prev + 1) % Math.max(playlistRef.current.length, 1);
      currentIndexRef.current = next;
      return next;
    });
  }, []);

  // Preload the next image
  const preloadNext = useCallback((items: PlaylistItem[], currentIdx: number) => {
    if (items.length <= 1) return;
    const nextIdx = (currentIdx + 1) % items.length;
    const nextItem = items[nextIdx];
    if (nextItem && nextItem.media_type === "image") {
      const img = new Image();
      img.src = nextItem.media_url;
      nextImgRef.current = img;
    }
  }, []);

  // Handle showing the current item
  useEffect(() => {
    if (playlist.length === 0) return;

    const item = playlist[currentIndex];
    if (!item) return;

    // Record impression
    recordImpression(item.ad_id, item.duration_seconds);

    // Preload next
    preloadNext(playlist, currentIndex);

    if (item.media_type === "image") {
      // Show image for duration_seconds, then advance
      timerRef.current = setTimeout(() => {
        advanceSlide();
      }, item.duration_seconds * 1000);
    }
    // For videos, we listen for the `ended` event on the video element directly

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentIndex, playlist, advanceSlide, recordImpression, preloadNext]);

  // Initial fetch and heartbeat + refresh intervals
  useEffect(() => {
    fetchPlaylist();

    // Heartbeat every 60 seconds
    heartbeatRef.current = setInterval(async () => {
      try {
        await fetch(`/api/player/${token}/heartbeat`, { method: "POST" });
      } catch {
        // Ignore heartbeat failures
      }
    }, 60 * 1000);

    // Re-fetch playlist every 5 minutes
    refreshRef.current = setInterval(() => {
      fetchPlaylist();
    }, 5 * 60 * 1000);

    // Hard refresh at 3am daily
    const scheduleNightlyRefresh = () => {
      const now = new Date();
      const nextRefresh = new Date();
      nextRefresh.setHours(3, 0, 0, 0);
      if (nextRefresh <= now) {
        nextRefresh.setDate(nextRefresh.getDate() + 1);
      }
      const msUntilRefresh = nextRefresh.getTime() - now.getTime();
      setTimeout(() => {
        window.location.reload();
      }, msUntilRefresh);
    };
    scheduleNightlyRefresh();

    // Initial heartbeat
    fetch(`/api/player/${token}/heartbeat`, { method: "POST" }).catch(() => {});

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (refreshRef.current) clearInterval(refreshRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [token, fetchPlaylist]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white text-sm opacity-60">Loading...</p>
        </div>
      </div>
    );
  }

  if (error && playlist.length === 0) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <p className="text-white text-sm opacity-40">{error}</p>
      </div>
    );
  }

  if (playlist.length === 0) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <p className="text-white text-sm opacity-40">No ads in playlist</p>
      </div>
    );
  }

  const currentItem = playlist[currentIndex];

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      {playlist.map((item, index) => (
        <div
          key={`${item.id}-${index}`}
          className={`absolute inset-0 transition-opacity duration-500 ${
            index === currentIndex ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          {item.media_type === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.media_url}
              alt={item.title}
              className="w-full h-full object-contain"
              loading={index === currentIndex || index === (currentIndex + 1) % playlist.length ? "eager" : "lazy"}
            />
          ) : (
            <video
              ref={index === currentIndex ? videoRef : undefined}
              src={item.media_url}
              className="w-full h-full object-contain"
              autoPlay={index === currentIndex}
              muted
              playsInline
              onEnded={() => {
                if (index === currentIndex) {
                  advanceSlide();
                }
              }}
              onError={() => {
                if (index === currentIndex) {
                  // If video fails, wait the duration_seconds then advance
                  timerRef.current = setTimeout(advanceSlide, item.duration_seconds * 1000);
                }
              }}
            />
          )}
        </div>
      ))}

      {/* Invisible debug info — remove in production if desired */}
      <div className="absolute bottom-2 right-2 opacity-0 hover:opacity-30 transition-opacity">
        <p className="text-white text-xs">
          {currentIndex + 1}/{playlist.length} — {currentItem?.title}
        </p>
      </div>
    </div>
  );
}
