"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "tripcopilot-device-tz";

async function showTimezoneNotification(
  tz: string,
  locale: "es" | "en" = "es"
) {
  if (!("Notification" in window) || Notification.permission !== "granted")
    return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const city = tz.split("/").pop()?.replace(/_/g, " ") ?? tz;

    const raw =
      new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        timeZoneName: "longOffset",
      })
        .formatToParts(new Date())
        .find((p) => p.type === "timeZoneName")?.value ?? "";

    const offset = raw
      .replace(/^GMT$/, "UTC")
      .replace(
        /^GMT([+-])0?(\d{1,2}):00$/,
        (_, s: string, h: string) => `UTC${s}${parseInt(h)}`
      )
      .replace(
        /^GMT([+-])0?(\d{1,2}):(\d{2})$/,
        (_, s: string, h: string, m: string) =>
          `UTC${s}${parseInt(h)}:${m}`
      )
      .replace(/^UTC[+-]0$/, "UTC");

    const title =
      locale === "en" ? "📍 Timezone detected" : "📍 Nuevo timezone detectado";
    const body =
      locale === "en"
        ? `You're in ${city} (${offset}). Open TripCopilot to view times in your local timezone.`
        : `Estás en ${city} (${offset}). Abrí TripCopilot para ver tus horarios en tu hora local.`;

    await reg.showNotification(title, {
      body,
      icon: "/icon.svg",
      badge: "/icon.svg",
      tag: "timezone-change",
      data: { url: "/app", type: "timezone-change" },
    });
  } catch {
    // Silently fail — in-app banner is the fallback
  }
}

export function useDeviceTimezone(locale: "es" | "en" = "es") {
  const [deviceTz, setDeviceTz] = useState<string>(() => {
    if (typeof window === "undefined") return "UTC";
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  });
  const [tzChanged, setTzChanged] = useState(false);

  useEffect(() => {
    const current = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && stored !== current) {
      setTzChanged(true);
      void showTimezoneNotification(current, locale);
    }
    localStorage.setItem(STORAGE_KEY, current);
    setDeviceTz(current);

    function onVisibilityChange() {
      if (document.visibilityState !== "visible") return;
      const newTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const prev = localStorage.getItem(STORAGE_KEY);
      if (newTz !== prev) {
        localStorage.setItem(STORAGE_KEY, newTz);
        setDeviceTz(newTz);
        setTzChanged(true);
        void showTimezoneNotification(newTz, locale);
      }
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [locale]);

  return {
    deviceTz,
    tzChanged,
    clearTzChanged: () => setTzChanged(false),
  };
}
