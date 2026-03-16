"use client";

import { useState, useRef, useEffect } from "react";
import { AIRPORTS } from "@/lib/airports";
import { Plus, Search } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface AirportSearchProps {
  watchedAirports: string[];
  onAdd: (iata: string) => void;
}

export function AirportSearch({ watchedAirports, onAdd }: AirportSearchProps) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const available = Object.entries(AIRPORTS)
    .filter(([code]) => !watchedAirports.includes(code))
    .filter(([code, info]) => {
      const q = query.toLowerCase();
      return (
        code.toLowerCase().includes(q) ||
        info.name.toLowerCase().includes(q) ||
        info.city.toLowerCase().includes(q)
      );
    })
    .slice(0, 8);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleAdd(iata: string) {
    onAdd(iata);
    setQuery("");
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg border border-dashed border-gray-600 px-4 py-3 text-sm text-gray-400 hover:border-gray-400 hover:text-gray-200 transition-colors h-full min-h-[120px] w-full justify-center"
      >
        <Plus className="h-5 w-5" />
        {t.addAirport}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-72 rounded-xl border border-gray-700 bg-gray-900 shadow-2xl">
          <div className="flex items-center gap-2 border-b border-gray-700 p-3">
            <Search className="h-4 w-4 text-gray-500 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder={t.searchPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm text-gray-200 placeholder-gray-500 outline-none"
            />
          </div>
          <div className="max-h-64 overflow-y-auto">
            {available.length === 0 ? (
              <p className="p-4 text-center text-xs text-gray-500">{t.noResults}</p>
            ) : (
              available.map(([code, info]) => (
                <button
                  key={code}
                  onClick={() => handleAdd(code)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-800 transition-colors"
                >
                  <span className="w-12 font-bold text-white text-sm">{code}</span>
                  <span className="flex-1 text-xs text-gray-400 leading-tight">
                    {info.name}
                    <br />
                    <span className="text-gray-600">{info.city}, {info.state}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
