"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toggleAdStatus } from "@/lib/actions/ads";
import { Button } from "@/components/ui/button";
import { Pause, Play } from "lucide-react";

export function AdStatusToggle({
  adId,
  currentStatus,
}: {
  adId: string;
  currentStatus: string;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  if (currentStatus !== "active" && currentStatus !== "paused") return null;

  async function handleToggle() {
    setLoading(true);
    try {
      await toggleAdStatus(adId, currentStatus);
      router.refresh();
    } catch (err) {
      console.error("Failed to toggle status:", err);
    } finally {
      setLoading(false);
    }
  }

  const isActive = currentStatus === "active";

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleToggle}
      disabled={loading}
      className={`gap-1 ${isActive ? "text-amber-600 border-amber-200 hover:bg-amber-50" : "text-green-600 border-green-200 hover:bg-green-50"}`}
    >
      {isActive ? (
        <>
          <Pause className="h-3 w-3" />
          {loading ? "..." : "Pause"}
        </>
      ) : (
        <>
          <Play className="h-3 w-3" />
          {loading ? "..." : "Resume"}
        </>
      )}
    </Button>
  );
}
