import type { RoomSettings, TireEntry } from "@lmu/shared";

export interface TireStats {
  current: TireEntry | null;
  ageLaps: number;
  gripPercent: number;
  recommendChange: boolean;
}

const RECOMMEND_CHANGE_BELOW_GRIP = 65;

export function computeTireStats(
  entries: TireEntry[],
  currentLap: number | null,
  settings: RoomSettings
): TireStats {
  const sorted = [...entries].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const current = sorted.at(-1) ?? null;
  if (!current) return { current: null, ageLaps: 0, gripPercent: 100, recommendChange: false };

  const lap = currentLap ?? current.stintStartLap;
  const ageLaps = Math.max(0, lap - current.stintStartLap);
  const gripPercent = Math.max(0, 100 - ageLaps * settings.tireDegradationPercentPerLap);

  return { current, ageLaps, gripPercent, recommendChange: gripPercent < RECOMMEND_CHANGE_BELOW_GRIP };
}

export interface StintHistoryItem {
  entry: TireEntry;
  lapsRun: number;
}

/** Cada stint dura até o próximo começar (ou até a volta atual, pro stint em uso). */
export function computeStintHistory(entries: TireEntry[], currentLap: number | null): StintHistoryItem[] {
  const sorted = [...entries].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  return sorted.map((entry, i) => {
    const next = sorted[i + 1];
    const endLap = next ? next.stintStartLap : (currentLap ?? entry.stintStartLap);
    return { entry, lapsRun: Math.max(0, endLap - entry.stintStartLap) };
  });
}
