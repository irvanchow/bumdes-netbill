"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface CustomerLocation {
  id: string;
  name: string;
  address: string;
  status: string;
  latitude: string;
  longitude: string;
}

const statusColors: Record<string, string> = {
  aktif: "#10b981",
  suspend: "#f59e0b",
  nonaktif: "#ef4444",
  belum_aktif: "#6b7280",
};

const statusLabels: Record<string, string> = {
  aktif: "Aktif",
  suspend: "Suspend",
  nonaktif: "Non Aktif",
  belum_aktif: "Belum Aktif",
};

function createIcon(status: string) {
  const color = statusColors[status] || "#6b7280";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" width="32" height="32"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>`;
  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
}

function FitBounds({ locations }: { locations: CustomerLocation[] }) {
  const map = useMap();

  useEffect(() => {
    if (locations.length === 0) return;
    const bounds = L.latLngBounds(
      locations.map((l) => [parseFloat(l.latitude), parseFloat(l.longitude)])
    );
    map.fitBounds(bounds, { padding: [30, 30] });
  }, [locations, map]);

  return null;
}

export default function CustomersMap() {
  const [locations, setLocations] = useState<CustomerLocation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/customers-map")
      .then((res) => res.json())
      .then((res) => setLocations(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="h-[400px] rounded-lg bg-muted animate-pulse" />;
  }

  if (locations.length === 0) {
    return (
      <div className="h-[400px] rounded-lg border border-border bg-card flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Belum ada data lokasi pelanggan</p>
      </div>
    );
  }

  const center: [number, number] = [
    parseFloat(locations[0].latitude),
    parseFloat(locations[0].longitude),
  ];

  return (
    <div className="h-[400px] rounded-lg overflow-hidden border border-border">
      <MapContainer center={center} zoom={13} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds locations={locations} />
        {locations.map((loc) => (
          <Marker
            key={loc.id}
            position={[parseFloat(loc.latitude), parseFloat(loc.longitude)]}
            icon={createIcon(loc.status)}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-semibold">{loc.name}</p>
                <p className="text-gray-600">{loc.address}</p>
                <p className="mt-1">
                  <span
                    className="inline-block px-2 py-0.5 rounded text-xs text-white"
                    style={{ backgroundColor: statusColors[loc.status] }}
                  >
                    {statusLabels[loc.status] || loc.status}
                  </span>
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
