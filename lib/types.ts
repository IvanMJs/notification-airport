export type DelayStatus =
  | "ok"
  | "delay_minor"    // delays ≤15 min
  | "delay_moderate" // delays 16-45 min
  | "delay_severe"   // delays >45 min
  | "ground_stop"    // ground stop activo
  | "ground_delay"   // ground delay program
  | "closure"        // aeropuerto cerrado
  | "unknown";

export interface DelayInfo {
  reason: string;
  minMinutes?: number;
  maxMinutes?: number;
  trend?: "Increasing" | "Decreasing" | "Holding" | string;
  type: "departure" | "arrival" | "both";
}

export interface AirportStatus {
  iata: string;
  name: string;
  city: string;
  state: string;
  status: DelayStatus;
  delays?: DelayInfo;
  groundStop?: { reason: string; endTime?: string };
  groundDelay?: { reason: string; avgMinutes: number; maxTime: string };
  closure?: { reason: string };
  lastChecked: Date;
}

export type AirportStatusMap = Record<string, AirportStatus>;

export interface MyFlight {
  date: string;
  flightNum: string;
  airline: string;
  origin: string;
  originCode: string;
  destination: string;
  destinationCode: string;
  departureTime: string;
  trackingUrl: string;
}
