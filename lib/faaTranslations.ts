const REASON_MAP: Record<string, { es: string; en: string }> = {
  wind:                      { es: "viento",                    en: "wind" },
  winds:                     { es: "vientos",                   en: "winds" },
  "low ceilings":            { es: "techos bajos",              en: "low ceilings" },
  "low ceiling":             { es: "techo bajo",                en: "low ceiling" },
  thunderstorms:             { es: "tormentas eléctricas",      en: "thunderstorms" },
  thunderstorm:              { es: "tormenta eléctrica",        en: "thunderstorm" },
  weather:                   { es: "clima",                     en: "weather" },
  snow:                      { es: "nieve",                     en: "snow" },
  ice:                       { es: "hielo",                     en: "ice" },
  fog:                       { es: "niebla",                    en: "fog" },
  rain:                      { es: "lluvia",                    en: "rain" },
  hail:                      { es: "granizo",                   en: "hail" },
  tornado:                   { es: "tornado",                   en: "tornado" },
  hurricane:                 { es: "huracán",                   en: "hurricane" },
  "de-icing":                { es: "des-hielo de aeronaves",    en: "de-icing" },
  deicing:                   { es: "des-hielo de aeronaves",    en: "de-icing" },
  "winter weather":          { es: "clima invernal",            en: "winter weather" },
  "low visibility":          { es: "baja visibilidad",          en: "low visibility" },
  visibility:                { es: "visibilidad reducida",      en: "reduced visibility" },
  turbulence:                { es: "turbulencia",               en: "turbulence" },
  crosswind:                 { es: "viento cruzado",            en: "crosswind" },
  crosswinds:                { es: "vientos cruzados",          en: "crosswinds" },
  "strong winds":            { es: "vientos fuertes",           en: "strong winds" },
  microburst:                { es: "microburst",                en: "microburst" },
  volume:                    { es: "volumen de tráfico",        en: "traffic volume" },
  "traffic volume":          { es: "volumen de tráfico",        en: "traffic volume" },
  staffing:                  { es: "falta de personal",         en: "staffing" },
  "controller staffing":     { es: "falta de controladores",    en: "controller staffing" },
  equipment:                 { es: "equipo/aeronave",           en: "equipment" },
  "runway construction":     { es: "obras en pista",            en: "runway construction" },
  construction:              { es: "obras",                     en: "construction" },
  runway:                    { es: "pista",                     en: "runway" },
  "runway maintenance":      { es: "mantenimiento de pista",    en: "runway maintenance" },
  maintenance:               { es: "mantenimiento",             en: "maintenance" },
  "airport construction":    { es: "obras en aeropuerto",       en: "airport construction" },
  other:                     { es: "otros",                     en: "other" },
  unknown:                   { es: "desconocido",               en: "unknown" },
  security:                  { es: "seguridad",                 en: "security" },
  customs:                   { es: "aduana",                    en: "customs" },
  "weather / low ceilings":  { es: "clima / techos bajos",      en: "weather / low ceilings" },
  "weather / snow":          { es: "clima / nieve",             en: "weather / snow" },
  "weather / wind":          { es: "clima / viento",            en: "weather / wind" },
  "weather / thunderstorms": { es: "clima / tormentas",         en: "weather / thunderstorms" },
  "weather / fog":           { es: "clima / niebla",            en: "weather / fog" },
  "wx:thunderstorms":        { es: "tormentas eléctricas",      en: "thunderstorms" },
  "wx:wind":                 { es: "viento",                    en: "wind" },
  "wx:snow":                 { es: "nieve",                     en: "snow" },
  "wx:fog":                  { es: "niebla",                    en: "fog" },
  "wx:ice":                  { es: "hielo",                     en: "ice" },
  "wx:rain":                 { es: "lluvia",                    en: "rain" },
};

const TREND_MAP: Record<string, { es: string; en: string }> = {
  increasing: { es: "Aumentando",   en: "Increasing" },
  decreasing: { es: "Disminuyendo", en: "Decreasing" },
  holding:    { es: "Estable",      en: "Holding" },
  improving:  { es: "Mejorando",    en: "Improving" },
  worsening:  { es: "Empeorando",   en: "Worsening" },
};

export function translateReason(text: string, locale: "es" | "en" = "es"): string {
  if (!text) return text;
  const lower = text.toLowerCase().trim();

  const exact = REASON_MAP[lower];
  if (exact) return exact[locale];

  for (const [key, val] of Object.entries(REASON_MAP)) {
    if (lower.includes(key)) return val[locale];
  }

  if (text.startsWith("!")) {
    return locale === "en" ? "operational closure (see NOTAM)" : "cierre operativo (ver NOTAM)";
  }

  return text;
}

export function translateTrend(text: string, locale: "es" | "en" = "es"): string {
  if (!text) return text;
  const entry = TREND_MAP[text.toLowerCase()];
  return entry ? entry[locale] : text;
}
