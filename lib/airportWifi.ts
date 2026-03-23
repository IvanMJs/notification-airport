// Known airports with free public Wi-Fi
const WIFI_AIRPORTS = new Set([
  "LAX", "JFK", "ORD", "LHR", "CDG", "EZE", "GRU", "MAD", "BCN",
  "DFW", "ATL", "SFO", "MIA", "BOS", "SEA",
]);

export function hasAirportWifi(iata: string): boolean {
  return WIFI_AIRPORTS.has(iata.toUpperCase());
}

const AIRPORT_WEBSITES: Record<string, string> = {
  LAX: "https://www.flylax.com",
  JFK: "https://www.jfkairport.com",
  MIA: "https://www.miami-airport.com",
  EZE: "https://www.aeropuertos.com.ar",
  GRU: "https://www.gru.com.br",
  LHR: "https://www.heathrow.com",
  CDG: "https://www.parisaeroport.fr",
  MAD: "https://www.aeropuertomadrid-barajas.com",
  BCN: "https://www.aena.es/es/barcelona-el-prat.html",
  ORD: "https://www.flychicago.com/ohare",
};

export function getAirportWebsite(iata: string): string | null {
  return AIRPORT_WEBSITES[iata.toUpperCase()] ?? null;
}
