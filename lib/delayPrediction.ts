import { AirportStatusMap } from "./types";

// ── Public types ──────────────────────────────────────────────────────────────

export interface DelayFactor {
  type:
    | "faa_status"
    | "weather_origin"
    | "weather_destination"
    | "time_of_day"
    | "airport_congestion"
    | "day_of_week"
    | "season";
  signal: string;
  weight: number;
  severity: "low" | "medium" | "high";
}

export interface DelayPrediction {
  probability: number;
  confidence: "low" | "medium" | "high";
  riskLevel: "minimal" | "low" | "moderate" | "high" | "very_high";
  factors: DelayFactor[];
  estimatedDelayMinutes: number | null;
  recommendation: string;
}

// ── Weather input shape (Open-Meteo current data) ─────────────────────────────

export interface WeatherSignals {
  /** Visibility in miles */
  visibilityMiles?: number;
  /** Wind speed in knots */
  windSpeedKnots?: number;
  /** WMO weather code */
  weatherCode?: number;
}

// ── Flight input shape ────────────────────────────────────────────────────────

export interface FlightSignals {
  originCode: string;
  destinationCode: string;
  /** Local departure time — "HH:MM" */
  departureTime: string;
  /** ISO date string — "YYYY-MM-DD" */
  isoDate: string;
}

// ── Historical delay rates ────────────────────────────────────────────────────
// Source: FAA published aggregate delay statistics (OPSNET, 2019-2023 average)

const AIRPORT_DELAY_RATES: Record<string, number> = {
  EWR: 28,
  SFO: 26,
  JFK: 25,
  LGA: 24,
  ORD: 22,
  BOS: 20,
  PHL: 19,
  DCA: 18,
  IAD: 17,
  FLL: 17,
  MIA: 16,
  ATL: 15,
  DFW: 14,
  LAX: 14,
  DEN: 13,
  CLT: 12,
  SEA: 12,
  MSP: 11,
  DTW: 11,
  PHX: 10,
};

const DEFAULT_DELAY_RATE = 15;

// ── WMO weather code helpers ──────────────────────────────────────────────────

function isThunderstorm(code: number): boolean {
  return code >= 95 && code <= 99;
}

function isSnowOrFreezing(code: number): boolean {
  // Snow (71-77), snow showers (85-86), freezing drizzle (56-57)
  return (code >= 71 && code <= 77) || (code >= 85 && code <= 86) || code === 56 || code === 57;
}

function isHeavyRain(code: number): boolean {
  // Heavy rain (65), violent showers (82), heavy drizzle (55)
  return code === 65 || code === 82 || code === 55;
}

// ── FAA scoring ───────────────────────────────────────────────────────────────

interface FAAScore {
  points: number;
  factors: DelayFactor[];
}

function scoreFAAStatus(
  statusMap: AirportStatusMap | undefined,
  originCode: string,
  destinationCode: string,
  locale: "es" | "en",
): FAAScore {
  const factors: DelayFactor[] = [];
  let points = 0;

  if (!statusMap) return { points, factors };

  const originStatus = statusMap[originCode];
  const destStatus = statusMap[destinationCode];

  if (originStatus) {
    switch (originStatus.status) {
      case "closure": {
        points += 80;
        factors.push({
          type: "faa_status",
          signal:
            locale === "es"
              ? `${originCode}: Aeropuerto cerrado`
              : `${originCode}: Airport closed`,
          weight: 0.8,
          severity: "high",
        });
        break;
      }
      case "ground_stop": {
        points += 60;
        factors.push({
          type: "faa_status",
          signal:
            locale === "es"
              ? `${originCode}: Ground Stop activo`
              : `${originCode}: Ground Stop in effect`,
          weight: 0.6,
          severity: "high",
        });
        break;
      }
      case "ground_delay": {
        const avgMin = originStatus.groundDelay?.avgMinutes ?? 30;
        const bonus = avgMin >= 60 ? 50 : avgMin >= 30 ? 40 : 30;
        points += bonus;
        factors.push({
          type: "faa_status",
          signal:
            locale === "es"
              ? `${originCode}: Ground Delay ~${avgMin} min`
              : `${originCode}: Ground Delay ~${avgMin} min`,
          weight: bonus / 100,
          severity: avgMin >= 60 ? "high" : "medium",
        });
        break;
      }
      case "delay_severe":
      case "delay_moderate":
      case "delay_minor": {
        const maxMin = originStatus.delays?.maxMinutes ?? 20;
        const bonus = maxMin >= 60 ? 40 : maxMin >= 30 ? 30 : 20;
        points += bonus;
        const severity: DelayFactor["severity"] =
          maxMin >= 60 ? "high" : maxMin >= 30 ? "medium" : "low";
        const label =
          originStatus.status === "delay_severe"
            ? locale === "es"
              ? "Demora severa"
              : "Severe delay"
            : originStatus.status === "delay_moderate"
              ? locale === "es"
                ? "Demora moderada"
                : "Moderate delay"
              : locale === "es"
                ? "Demora leve"
                : "Minor delay";
        factors.push({
          type: "faa_status",
          signal: `${originCode}: ${label}`,
          weight: bonus / 100,
          severity,
        });
        break;
      }
    }
  }

  // Destination arrival delay adds risk at reduced weight
  if (destStatus) {
    switch (destStatus.status) {
      case "closure": {
        points += 60;
        factors.push({
          type: "faa_status",
          signal:
            locale === "es"
              ? `${destinationCode}: Destino cerrado`
              : `${destinationCode}: Destination closed`,
          weight: 0.6,
          severity: "high",
        });
        break;
      }
      case "ground_stop": {
        points += 40;
        factors.push({
          type: "faa_status",
          signal:
            locale === "es"
              ? `${destinationCode}: Ground Stop en destino`
              : `${destinationCode}: Ground Stop at destination`,
          weight: 0.4,
          severity: "high",
        });
        break;
      }
      case "ground_delay": {
        const avgMin = destStatus.groundDelay?.avgMinutes ?? 30;
        const bonus = avgMin >= 60 ? 40 : avgMin >= 30 ? 30 : 20;
        points += bonus;
        factors.push({
          type: "faa_status",
          signal:
            locale === "es"
              ? `${destinationCode}: Ground Delay en destino ~${avgMin} min`
              : `${destinationCode}: Ground Delay at destination ~${avgMin} min`,
          weight: bonus / 100,
          severity: avgMin >= 60 ? "high" : "medium",
        });
        break;
      }
      case "delay_severe":
      case "delay_moderate": {
        const maxMin = destStatus.delays?.maxMinutes ?? 20;
        const bonus = maxMin >= 60 ? 40 : 20;
        points += bonus;
        factors.push({
          type: "faa_status",
          signal:
            locale === "es"
              ? `${destinationCode}: Demoras en destino ${destStatus.delays?.minMinutes ?? 0}-${maxMin} min`
              : `${destinationCode}: Destination delays ${destStatus.delays?.minMinutes ?? 0}-${maxMin} min`,
          weight: bonus / 100,
          severity: maxMin >= 60 ? "high" : "medium",
        });
        break;
      }
    }
  }

  return { points, factors };
}

// ── Weather scoring ───────────────────────────────────────────────────────────

function scoreWeather(
  weather: WeatherSignals | undefined,
  airportCode: string,
  isDestination: boolean,
  locale: "es" | "en",
): { points: number; factors: DelayFactor[] } {
  if (!weather) return { points: 0, factors: [] };

  const factors: DelayFactor[] = [];
  let rawPoints = 0;
  const factorType: DelayFactor["type"] = isDestination
    ? "weather_destination"
    : "weather_origin";

  if (weather.visibilityMiles !== undefined && weather.visibilityMiles < 3) {
    rawPoints += 15;
    factors.push({
      type: factorType,
      signal:
        locale === "es"
          ? `${airportCode}: Visibilidad baja (${weather.visibilityMiles.toFixed(1)} millas)`
          : `${airportCode}: Low visibility (${weather.visibilityMiles.toFixed(1)} mi)`,
      weight: 0.15,
      severity: weather.visibilityMiles < 1 ? "high" : "medium",
    });
  }

  if (weather.windSpeedKnots !== undefined && weather.windSpeedKnots > 25) {
    rawPoints += 10;
    factors.push({
      type: factorType,
      signal:
        locale === "es"
          ? `${airportCode}: Vientos fuertes (${weather.windSpeedKnots} kt)`
          : `${airportCode}: High winds (${weather.windSpeedKnots} kt)`,
      weight: 0.1,
      severity: weather.windSpeedKnots > 40 ? "high" : "medium",
    });
  }

  if (weather.weatherCode !== undefined) {
    if (isThunderstorm(weather.weatherCode)) {
      rawPoints += 25;
      factors.push({
        type: factorType,
        signal:
          locale === "es"
            ? `${airportCode}: Tormenta eléctrica`
            : `${airportCode}: Thunderstorm`,
        weight: 0.25,
        severity: "high",
      });
    } else if (isSnowOrFreezing(weather.weatherCode)) {
      rawPoints += 20;
      factors.push({
        type: factorType,
        signal:
          locale === "es"
            ? `${airportCode}: Nevada / condiciones de congelamiento`
            : `${airportCode}: Snow / freezing conditions`,
        weight: 0.2,
        severity: "high",
      });
    } else if (isHeavyRain(weather.weatherCode)) {
      rawPoints += 10;
      factors.push({
        type: factorType,
        signal:
          locale === "es"
            ? `${airportCode}: Lluvia intensa`
            : `${airportCode}: Heavy rain`,
        weight: 0.1,
        severity: "medium",
      });
    }
  }

  // Destination weather counts at 70% weight
  const finalPoints = isDestination ? Math.round(rawPoints * 0.7) : rawPoints;

  return { points: finalPoints, factors };
}

// ── Time-of-day scoring ───────────────────────────────────────────────────────

function scoreTimeOfDay(
  departureTime: string,
  locale: "es" | "en",
): { points: number; factors: DelayFactor[] } {
  const parts = departureTime.split(":").map(Number);
  if (parts.length < 2) return { points: 0, factors: [] };
  const [hour] = parts;

  if (hour === undefined) return { points: 0, factors: [] };

  if (hour >= 20) {
    return {
      points: 15,
      factors: [
        {
          type: "time_of_day",
          signal:
            locale === "es"
              ? `Salida nocturna (${departureTime}) — mayor acumulación de demoras`
              : `Late departure (${departureTime}) — cascading delays likely`,
          weight: 0.15,
          severity: "medium",
        },
      ],
    };
  }

  if (hour >= 18) {
    return {
      points: 10,
      factors: [
        {
          type: "time_of_day",
          signal:
            locale === "es"
              ? `Salida tarde (${departureTime}) — posible acumulación de demoras`
              : `Evening departure (${departureTime}) — possible cascading delays`,
          weight: 0.1,
          severity: "low",
        },
      ],
    };
  }

  return { points: 0, factors: [] };
}

// ── Day-of-week scoring ───────────────────────────────────────────────────────

function scoreDayOfWeek(
  isoDate: string,
  locale: "es" | "en",
): { points: number; factors: DelayFactor[] } {
  const d = new Date(isoDate + "T12:00:00Z");
  const day = d.getUTCDay(); // 0=Sun, 5=Fri, 6=Sat

  if (day === 0 || day === 5) {
    const dayNames = {
      es: ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"],
      en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    };
    return {
      points: 5,
      factors: [
        {
          type: "day_of_week",
          signal:
            locale === "es"
              ? `Día de alta demanda (${dayNames.es[day]})`
              : `Peak travel day (${dayNames.en[day]})`,
          weight: 0.05,
          severity: "low",
        },
      ],
    };
  }

  return { points: 0, factors: [] };
}

// ── Season scoring ────────────────────────────────────────────────────────────

function scoreSeason(
  isoDate: string,
  locale: "es" | "en",
): { points: number; factors: DelayFactor[] } {
  const month = parseInt(isoDate.slice(5, 7), 10); // 1-12

  if (month >= 6 && month <= 8) {
    return {
      points: 5,
      factors: [
        {
          type: "season",
          signal:
            locale === "es"
              ? "Temporada de verano — mayor riesgo de tormentas"
              : "Summer season — higher thunderstorm risk",
          weight: 0.05,
          severity: "low",
        },
      ],
    };
  }

  if (month === 12 || month <= 2) {
    return {
      points: 5,
      factors: [
        {
          type: "season",
          signal:
            locale === "es"
              ? "Temporada de invierno — posible nieve o hielo"
              : "Winter season — possible snow or ice",
          weight: 0.05,
          severity: "low",
        },
      ],
    };
  }

  return { points: 0, factors: [] };
}

// ── Confidence calculation ────────────────────────────────────────────────────

function computeConfidence(
  hasFAA: boolean,
  hasOriginWeather: boolean,
  hasDestWeather: boolean,
): DelayPrediction["confidence"] {
  const sources = [hasFAA, hasOriginWeather, hasDestWeather].filter(Boolean).length;
  if (sources >= 3) return "high";
  if (sources >= 2) return "medium";
  return "low";
}

// ── Risk level mapping ────────────────────────────────────────────────────────

function probabilityToRiskLevel(
  probability: number,
): DelayPrediction["riskLevel"] {
  if (probability <= 15) return "minimal";
  if (probability <= 30) return "low";
  if (probability <= 50) return "moderate";
  if (probability <= 75) return "high";
  return "very_high";
}

// ── Estimated delay minutes ───────────────────────────────────────────────────

function estimateDelayMinutes(
  probability: number,
  statusMap: AirportStatusMap | undefined,
  originCode: string,
): number | null {
  if (probability < 16) return null;

  // Prefer actual FAA data if available
  if (statusMap) {
    const s = statusMap[originCode];
    if (s) {
      if (s.groundDelay?.avgMinutes) return s.groundDelay.avgMinutes;
      if (s.delays?.maxMinutes) return Math.round((s.delays.minMinutes ?? 0 + s.delays.maxMinutes) / 2);
      if (s.status === "ground_stop") return 90;
      if (s.status === "closure") return null; // flight won't depart
    }
  }

  // Heuristic estimate based on probability score
  if (probability >= 76) return 75;
  if (probability >= 51) return 45;
  if (probability >= 31) return 25;
  return 15;
}

// ── Recommendation text ───────────────────────────────────────────────────────

function buildRecommendation(
  riskLevel: DelayPrediction["riskLevel"],
  locale: "es" | "en",
): string {
  const recommendations: Record<
    DelayPrediction["riskLevel"],
    { es: string; en: string }
  > = {
    minimal: {
      es: "Todo indica un vuelo puntual. Llega al aeropuerto a tiempo.",
      en: "Everything looks on time. Arrive at the airport as scheduled.",
    },
    low: {
      es: "Probabilidad baja de demora. Mantente atento a las actualizaciones de la aerolínea.",
      en: "Low delay probability. Keep an eye on airline updates.",
    },
    moderate: {
      es: "Existe cierto riesgo de demora. Llega con tiempo extra y activa las notificaciones de vuelo.",
      en: "Moderate delay risk. Arrive with extra time and enable flight notifications.",
    },
    high: {
      es: "Alto riesgo de demora. Planifica con margen extra, especialmente si tienes conexión.",
      en: "High delay risk. Plan for extra buffer time, especially if you have a connection.",
    },
    very_high: {
      es: "Riesgo muy alto de demora. Contacta a la aerolínea para opciones de re-acomodación.",
      en: "Very high delay risk. Contact your airline about rebooking options.",
    },
  };

  return recommendations[riskLevel][locale];
}

// ── Main prediction function ──────────────────────────────────────────────────

export interface PredictDelayInput {
  flight: FlightSignals;
  airportStatus?: AirportStatusMap;
  originWeather?: WeatherSignals;
  destinationWeather?: WeatherSignals;
  locale?: "es" | "en";
}

export function predictDelay({
  flight,
  airportStatus,
  originWeather,
  destinationWeather,
  locale = "es",
}: PredictDelayInput): DelayPrediction {
  const { originCode, destinationCode, departureTime, isoDate } = flight;

  // Base score from historical airport delay rate
  const baseScore = AIRPORT_DELAY_RATES[originCode] ?? DEFAULT_DELAY_RATE;

  const allFactors: DelayFactor[] = [];
  let totalBonus = 0;

  // If airport has a known high delay rate, surface it as a factor
  if ((AIRPORT_DELAY_RATES[originCode] ?? 0) >= 20) {
    allFactors.push({
      type: "airport_congestion",
      signal:
        locale === "es"
          ? `${originCode}: Aeropuerto con alta tasa histórica de demoras (${AIRPORT_DELAY_RATES[originCode]}%)`
          : `${originCode}: Airport with high historical delay rate (${AIRPORT_DELAY_RATES[originCode]}%)`,
      weight: AIRPORT_DELAY_RATES[originCode]! / 100,
      severity:
        AIRPORT_DELAY_RATES[originCode]! >= 25
          ? "high"
          : AIRPORT_DELAY_RATES[originCode]! >= 20
            ? "medium"
            : "low",
    });
  }

  // FAA status bonus
  const faa = scoreFAAStatus(airportStatus, originCode, destinationCode, locale);
  totalBonus += faa.points;
  allFactors.push(...faa.factors);

  // Weather bonus — origin
  const originWx = scoreWeather(originWeather, originCode, false, locale);
  totalBonus += originWx.points;
  allFactors.push(...originWx.factors);

  // Weather bonus — destination (70% weight already applied inside scoreWeather)
  const destWx = scoreWeather(destinationWeather, destinationCode, true, locale);
  totalBonus += destWx.points;
  allFactors.push(...destWx.factors);

  // Time of day bonus
  const time = scoreTimeOfDay(departureTime, locale);
  totalBonus += time.points;
  allFactors.push(...time.factors);

  // Day of week bonus
  const dow = scoreDayOfWeek(isoDate, locale);
  totalBonus += dow.points;
  allFactors.push(...dow.factors);

  // Season bonus
  const season = scoreSeason(isoDate, locale);
  totalBonus += season.points;
  allFactors.push(...season.factors);

  // Final clamped probability
  const probability = Math.min(Math.round(baseScore + totalBonus), 99);

  const riskLevel = probabilityToRiskLevel(probability);

  const confidence = computeConfidence(
    !!airportStatus,
    !!originWeather,
    !!destinationWeather,
  );

  const estimatedDelayMinutes = estimateDelayMinutes(
    probability,
    airportStatus,
    originCode,
  );

  const recommendation = buildRecommendation(riskLevel, locale);

  return {
    probability,
    confidence,
    riskLevel,
    factors: allFactors,
    estimatedDelayMinutes,
    recommendation,
  };
}
