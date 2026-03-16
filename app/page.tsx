"use client";

import { useState, useEffect } from "react";
import { Toaster } from "react-hot-toast";
import { RefreshCw, Plane } from "lucide-react";
import { useAirportStatus } from "@/hooks/useAirportStatus";
import { AirportCard } from "@/components/AirportCard";
import { AirportSearch } from "@/components/AirportSearch";
import { GlobalStatusBar } from "@/components/GlobalStatusBar";
import { RefreshCountdown } from "@/components/RefreshCountdown";
import { MyFlightsPanel } from "@/components/MyFlightsPanel";
import { FlightSearch } from "@/components/FlightSearch";
import { DEFAULT_AIRPORTS } from "@/lib/airports";
import { DelayStatus } from "@/lib/types";
import { useLanguage } from "@/contexts/LanguageContext";
import { Locale } from "@/lib/i18n";

const SEVERITY_ORDER: Record<DelayStatus, number> = {
  closure: 0,
  ground_stop: 1,
  ground_delay: 2,
  delay_severe: 3,
  delay_moderate: 4,
  delay_minor: 5,
  ok: 6,
  unknown: 7,
};

const REFRESH_OPTIONS = [5, 10, 15, 30];

const STORAGE_KEY = "airport-monitor-watched";

function loadWatched(): string[] {
  if (typeof window === "undefined") return DEFAULT_AIRPORTS;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_AIRPORTS;
  } catch {
    return DEFAULT_AIRPORTS;
  }
}

export default function HomePage() {
  const { t, locale, setLocale } = useLanguage();
  const [activeTab, setActiveTab] = useState<"airports" | "flights" | "search">("airports");
  const [refreshInterval, setRefreshInterval] = useState(5);
  const [watchedAirports, setWatchedAirports] = useState<string[]>(DEFAULT_AIRPORTS);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setWatchedAirports(loadWatched());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(watchedAirports));
    }
  }, [watchedAirports, mounted]);

  const {
    statusMap,
    loading,
    error,
    lastUpdated,
    secondsUntilRefresh,
    totalSeconds,
    refresh,
  } = useAirportStatus(refreshInterval);

  function addAirport(iata: string) {
    setWatchedAirports((prev) => [...prev, iata]);
  }

  function removeAirport(iata: string) {
    setWatchedAirports((prev) => prev.filter((a) => a !== iata));
  }

  const sortedAirports = [...watchedAirports].sort((a, b) => {
    const sa = statusMap[a]?.status ?? "ok";
    const sb = statusMap[b]?.status ?? "ok";
    return (SEVERITY_ORDER[sa] ?? 7) - (SEVERITY_ORDER[sb] ?? 7);
  });

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#1f2937",
            color: "#f3f4f6",
            border: "1px solid #374151",
          },
        }}
      />

      <div className="min-h-screen bg-gray-950 px-4 py-6">
        <div className="mx-auto max-w-6xl space-y-6">

          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="flex items-center gap-3 text-3xl font-black tracking-tight text-white">
                <Plane className="h-8 w-8 text-blue-400" />
                {t.appTitle}
              </h1>
              <p className="mt-1 text-sm text-gray-500">{t.appSubtitle}</p>
            </div>

            <div className="flex flex-col gap-3 items-end">
              {/* Language selector + controls */}
              <div className="flex items-center gap-2">
                {/* Language toggle */}
                <div className="flex rounded-lg border border-gray-700 overflow-hidden text-xs font-semibold">
                  {(["es", "en"] as Locale[]).map((l) => (
                    <button
                      key={l}
                      onClick={() => setLocale(l)}
                      className={`px-3 py-1.5 transition-colors ${
                        locale === l
                          ? "bg-blue-600 text-white"
                          : "bg-gray-900 text-gray-400 hover:text-gray-200"
                      }`}
                    >
                      {l.toUpperCase()}
                    </button>
                  ))}
                </div>

                <span className="text-xs text-gray-500">{t.autoRefresh}</span>
                <select
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(Number(e.target.value))}
                  className="rounded-md border border-gray-700 bg-gray-900 px-2 py-1 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {REFRESH_OPTIONS.map((min) => (
                    <option key={min} value={min}>{min} min</option>
                  ))}
                </select>
                <button
                  onClick={refresh}
                  disabled={loading}
                  className="flex items-center gap-1.5 rounded-md border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                  {loading ? t.updating : t.update}
                </button>
              </div>

              <RefreshCountdown
                secondsUntilRefresh={secondsUntilRefresh}
                totalSeconds={totalSeconds}
                lastUpdated={lastUpdated}
              />
            </div>
          </div>

          {/* Global Status Bar */}
          <GlobalStatusBar
            statusMap={statusMap}
            watchedAirports={watchedAirports}
          />

          {/* Error banner */}
          {error && (
            <div className="rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-400">
              ⚠️ {t.errorFAA} {error}
            </div>
          )}

          {/* Tabs */}
          <div className="border-b border-gray-800">
            <div className="flex gap-1">
              {([
                { id: "airports", label: t.tabAirports },
                { id: "flights",  label: t.tabFlights  },
                { id: "search",   label: locale === "en" ? "🔍 Flight search" : "🔍 Buscar vuelo" },
              ] as const).map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                    activeTab === id
                      ? "border-blue-500 text-blue-400"
                      : "border-transparent text-gray-500 hover:text-gray-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab: Aeropuertos */}
          {activeTab === "airports" && (
            <div>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {sortedAirports.map((iata) => (
                  <AirportCard
                    key={iata}
                    iata={iata}
                    status={statusMap[iata]}
                    onRemove={() => removeAirport(iata)}
                  />
                ))}
                <AirportSearch
                  watchedAirports={watchedAirports}
                  onAdd={addAirport}
                />
              </div>

              {/* Leyenda */}
              <div className="mt-6 flex flex-wrap gap-3 text-xs text-gray-600">
                {(t.legend as string[]).map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            </div>
          )}

          {/* Tab: Vuelos */}
          {activeTab === "flights" && (
            <MyFlightsPanel statusMap={statusMap} />
          )}

          {/* Tab: Buscar vuelo */}
          {activeTab === "search" && (
            <FlightSearch statusMap={statusMap} />
          )}

          {/* Footer */}
          <div className="pt-4 border-t border-gray-900 text-center text-xs text-gray-700">
            {t.footer}
          </div>
        </div>
      </div>
    </>
  );
}
