"use client";

import { WifiOff } from "lucide-react";

interface OfflineBannerProps {
  isOnline: boolean;
  lastSync?: Date | null;
  locale?: "es" | "en";
}

function formatRelative(date: Date, locale: "es" | "en"): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return locale === "es" ? "hace un momento" : "just now";
  if (diff < 3600) {
    const m = Math.floor(diff / 60);
    return locale === "es" ? `hace ${m} min` : `${m}m ago`;
  }
  const h = Math.floor(diff / 3600);
  return locale === "es" ? `hace ${h}h` : `${h}h ago`;
}

export function OfflineBanner({ isOnline, lastSync, locale = "es" }: OfflineBannerProps) {
  const syncText = lastSync ? ` (${formatRelative(lastSync, locale)})` : "";
  return (
    <div
      role="status"
      aria-live="polite"
      className={`overflow-hidden transition-all duration-300 ease-in-out ${
        isOnline ? "max-h-0 opacity-0" : "max-h-16 opacity-100"
      }`}
    >
      <div className="flex items-center gap-2 bg-amber-950/80 border-b border-amber-700/50 px-4 py-2.5 backdrop-blur-sm">
        <WifiOff className="h-3.5 w-3.5 shrink-0 text-amber-400" />
        <p className="text-xs font-semibold text-amber-300">
          {locale === "es"
            ? `Sin conexión — mostrando datos guardados${syncText}`
            : `Offline — showing cached data${syncText}`}
        </p>
      </div>
    </div>
  );
}
