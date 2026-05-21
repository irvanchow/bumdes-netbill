"use client";

import { MapPin, ExternalLink } from "lucide-react";

interface LocationMapProps {
  latitude: number;
  longitude: number;
}

export function LocationMap({ latitude, longitude }: LocationMapProps) {
  const mapsUrl = `https://maps.google.com/maps?q=${latitude},${longitude}`;
  const embedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.005},${latitude - 0.003},${longitude + 0.005},${latitude + 0.003}&layer=mapnik&marker=${latitude},${longitude}`;

  return (
    <div className="space-y-2">
      <div className="rounded-lg overflow-hidden border border-border">
        <iframe
          src={embedUrl}
          width="100%"
          height="200"
          style={{ border: 0 }}
          loading="lazy"
          title="Lokasi pelanggan"
        />
      </div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <MapPin className="h-3 w-3" />
        <span>{latitude.toFixed(7)}, {longitude.toFixed(7)}</span>
        <span className="mx-1">•</span>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline inline-flex items-center gap-1"
        >
          Buka di Google Maps <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}
