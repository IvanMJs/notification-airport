export interface TripSummary {
  originCode: string;
  destinationCode: string;
  isoDate: string;
}

export interface DreamPlannerEntry {
  id: string;       // crypto.randomUUID() or Date.now().toString()
  prompt: string;
  plan: string;
  createdAt: string; // ISO date string
}

const STORAGE_KEY = "tc-dream-plans";
const MAX_ENTRIES = 3;

export function saveDreamPlan(entry: DreamPlannerEntry): void {
  try {
    const existing = loadDreamPlans();
    const updated = [entry, ...existing].slice(0, MAX_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch { /* ignore */ }
}

export function loadDreamPlans(): DreamPlannerEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is DreamPlannerEntry =>
        typeof e?.id === "string" &&
        typeof e?.prompt === "string" &&
        typeof e?.plan === "string" &&
        typeof e?.createdAt === "string"
    );
  } catch { return []; }
}
