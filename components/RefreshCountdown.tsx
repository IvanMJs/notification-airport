"use client";

import { useLanguage } from "@/contexts/LanguageContext";

interface RefreshCountdownProps {
  secondsUntilRefresh: number;
  totalSeconds: number;
  lastUpdated: Date | null;
}

export function RefreshCountdown({
  secondsUntilRefresh,
  totalSeconds,
  lastUpdated,
}: RefreshCountdownProps) {
  const { t } = useLanguage();
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
            {lastUpdated.toLocaleTimeString("es-AR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}
      </div>
      <div className="h-1 w-full rounded-full bg-gray-800 overflow-hidden">
        <div
          className="h-full rounded-full bg-blue-500 transition-all duration-1000"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
