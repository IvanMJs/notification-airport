"use client";

import { useState } from "react";
import { Search, Compass, MapPin } from "lucide-react";
import { AIRPORTS } from "@/lib/airports";
import { TripTab } from "@/lib/types";

// Popular destinations with Unsplash photo URLs
const POPULAR_DESTINATIONS: {
  iata: string;
  city: string;
  country: string;
  photo: string;
}[] = [
  { iata: "MIA", city: "Miami",         country: "Estados Unidos", photo: "https://source.unsplash.com/400x300/?miami,beach"      },
  { iata: "CUN", city: "Cancún",        country: "México",         photo: "https://source.unsplash.com/400x300/?cancun,beach"     },
  { iata: "SCL", city: "Santiago",      country: "Chile",          photo: "https://source.unsplash.com/400x300/?santiago,chile"   },
  { iata: "BOG", city: "Bogotá",        country: "Colombia",       photo: "https://source.unsplash.com/400x300/?bogota,colombia"  },
  { iata: "GRU", city: "São Paulo",     country: "Brasil",         photo: "https://source.unsplash.com/400x300/?sao paulo,city"   },
  { iata: "LIM", city: "Lima",          country: "Perú",           photo: "https://source.unsplash.com/400x300/?lima,peru,travel" },
];

// Semana Santa / March seasonal inspiration
const SEASONAL_IDEAS: {
  iata: string;
  city: string;
  tag: string;
  description: string;
  photo: string;
}[] = [
  {
    iata: "MDZ",
    city: "Mendoza",
    tag: "Semana Santa",
    description: "Bodegas, montañas y los mejores vinos del mundo.",
    photo: "https://source.unsplash.com/400x300/?mendoza,wine,mountain",
  },
  {
    iata: "EZE",
    city: "Buenos Aires",
    tag: "Semana Santa",
    description: "Teatro, tango y gastronomía porteña sin igual.",
    photo: "https://source.unsplash.com/400x300/?buenos aires,city",
  },
  {
    iata: "MVD",
    city: "Montevideo",
    tag: "Semana Santa",
    description: "Playa, carnaval fuera de temporada y tranquilidad.",
    photo: "https://source.unsplash.com/400x300/?montevideo,uruguay",
  },
  {
    iata: "CTG",
    city: "Cartagena",
    tag: "Semana Santa",
    description: "Ciudad amurallada, playas caribeñas y calor tropical.",
    photo: "https://source.unsplash.com/400x300/?cartagena,colombia,caribbean",
  },
];

const CABIN_OPTIONS = [
  { value: "e", label: "Económica" },
  { value: "p", label: "Premium Economy" },
  { value: "b", label: "Business" },
  { value: "f", label: "Primera clase" },
];

// Map cabin value to Google Flights cabin code
const CABIN_MAP: Record<string, string> = {
  e: "e",
  p: "p",
  b: "b",
  f: "f",
};

interface Props {
  trips: TripTab[];
  locale: "es" | "en";
}

export function DiscoverView({ trips, locale }: Props) {
  const [origin, setOrigin]           = useState("");
  const [destination, setDestination] = useState("");
  const [date, setDate]               = useState("");
  const [cabin, setCabin]             = useState("e");

  // Derive user's most recent departure airport from their trips
  const recentOrigin: string = (() => {
    const allFlights = trips.flatMap((t) => t.flights);
    if (allFlights.length === 0) return "EZE";
    const sorted = [...allFlights].sort((a, b) =>
      b.isoDate.localeCompare(a.isoDate)
    );
    return sorted[0].originCode;
  })();

  const recentCity =
    AIRPORTS[recentOrigin]?.city ?? recentOrigin;

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!origin || !destination || !date) return;
    const cabinCode = CABIN_MAP[cabin] ?? "e";
    const url = `https://www.google.com/flights?hl=es#flt=${origin}.${destination}.${date};c:${cabinCode};e:1`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function openDestination(iata: string) {
    if (!date) {
      // Prefill destination and scroll to form
      setDestination(iata);
      document.getElementById("discover-form")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    const cabinCode = CABIN_MAP[cabin] ?? "e";
    const src = origin || recentOrigin;
    const url = `https://www.google.com/flights?hl=es#flt=${src}.${iata}.${date};c:${cabinCode};e:1`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  // All IATA codes for datalist
  const allIataCodes = Object.keys(AIRPORTS);

  return (
    <div className="space-y-8 pb-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-violet-500/20">
          <Compass className="w-5 h-5 text-violet-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">
            {locale === "es" ? "Explorar vuelos" : "Explore flights"}
          </h2>
          <p className="text-xs text-gray-500">
            {locale === "es"
              ? "Buscá destinos y abrí en Google Flights"
              : "Search destinations and open in Google Flights"}
          </p>
        </div>
      </div>

      {/* Search form */}
      <form
        id="discover-form"
        onSubmit={handleSearch}
        className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 space-y-4"
      >
        {/* Datalist for airport autocomplete */}
        <datalist id="airports-list">
          {allIataCodes.map((code) => (
            <option key={code} value={code}>
              {AIRPORTS[code].city} — {AIRPORTS[code].name}
            </option>
          ))}
        </datalist>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Origin */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {locale === "es" ? "Origen" : "Origin"}
            </label>
            <input
              type="text"
              list="airports-list"
              value={origin}
              onChange={(e) => setOrigin(e.target.value.toUpperCase())}
              placeholder={`${recentOrigin} (${recentCity})`}
              maxLength={3}
              className="w-full rounded-xl bg-white/[0.06] border border-white/[0.08] px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-violet-500/60 focus:border-violet-500/60 transition-colors"
            />
          </div>

          {/* Destination */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {locale === "es" ? "Destino" : "Destination"}
            </label>
            <input
              type="text"
              list="airports-list"
              value={destination}
              onChange={(e) => setDestination(e.target.value.toUpperCase())}
              placeholder="MIA, JFK, BCN..."
              maxLength={3}
              className="w-full rounded-xl bg-white/[0.06] border border-white/[0.08] px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-violet-500/60 focus:border-violet-500/60 transition-colors"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Date */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {locale === "es" ? "Fecha de salida" : "Departure date"}
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={new Date().toISOString().slice(0, 10)}
              className="w-full rounded-xl bg-white/[0.06] border border-white/[0.08] px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-violet-500/60 focus:border-violet-500/60 transition-colors [color-scheme:dark]"
            />
          </div>

          {/* Cabin class */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {locale === "es" ? "Cabina" : "Cabin class"}
            </label>
            <select
              value={cabin}
              onChange={(e) => setCabin(e.target.value)}
              className="w-full rounded-xl bg-white/[0.06] border border-white/[0.08] px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-violet-500/60 focus:border-violet-500/60 transition-colors"
            >
              {CABIN_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-gray-900">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={!origin || !destination || !date}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold py-3 text-sm transition-colors"
        >
          <Search className="w-4 h-4" />
          {locale === "es" ? "Buscar vuelos" : "Search flights"}
        </button>
      </form>

      {/* Popular destinations */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-violet-400" />
          <h3 className="text-sm font-bold text-white">
            {locale === "es"
              ? `Destinos populares desde ${recentCity}`
              : `Popular destinations from ${recentCity}`}
          </h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {POPULAR_DESTINATIONS.map((dest) => (
            <button
              key={dest.iata}
              onClick={() => openDestination(dest.iata)}
              className="group relative rounded-2xl overflow-hidden aspect-[4/3] text-left focus:outline-none focus:ring-2 focus:ring-violet-500/60"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={dest.photo}
                alt={dest.city}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <p className="text-sm font-bold text-white leading-tight">{dest.city}</p>
                <p className="text-xs text-gray-300 leading-tight">{dest.iata} · {dest.country}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Seasonal inspiration */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-base">✈</span>
          <h3 className="text-sm font-bold text-white">
            {locale === "es" ? "¿A dónde vas?" : "Where are you going?"}
          </h3>
          <span className="text-xs font-semibold text-amber-500 border border-amber-700/50 rounded px-1.5 py-0.5 ml-1">
            Semana Santa
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SEASONAL_IDEAS.map((idea) => (
            <button
              key={idea.iata}
              onClick={() => openDestination(idea.iata)}
              className="group relative rounded-2xl overflow-hidden text-left focus:outline-none focus:ring-2 focus:ring-violet-500/60"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={idea.photo}
                alt={idea.city}
                className="w-full h-32 object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <p className="text-sm font-bold text-white">{idea.city}</p>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-amber-400 border border-amber-700/40 rounded px-1 py-0.5">
                    {idea.tag}
                  </span>
                </div>
                <p className="text-xs text-gray-300 leading-snug">{idea.description}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

    </div>
  );
}
