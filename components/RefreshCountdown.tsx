"use client";

import { useLanguage } from "@/contexts/LanguageContext";

interface RefreshCountdownProps {
  secondsUntilRefresh: number;
  totalSeconds: number;
  lastUpdated: Date | null;
  isStale?: boolean;
}

export function RefreshCountdown({
  secondsUntilRefresh,
  totalSeconds,
  lastUpdated,
  isStale,
}: RefreshCountdownProps) {
  const { t, locale } = useLanguage();
  const progress =
    totalSeconds > 0
      ? ((totalSeconds - secondsUntilRefresh) / totalSeconds) * 100
      : 0;

  const minutes = Math.floor(secondsUntilRefresh / 60);
  const seconds = secondsUntilRefresh % 60;

  return (
    <div className="space-y-1.5 w-48">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>
          {t.nextRefresh}{" "}
          <span className="text-gray-300 font-medium tabular-nums">
            {minutes}:{String(seconds).padStart(2, "0")}
          </span>
        </span>
        {lastUpdated && (
          <span>
            {lastUpdated.toLocaleTimeString(locale === "en" ? "en-US" : "es-AR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}
      </div>
      <div className="h-1 w-full rounded-full bg-gray-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${isStale ? "bg-amber-500" : "bg-blue-500"}`}
          style={{ width: `${progress}%` }}
        />
      </div>
      {isStale && (
        <p className="text-xs text-amber-500 flex items-center gap-1">
          <span>⚠️</span>
          <span>{locale === "en" ? "Data may be outdated" : "Datos pueden estar desactualizados"}</span>
        </p>
      )}
    </div>
  );
}
