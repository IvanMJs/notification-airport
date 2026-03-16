// Traducciones de términos técnicos que devuelve la FAA API en inglés
// Se aplican siempre (la app los muestra en español por defecto)

const REASON_MAP: Record<string, string> = {
  // Meteorología
  wind:                      "viento",
  winds:                     "vientos",
  "low ceilings":            "techos bajos",
  "low ceiling":             "techo bajo",
  thunderstorms:             "tormentas eléctricas",
  thunderstorm:              "tormenta eléctrica",
  weather:                   "clima",
  snow:                      "nieve",
  ice:                       "hielo",
  fog:                       "niebla",
  rain:                      "lluvia",
  hail:                      "granizo",
  tornado:                   "tornado",
  hurricane:                 "huracán",
  "de-icing":                "des-hielo de aeronaves",
  deicing:                   "des-hielo de aeronaves",
  "winter weather":          "clima invernal",
  "low visibility":          "baja visibilidad",
  visibility:                "visibilidad reducida",
  turbulence:                "turbulencia",
  crosswind:                 "viento cruzado",
  crosswinds:                "vientos cruzados",
  "strong winds":            "vientos fuertes",
  microburst:                "microburst",

  // Operaciones
  volume:                    "volumen de tráfico",
  "traffic volume":          "volumen de tráfico",
  staffing:                  "falta de personal",
  "controller staffing":     "falta de controladores",
  equipment:                 "equipo/aeronave",
  "runway construction":     "obras en pista",
  construction:              "obras",
  runway:                    "pista",
  "runway maintenance":      "mantenimiento de pista",
  maintenance:               "mantenimiento",
  "airport construction":    "obras en aeropuerto",
  other:                     "otros",
  unknown:                   "desconocido",
  "security":                "seguridad",
  "customs":                 "aduana",

  // Compuestos frecuentes de la FAA
  "weather / low ceilings":  "clima / techos bajos",
  "weather / snow":          "clima / nieve",
  "weather / wind":          "clima / viento",
  "weather / thunderstorms": "clima / tormentas",
  "weather / fog":           "clima / niebla",
  "wx:thunderstorms":        "tormentas eléctricas",
  "wx:wind":                 "viento",
  "wx:snow":                 "nieve",
  "wx:fog":                  "niebla",
  "wx:ice":                  "hielo",
  "wx:rain":                 "lluvia",
};

// Tendencias
const TREND_MAP: Record<string, string> = {
  increasing: "Aumentando",
  decreasing: "Disminuyendo",
  holding:    "Estable",
  improving:  "Mejorando",
  worsening:  "Empeorando",
};

export function translateReason(text: string): string {
  if (!text) return text;
  const lower = text.toLowerCase().trim();

  // Buscar match exacto
  if (REASON_MAP[lower]) return REASON_MAP[lower];

  // Buscar match parcial (el texto puede tener prefijos tipo "!EWR 03/...")
  for (const [key, val] of Object.entries(REASON_MAP)) {
    if (lower.includes(key)) return val;
  }

  // Si tiene formato de NOTAM (!EWR...), simplificar
  if (text.startsWith("!")) {
    return "cierre operativo (ver NOTAM)";
  }

  return text;
}

export function translateTrend(text: string): string {
  if (!text) return text;
  return TREND_MAP[text.toLowerCase()] ?? text;
}
