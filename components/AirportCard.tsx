"use client";

import { AirportStatus } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";
import { cn } from "@/lib/utils";
import { X, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { AIRPORTS } from "@/lib/airports";
import { useLanguage } from "@/contexts/LanguageContext";
import { WeatherData } from "@/hooks/useWeather";

interface AirportCardProps {
  iata: string;
  status?: AirportStatus;
  onRemove?: () => void;
  weather?: WeatherData;
  highlight?: boolean;
}

const BORDER_COLOR: Record<string, string> = {
  ok:             "border-green-500/40",
  delay_minor:    "border-yellow-500/60",
  delay_moderate: "border-orange-500/60",
  delay_severe:   "border-red-500/70",
  ground_delay:   "border-red-600/80",
  ground_stop:    "border-red-700 animate-pulse",
  closure:        "border-gray-500/60",
  unknown:        "border-gray-700",
};

const BG_COLOR: Record<string, string> = {
  ok:             "bg-green-900/10",
  delay_minor:    "bg-yellow-900/10",
  delay_moderate: "bg-orange-900/15",
  delay_severe:   "bg-red-900/20",
  ground_delay:   "bg-red-900/25",
  ground_stop:    "bg-red-950/40",
  closure:        "bg-gray-900/40",
  unknown:        "bg-gray-900/20",
};

// All translations of "increasing/worsening" and "decreasing/improving" trends
const TREND_UP   = new Set(["Increasing", "Aumentando", "Worsening", "Empeorando"]);
const TREND_DOWN = new Set(["Decreasing", "Disminuyendo", "Improving", "Mejorando"]);

function TrendIcon({ trend }: { trend?: string }) {
  if (!trend) return null;
  if (TREND_UP.has(trend))   return <TrendingUp className="h-3.5 w-3.5 text-red-400 inline" />;
  if (TREND_DOWN.has(trend)) return <TrendingDown className="h-3.5 w-3.5 text-green-400 inline" />;
  return <Minus className="h-3.5 w-3.5 text-yellow-400 inline" />;
}

export function AirportCard({ iata, status, onRemove, weather, highlight }: AirportCardProps) {
  const { t, locale } = useLanguage();
  const s = status?.status ?? "ok";
  const info = AIRPORTS[iata];
  const name  = status?.name  || info?.name  || iata;
  const city  = status?.city  || info?.city  || "";
  const state = status?.state || info?.state || "";

  return (
    <div
      className={cn(
        "relative rounded-xl border-2 p-4 transition-all duration-300",
        BORDER_COLOR[s] ?? BORDER_COLOR.unknown,
        BG_COLOR[s]     ?? BG_COLOR.unknown,
        highlight && "animate-highlight-flash"
      )}
    >
      {onRemove && (
        <button
          onClick={onRemove}
          className="absolute right-2 top-2 rounded-full p-1 text-gray-500 hover:bg-gray-700/50 hover:text-gray-300 transition-colors"
          aria-label={`Remove ${iata}`}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}

      <div className="mb-3 pr-6">
        <span className="block text-4xl font-black tracking-tight text-white">{iata}</span>
        <span className="text-xs text-gray-400 leading-tight">
          {name}
          {city && state ? ` · ${city}, ${state}` : city ? ` · ${city}` : ""}
        </span>
      </div>

      <StatusBadge status={s} className="mb-3" />

      {s === "ok" && (
        <p className="text-xs text-green-400/80">{t.noDelaysReported}</p>
      )}

      {weather && (
        <div className="mt-2 flex items-center gap-2 text-xs text-gray-300">
          <span className="text-base leading-none">{weather.icon}</span>
          <span className="font-medium">{weather.temperature}°C</span>
          <span className="text-gray-500">{weather.description}</span>
        </div>
      )}

      {status?.delays && (
        <div className="mt-2 space-y-1 text-xs text-gray-300">
          <p>
            <span className="text-gray-500">{t.delay}:</span>{" "}
            <span className="font-medium">
              {status.delays.minMinutes ?? "?"}–{status.delays.maxMinutes ?? "?"} min
            </span>{" "}
            <TrendIcon trend={status.delays.trend} />
          </p>
          <p><span className="text-gray-500">{t.cause}:</span> {status.delays.reason}</p>
          {status.delays.type !== "both" && (
            <p>
              <span className="text-gray-500">{t.affects}:</span>{" "}
              {status.delays.type === "departure" ? t.departures : t.arrivals}
            </p>
          )}
          {status.delays.trend && (
            <p><span className="text-gray-500">{t.trend}:</span> {status.delays.trend}</p>
          )}
        </div>
      )}

      {status?.groundStop && (
        <div className="mt-2 space-y-1 text-xs text-red-300">
          <p>
            <span className="font-bold">🛑 {t.groundStop}</span>{" "}
            {t.until} {status.groundStop.endTime ?? t.indefinite}
          </p>
          <p><span className="text-red-400/70">{t.cause}:</span> {status.groundStop.reason}</p>
        </div>
      )}

      {status?.groundDelay && (
        <div className="mt-2 space-y-1 text-xs text-red-300">
          <p className="font-bold">{t.groundDelayProgram}</p>
          <p>
            {t.average}: <span className="font-medium">{status.groundDelay.avgMinutes} min</span>
            {" · "}{t.max}: {status.groundDelay.maxTime}
          </p>
          <p><span className="text-red-400/70">{t.cause}:</span> {status.groundDelay.reason}</p>
        </div>
      )}

      {status?.closure && (
        <div className="mt-2 space-y-1 text-xs text-gray-300">
          <p className="font-bold text-gray-200">⛔ {t.airportClosed}</p>
          <p><span className="text-gray-500">{t.cause}:</span> {status.closure.reason}</p>
        </div>
      )}

      {status?.lastChecked && (
        <p className="mt-3 text-[10px] text-gray-600">
          {t.updated}:{" "}
          {status.lastChecked.toLocaleTimeString(locale === "en" ? "en-US" : "es-AR", { hour: "2-digit", minute: "2-digit" })}
        </p>
      )}
    </div>
  );
}
