"use client";

import { useEffect, useState } from "react";

interface AppSettings {
  appName: string;
  logoUrl: string | null;
}

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>({ appName: "Bill BumdesNET", logoUrl: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/settings/public")
      .then((res) => res.json())
      .then((res) => setSettings(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { ...settings, loading };
}
