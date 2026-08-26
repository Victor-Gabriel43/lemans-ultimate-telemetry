import type { DamageEntry, RoomSettings } from "@lmu/shared";

export interface DamageStats {
  active: DamageEntry[];
  repaired: DamageEntry[];
  totalRepairMinutes: number;
  totalPaceImpactPercent: number;
}

export function computeDamageStats(entries: DamageEntry[], settings: RoomSettings): DamageStats {
  const active = entries.filter((e) => !e.repairedAt);
  const repaired = entries.filter((e) => e.repairedAt);

  const totalRepairMinutes = active.reduce((sum, e) => sum + (e.repairEstimateMinutes ?? 0), 0);
  const totalPaceImpactPercent = active.reduce(
    (sum, e) => sum + settings.damagePaceImpactPercentPerSeverity[e.severity],
    0
  );

  return { active, repaired, totalRepairMinutes, totalPaceImpactPercent };
}
