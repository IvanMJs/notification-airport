import { TripTab, TripFlight, Accommodation } from "@/lib/types";

export interface ItineraryPdfOptions {
  trip: TripTab;
  locale: "es" | "en";
}

function formatDate(isoDate: string, locale: "es" | "en"): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString(locale === "es" ? "es-AR" : "en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function flightSection(flight: TripFlight, locale: "es" | "en", index: number): string {
  const label = locale === "es" ? "Vuelo" : "Flight";
  const dateLabel = locale === "es" ? "Fecha" : "Date";
  const depLabel = locale === "es" ? "Salida" : "Departure";
  const arrLabel = locale === "es" ? "Llegada" : "Arrival";
  const cabinLabel = locale === "es" ? "Cabina" : "Cabin";
  const upgradeLabel = locale === "es" ? "Upgrade solicitado" : "Upgrade requested";

  const cabinMap: Record<string, string> = {
    economy: locale === "es" ? "Económica" : "Economy",
    premium_economy: locale === "es" ? "Premium Economy" : "Premium Economy",
    business: "Business",
    first: locale === "es" ? "Primera" : "First",
  };

  const cabinDisplay = flight.cabinClass ? cabinMap[flight.cabinClass] ?? flight.cabinClass : "";

  const arrivalStr =
    flight.arrivalTime
      ? `${flight.arrivalTime}${flight.arrivalDate && flight.arrivalDate !== flight.isoDate ? ` (${formatDate(flight.arrivalDate, locale)})` : ""}`
      : "—";

  return `
    <div class="flight-card">
      <div class="flight-header">
        <span class="flight-num">${label} ${index + 1}</span>
        <span class="flight-code">${flight.flightCode}</span>
        <span class="airline">${flight.airlineName}</span>
      </div>
      <table class="detail-table">
        <tr>
          <td class="label">${dateLabel}</td>
          <td>${formatDate(flight.isoDate, locale)}</td>
        </tr>
        <tr>
          <td class="label">${depLabel}</td>
          <td><strong>${flight.originCode}</strong> ${flight.departureTime ? `· ${flight.departureTime}` : ""}</td>
        </tr>
        <tr>
          <td class="label">${arrLabel}</td>
          <td><strong>${flight.destinationCode}</strong> ${flight.arrivalTime ? `· ${arrivalStr}` : ""}</td>
        </tr>
        ${cabinDisplay ? `<tr><td class="label">${cabinLabel}</td><td>${cabinDisplay}${flight.wantsUpgrade ? ` <em>(${upgradeLabel})</em>` : ""}</td></tr>` : ""}
      </table>
    </div>
  `;
}

function accommodationSection(acc: Accommodation, locale: "es" | "en"): string {
  const checkInLabel = locale === "es" ? "Check-in" : "Check-in";
  const checkOutLabel = locale === "es" ? "Check-out" : "Check-out";
  const confirmLabel = locale === "es" ? "Código de confirmación" : "Confirmation code";
  const addressLabel = locale === "es" ? "Dirección" : "Address";

  const checkInStr = acc.checkInDate
    ? `${formatDate(acc.checkInDate, locale)}${acc.checkInTime ? ` · ${acc.checkInTime}` : ""}`
    : "—";

  const checkOutStr = acc.checkOutDate
    ? `${formatDate(acc.checkOutDate, locale)}${acc.checkOutTime ? ` · ${acc.checkOutTime}` : ""}`
    : "—";

  return `
    <div class="accommodation-card">
      <div class="section-icon">🏨</div>
      <div class="accommodation-name">${acc.name}</div>
      <table class="detail-table">
        <tr><td class="label">${checkInLabel}</td><td>${checkInStr}</td></tr>
        <tr><td class="label">${checkOutLabel}</td><td>${checkOutStr}</td></tr>
        ${acc.confirmationCode ? `<tr><td class="label">${confirmLabel}</td><td><code>${acc.confirmationCode}</code></td></tr>` : ""}
        ${acc.address ? `<tr><td class="label">${addressLabel}</td><td>${acc.address}</td></tr>` : ""}
      </table>
    </div>
  `;
}

// Returns an HTML string styled for print
export function generateItineraryHtml(opts: ItineraryPdfOptions): string {
  const { trip, locale } = opts;

  const title = locale === "es" ? "Itinerario de viaje" : "Travel Itinerary";
  const flightsTitle = locale === "es" ? "Vuelos" : "Flights";
  const accommodationsTitle = locale === "es" ? "Alojamientos" : "Accommodations";
  const noAccommodations = locale === "es" ? "Sin alojamientos registrados." : "No accommodations recorded.";
  const generatedLabel = locale === "es" ? "Generado con TripCopilot" : "Generated with TripCopilot";
  const printDate = new Date().toLocaleDateString(locale === "es" ? "es-AR" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const sorted = [...trip.flights].sort((a, b) => {
    const d = a.isoDate.localeCompare(b.isoDate);
    return d !== 0 ? d : (a.departureTime ?? "").localeCompare(b.departureTime ?? "");
  });

  const flightsHtml = sorted.map((f, i) => flightSection(f, locale, i)).join("");

  const accommodationsHtml =
    trip.accommodations.length === 0
      ? `<p class="empty-note">${noAccommodations}</p>`
      : trip.accommodations.map((acc) => accommodationSection(acc, locale)).join("");

  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} — ${trip.name}</title>
  <style>
    /* Base */
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: #111;
      background: #fff;
      padding: 32px;
      max-width: 800px;
      margin: 0 auto;
    }

    /* Header */
    .doc-header {
      border-bottom: 2px solid #111;
      padding-bottom: 16px;
      margin-bottom: 28px;
    }
    .doc-title {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #666;
      margin-bottom: 4px;
    }
    .trip-name {
      font-size: 26px;
      font-weight: 800;
      color: #111;
    }
    .print-date {
      font-size: 12px;
      color: #888;
      margin-top: 4px;
    }

    /* Section headers */
    .section-title {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #555;
      margin: 28px 0 12px;
      padding-bottom: 6px;
      border-bottom: 1px solid #e0e0e0;
    }

    /* Flight card */
    .flight-card {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 12px;
      page-break-inside: avoid;
    }
    .flight-header {
      display: flex;
      align-items: baseline;
      gap: 10px;
      margin-bottom: 10px;
    }
    .flight-num {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      color: #888;
    }
    .flight-code {
      font-size: 18px;
      font-weight: 800;
      color: #111;
    }
    .airline {
      font-size: 13px;
      color: #555;
    }

    /* Accommodation card */
    .accommodation-card {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 12px;
      page-break-inside: avoid;
    }
    .section-icon {
      font-size: 18px;
      margin-bottom: 4px;
    }
    .accommodation-name {
      font-size: 16px;
      font-weight: 700;
      color: #111;
      margin-bottom: 10px;
    }

    /* Detail table */
    .detail-table {
      width: 100%;
      border-collapse: collapse;
    }
    .detail-table tr td {
      padding: 3px 0;
      vertical-align: top;
    }
    .detail-table td.label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #888;
      width: 140px;
      padding-right: 12px;
    }
    code {
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
      background: #f4f4f4;
      padding: 1px 5px;
      border-radius: 3px;
      font-size: 12px;
    }

    /* Branding footer */
    .footer {
      margin-top: 40px;
      padding-top: 16px;
      border-top: 1px solid #e0e0e0;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .branding {
      font-size: 12px;
      color: #aaa;
    }
    .branding strong {
      color: #555;
    }

    .empty-note {
      font-size: 13px;
      color: #aaa;
      padding: 12px 0;
    }

    /* Print styles */
    @media print {
      body {
        padding: 20px;
        font-size: 12px;
      }
      .trip-name { font-size: 22px; }
      .flight-code { font-size: 16px; }
      .accommodation-name { font-size: 14px; }
      .flight-card,
      .accommodation-card {
        border: 1px solid #ccc;
        margin-bottom: 8px;
      }
      .section-title { margin-top: 20px; }
      .footer { margin-top: 28px; }

      /* Force black-on-white, no dark mode */
      * {
        color: #111 !important;
        background: #fff !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .doc-title, .print-date, .flight-num, .airline,
      .detail-table td.label, .section-title, .branding {
        color: #555 !important;
      }
      code {
        background: #f4f4f4 !important;
      }
    }
  </style>
</head>
<body>
  <div class="doc-header">
    <div class="doc-title">${title}</div>
    <div class="trip-name">${trip.name}</div>
    <div class="print-date">${printDate}</div>
  </div>

  <div class="section-title">${flightsTitle} (${sorted.length})</div>
  ${flightsHtml}

  <div class="section-title">${accommodationsTitle}</div>
  ${accommodationsHtml}

  <div class="footer">
    <div class="branding">${generatedLabel} &middot; <strong>TripCopilot</strong></div>
    <div class="branding">tripcopi.lot</div>
  </div>
</body>
</html>`;
}
