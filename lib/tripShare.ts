import { TripFlight } from "./types";

export interface WhatsAppFlight {
  flightCode:      string;
  airlineName:     string;
  originCode:      string;
  originCity:      string;
  destinationCode: string;
  destinationCity: string;
  isoDate:         string;
  departureTime?:  string;
  arrivalBuffer?:  number;
  arrivalRec?:     string; // pre-computed "17:30" string
}

function formatWADate(isoDate: string, locale: "es" | "en"): string {
  const d = new Date(isoDate + "T00:00:00");
  return d.toLocaleDateString(locale === "en" ? "en-US" : "es-AR", {
    weekday: "long", day: "numeric", month: "short",
  });
}

// Unicode escapes avoid Windows filesystem encoding issues with emoji literals
const E = {
  plane:    "\u2708\uFE0F",  // ✈️
  calendar: "\uD83D\uDCC5",  // 📅
  clock:    "\uD83D\uDD50",  // 🕐
  pin:      "\uD83D\uDCCD",  // 📍
};

export function buildWhatsAppMessage(
  tripName: string,
  flights: WhatsAppFlight[],
  locale: "es" | "en",
): string {
  const sorted = [...flights].sort((a, b) => a.isoDate.localeCompare(b.isoDate));

  const lines: string[] = [
    `${E.plane} *${tripName}*`,
    "",
  ];

  for (const f of sorted) {
    lines.push(`${E.calendar} *${formatWADate(f.isoDate, locale)}*`);
    lines.push(`*${f.flightCode}* · ${f.airlineName}`);
    lines.push(`${f.originCode} \u2192 ${f.destinationCode}  ·  ${f.originCity} \u2192 ${f.destinationCity}`);
    if (f.departureTime) {
      lines.push(locale === "en"
        ? `${E.clock} Dep: *${f.departureTime}*`
        : `${E.clock} Sale: *${f.departureTime}*`);
    }
    if (f.arrivalRec) {
      lines.push(locale === "en"
        ? `${E.pin} Arrive at airport by: *${f.arrivalRec}*`
        : `${E.pin} Llegar al aeropuerto: *${f.arrivalRec}*`);
    }
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}

export function buildWhatsAppURL(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export function encodeTripFlights(flights: TripFlight[]): string {
  try {
    return btoa(encodeURIComponent(JSON.stringify(flights)));
  } catch {
    return "";
  }
}

export function decodeTripFlights(encoded: string): TripFlight[] | null {
  try {
    return JSON.parse(decodeURIComponent(atob(encoded))) as TripFlight[];
  } catch {
    return null;
  }
}

export function buildShareURL(tripName: string, flights: TripFlight[]): string {
  const encoded = encodeTripFlights(flights);
  const base = typeof window !== "undefined" ? window.location.origin : "";
  const params = new URLSearchParams({ share: encoded, name: tripName });
  return `${base}?${params.toString()}`;
}

export function copyToClipboard(text: string): Promise<boolean> {
  return navigator.clipboard.writeText(text)
    .then(() => true)
    .catch(() => false);
}
