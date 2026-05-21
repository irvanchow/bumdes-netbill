"use client";

import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";

interface ShareLocationButtonProps {
  customerName: string;
  address: string;
  latitude: number;
  longitude: number;
  size?: "sm" | "default";
  className?: string;
}

export function ShareLocationButton({
  customerName,
  address,
  latitude,
  longitude,
  size = "default",
  className = "",
}: ShareLocationButtonProps) {
  function handleShare() {
    const mapsUrl = `https://maps.google.com/maps?q=${latitude},${longitude}`;
    const message = encodeURIComponent(
      `📍 Pemasangan Internet BumdesNET\n\nPelanggan: ${customerName}\nAlamat: ${address}\nLokasi: ${mapsUrl}`
    );
    window.open(`https://wa.me/?text=${message}`, "_blank");
  }

  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      onClick={handleShare}
      className={`border-border ${className}`}
    >
      <Share2 className="h-4 w-4 mr-2" />
      Share via WA
    </Button>
  );
}
