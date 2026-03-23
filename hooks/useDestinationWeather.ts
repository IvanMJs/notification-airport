"use client";

import { useState, useEffect, useRef } from "react";
import { AIRPORTS } from "@/lib/airports";

export interface WeatherForecast {
  date: string;          // YYYY-MM-DD
  tempMaxC: number;
  tempMinC: number;
  precipitationMm: number;
  windKph: number;
  conditionCode: number; // WMO weather code
  conditionLabel: string;
  conditionEmoji: string;
}

const WMO_DAILY: Record<number, { es: string; en: string; emoji: string }> = {
  0:  { es: "Soleado",              en: "Sunny",              emoji: "☀️" },
  1:  { es: "Mayormente despejado", en: "Mainly clear",       emoji: "🌤️" },
  2:  { es: "Parcialmente nublado", en: "Partly cloudy",      emoji: "⛅" },
  3:  { es: "Nublado",              en: "Overcast",           emoji: "☁️" },
  45: { es: "Niebla",               en: "Fog",                emoji: "🌫️" },
  48: { es: "Niebla con escarcha",  en: "Rime fog",           emoji: "🌫️" },
  51: { es: "Llovizna leve",        en: "Light drizzle",      emoji: "🌦️" },
  53: { es: "Llovizna moderada",    en: "Drizzle",            emoji: "🌦️" },
  55: { es: "Llovizna intensa",     en: "Dense drizzle",      emoji: "🌧️" },
  61: { es: "Lluvia leve",          en: "Light rain",         emoji: "🌧️" },
  63: { es: "Lluvia moderada",      en: "Rain",               emoji: "🌧️" },
  65: { es: "Lluvia intensa",       en: "Heavy rain",         emoji: "🌧️" },
  71: { es: "Nevada leve",          en: "Light snow",         emoji: "🌨️" },
  73: { es: "Nevada moderada",      en: "Snow",               emoji: "🌨️" },
  75: { es: "Nevada intensa",       en: "Heavy snow",         emoji: "❄️" },
  77: { es: "Granizo fino",         en: "Snow grains",        emoji: "🌨️" },
  80: { es: "Chubascos leves",      en: "Light showers",      emoji: "🌦️" },
  81: { es: "Chubascos moderados",  en: "Showers",            emoji: "🌧️" },
  82: { es: "Chubascos fuertes",    en: "Heavy showers",      emoji: "⛈️" },
  85: { es: "Chubascos de nieve",   en: "Snow showers",       emoji: "🌨️" },
  86: { es: "Nevada fuerte",        en: "Heavy snow showers", emoji: "❄️" },
  95: { es: "Tormenta",             en: "Thunderstorm",       emoji: "⛈️" },
  96: { es: "Tormenta con granizo", en: "Thunderstorm/hail",  emoji: "⛈️" },
  99: { es: "Tormenta fuerte",      en: "Severe thunderstorm",emoji: "⛈️" },
};

function getConditionInfo(code: number, locale: "es" | "en"): { label: string; emoji: string } {
  const entry = WMO_DAILY[code] ?? WMO_DAILY[0]!;
  return { label: entry[locale], emoji: entry.emoji };
}

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface CacheEntry {
  forecast: WeatherForecast;
  timestamp: number;
}

// Module-level cache — persists across hook instances for the session
const forecastCache: Record<string, CacheEntry> = {};

function cacheKey(iata: string, date: string): string {
  return `${iata}:${date}`;
}

interface OpenMeteoDaily {
  time: string[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  precipitation_sum: number[];
  windspeed_10m_max: number[];
  weathercode: number[];
}

interface OpenMeteoResponse {
  daily?: OpenMeteoDaily;
}

export function useDestinationWeather(
  airportIata: string,
  isoDate: string,
  locale: "es" | "en" = "en",
  enabled = true,
): { forecast: WeatherForecast | null; loading: boolean; error: string | null } {
  const [forecast, setForecast] = useState<WeatherForecast | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!enabled || !airportIata || !isoDate) return;

    const airport = AIRPORTS[airportIata];
    if (!airport) return;

    // Only show for flights within next 7 days
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const flightDate = new Date(`${isoDate}T00:00:00`);
    const diffMs = flightDate.getTime() - today.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    if (diffDays < 0 || diffDays > 7) return;

    const key = cacheKey(airportIata, isoDate);
    const cached = forecastCache[key];
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      // Refresh label in case locale changed
      const { label, emoji } = getConditionInfo(cached.forecast.conditionCode, locale);
      setForecast({ ...cached.forecast, conditionLabel: label, conditionEmoji: emoji });
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);

    const { lat, lng } = airport;
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lat}&longitude=${lng}` +
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,weathercode` +
      `&timezone=auto` +
      `&start_date=${isoDate}&end_date=${isoDate}`;

    fetch(url, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`Open-Meteo returned ${res.status}`);
        return res.json() as Promise<OpenMeteoResponse>;
      })
      .then((json) => {
        const daily = json.daily;
        if (!daily || daily.time.length === 0) {
          setForecast(null);
          return;
        }
        const code = daily.weathercode[0] ?? 0;
        const { label, emoji } = getConditionInfo(code, locale);
        const result: WeatherForecast = {
          date: isoDate,
          tempMaxC: Math.round(daily.temperature_2m_max[0] ?? 0),
          tempMinC: Math.round(daily.temperature_2m_min[0] ?? 0),
          precipitationMm: Math.round((daily.precipitation_sum[0] ?? 0) * 10) / 10,
          windKph: Math.round(daily.windspeed_10m_max[0] ?? 0),
          conditionCode: code,
          conditionLabel: label,
          conditionEmoji: emoji,
        };
        forecastCache[key] = { forecast: result, timestamp: Date.now() };
        setForecast(result);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setError("unavailable");
      })
      .finally(() => {
        setLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [airportIata, isoDate, locale, enabled]);

  return { forecast, loading, error };
}
