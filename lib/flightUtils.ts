// Shared flight utilities used by FlightSearch and TripPanel

export const AIRLINES: Record<string, { name: string; icao: string }> = {
  // US Majors
  AA:  { name: "American Airlines",      icao: "AAL" }, AAL: { name: "American Airlines",      icao: "AAL" },
  DL:  { name: "Delta Air Lines",        icao: "DAL" }, DAL: { name: "Delta Air Lines",        icao: "DAL" },
  UA:  { name: "United Airlines",        icao: "UAL" }, UAL: { name: "United Airlines",        icao: "UAL" },
  B6:  { name: "JetBlue Airways",        icao: "JBU" }, JBU: { name: "JetBlue Airways",        icao: "JBU" },
  WN:  { name: "Southwest Airlines",     icao: "SWA" }, SWA: { name: "Southwest Airlines",     icao: "SWA" },
  AS:  { name: "Alaska Airlines",        icao: "ASA" }, ASA: { name: "Alaska Airlines",        icao: "ASA" },
  NK:  { name: "Spirit Airlines",        icao: "NKS" }, NKS: { name: "Spirit Airlines",        icao: "NKS" },
  F9:  { name: "Frontier Airlines",      icao: "FFT" }, FFT: { name: "Frontier Airlines",      icao: "FFT" },
  HA:  { name: "Hawaiian Airlines",      icao: "HAL" }, HAL: { name: "Hawaiian Airlines",      icao: "HAL" },
  G4:  { name: "Allegiant Air",          icao: "AAY" }, AAY: { name: "Allegiant Air",          icao: "AAY" },
  // US Regionals
  "9E": { name: "Endeavor Air",          icao: "EDV" }, EDV: { name: "Endeavor Air",           icao: "EDV" },
  OH:  { name: "PSA Airlines",           icao: "JIA" }, JIA: { name: "PSA Airlines",           icao: "JIA" },
  YX:  { name: "Republic Airways",       icao: "RPA" }, RPA: { name: "Republic Airways",       icao: "RPA" },
  MQ:  { name: "Envoy Air",              icao: "ENY" }, ENY: { name: "Envoy Air",              icao: "ENY" },
  OO:  { name: "SkyWest Airlines",       icao: "SKW" }, SKW: { name: "SkyWest Airlines",       icao: "SKW" },
  YV:  { name: "Mesa Airlines",          icao: "ASH" }, ASH: { name: "Mesa Airlines",          icao: "ASH" },
  CP:  { name: "Compass Airlines",       icao: "CPZ" }, CPZ: { name: "Compass Airlines",       icao: "CPZ" },
  // Latin America
  AC:  { name: "Air Canada",             icao: "ACA" }, ACA: { name: "Air Canada",             icao: "ACA" },
  AM:  { name: "Aeroméxico",             icao: "AMX" }, AMX: { name: "Aeroméxico",             icao: "AMX" },
  AR:  { name: "Aerolíneas Argentinas",  icao: "ARG" }, ARG: { name: "Aerolíneas Argentinas",  icao: "ARG" },
  LA:  { name: "LATAM Airlines",         icao: "LAN" }, LAN: { name: "LATAM Airlines",         icao: "LAN" },
  CM:  { name: "Copa Airlines",          icao: "CMP" }, CMP: { name: "Copa Airlines",          icao: "CMP" },
  AV:  { name: "Avianca",                icao: "AVA" }, AVA: { name: "Avianca",                icao: "AVA" },
  // Europe
  IB:  { name: "Iberia",                 icao: "IBE" }, IBE: { name: "Iberia",                 icao: "IBE" },
  BA:  { name: "British Airways",        icao: "BAW" }, BAW: { name: "British Airways",        icao: "BAW" },
  LH:  { name: "Lufthansa",              icao: "DLH" }, DLH: { name: "Lufthansa",              icao: "DLH" },
  AF:  { name: "Air France",             icao: "AFR" }, AFR: { name: "Air France",             icao: "AFR" },
  KL:  { name: "KLM",                    icao: "KLM" },
  // Middle East / Asia
  EK:  { name: "Emirates",               icao: "UAE" }, UAE: { name: "Emirates",               icao: "UAE" },
  QR:  { name: "Qatar Airways",          icao: "QTR" }, QTR: { name: "Qatar Airways",          icao: "QTR" },
  TK:  { name: "Turkish Airlines",       icao: "THY" }, THY: { name: "Turkish Airlines",       icao: "THY" },
};

export interface ParsedFlight {
  airlineCode: string;
  airlineName: string;
  airlineIcao: string;
  flightNumber: string;
  fullCode: string;        // "AA 900"
  flightAwareUrl: string;
}

export function parseFlightCode(input: string): ParsedFlight | null {
  const clean = input.trim().toUpperCase().replace(/\s+/g, "");

  // Try ICAO 3-letter first (EDV5068), then IATA 2-char (AA900, B6766, 9E5068)
  const match =
    clean.match(/^([A-Z]{3})(\d{1,5})$/) ||
    clean.match(/^([A-Z0-9]{2})(\d{1,5})$/);
  if (!match) return null;

  const [, airlineCode, num] = match;
  const airline = AIRLINES[airlineCode];
  if (!airline) return null;

  return {
    airlineCode,
    airlineName: airline.name,
    airlineIcao: airline.icao,
    flightNumber: num,
    fullCode: `${airlineCode} ${num}`,
    flightAwareUrl: `https://www.flightaware.com/live/flight/${airline.icao}${num}`,
  };
}

/**
 * Subtract decimal hours from an HH:MM string.
 * subtractHours("20:30", 3)   → "17:30"
 * subtractHours("12:55", 1.5) → "11:25"
 * Handles crossing midnight (modular arithmetic).
 */
export function subtractHours(timeStr: string, hours: number): string {
  const [h, m] = timeStr.split(":").map(Number);
  const totalMins = h * 60 + m - Math.round(hours * 60);
  const adjusted = ((totalMins % 1440) + 1440) % 1440;
  return `${Math.floor(adjusted / 60).toString().padStart(2, "0")}:${(adjusted % 60).toString().padStart(2, "0")}`;
}

/**
 * Human-readable arrival buffer note.
 * buildArrivalNote(1.5, "es") → "1.5 hs antes"
 * buildArrivalNote(3, "en")   → "3 hrs before"
 */
export function buildArrivalNote(buffer: number, locale: "es" | "en"): string {
  const str = Number.isInteger(buffer) ? `${buffer}` : `${buffer}`;
  return locale === "es" ? `${str} hs antes` : `${str} hrs before`;
}
