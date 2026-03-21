"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { Locale, translations, Translations } from "@/lib/i18n";
import { createClient } from "@/utils/supabase/client";

interface LanguageContextValue {
  locale: Locale;
  t: Translations;
  setLocale: (l: Locale) => void;
}

const LanguageContext = createContext<LanguageContextValue>({
  locale: "es",
  t: translations.es,
  setLocale: () => {},
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("es");

  useEffect(() => {
    async function load() {
      const saved = localStorage.getItem("airport-monitor-locale") as Locale | null;
      if (saved === "es" || saved === "en") {
        setLocaleState(saved);
        return;
      }
      // Fresh device: read locale from auth metadata (set by previous device/session)
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      const meta = data?.user?.user_metadata?.locale as Locale | undefined;
      if (meta === "es" || meta === "en") {
        setLocaleState(meta);
        localStorage.setItem("airport-monitor-locale", meta);
      }
    }
    load();
  }, []);

  async function setLocale(l: Locale) {
    setLocaleState(l);
    localStorage.setItem("airport-monitor-locale", l);
    // Persist in auth metadata so the cron sends notifications in the right language
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ data: { locale: l } });
    if (error) {
      // Retry once after 3 seconds (handles transient network errors)
      setTimeout(() => {
        supabase.auth.updateUser({ data: { locale: l } }).catch(() => {});
      }, 3000);
    }
  }

  return (
    <LanguageContext.Provider value={{ locale, t: translations[locale], setLocale }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
