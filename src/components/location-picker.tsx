"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface LocationPickerProps {
  latitude: number | null;
  longitude: number | null;
  onChange: (lat: number | null, lng: number | null) => void;
}

export function LocationPicker({ latitude, longitude, onChange }: LocationPickerProps) {
  const [loading, setLoading] = useState(false);

  function handleGetLocation() {
    if (!navigator.geolocation) {
      toast.error("Browser tidak mendukung GPS");
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onChange(position.coords.latitude, position.coords.longitude);
        setLoading(false);
        toast.success("Lokasi berhasil diambil");
      },
      (error) => {
        setLoading(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            toast.error("Izin lokasi ditolak. Aktifkan GPS dan izinkan akses lokasi.");
            break;
          case error.POSITION_UNAVAILABLE:
            toast.error("Lokasi tidak tersedia");
            break;
          case error.TIMEOUT:
            toast.error("Timeout mengambil lokasi");
            break;
          default:
            toast.error("Gagal mengambil lokasi");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }

  function handleClear() {
    onChange(null, null);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleGetLocation}
          disabled={loading}
          className="border-border"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <MapPin className="h-4 w-4 mr-2" />
          )}
          {loading ? "Mengambil lokasi..." : "Pin Lokasi"}
        </Button>
        {latitude && longitude && (
          <Button type="button" variant="ghost" size="sm" onClick={handleClear} className="text-muted-foreground">
            Hapus
          </Button>
        )}
      </div>
      {latitude && longitude && (
        <div className="p-3 bg-accent/50 rounded-lg border border-border text-sm">
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">Koordinat:</span> {latitude.toFixed(7)}, {longitude.toFixed(7)}
          </p>
          <a
            href={`https://maps.google.com/maps?q=${latitude},${longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary text-xs hover:underline mt-1 inline-block"
          >
            Lihat di Google Maps
          </a>
        </div>
      )}
    </div>
  );
}
