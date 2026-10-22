import type { DamageEntry, RoomSettings } from "@lmu/shared";

export interface PitPlan {
  fuelAddedLiters: number | null;
  tireChangeCompound: string | null;
  includeDriverChange: boolean;
  repairDamageIds: string[];
}

/** Soma os tempos configurados de cada ação planejada — estimativa de quanto tempo o carro fica parado. */
export function estimatePitStopSeconds(plan: PitPlan, settings: RoomSettings, activeDamage: DamageEntry[]): number {
  const durations = settings.pitActionDurationsSeconds;
  let seconds = 0;

  if (plan.fuelAddedLiters) seconds += plan.fuelAddedLiters * durations.fuelPerLiter;
  if (plan.tireChangeCompound) seconds += durations.tireChange;
  if (plan.includeDriverChange) seconds += durations.driverChange;

  for (const damageId of plan.repairDamageIds) {
    const damage = activeDamage.find((d) => d.id === damageId);
    if (damage) seconds += durations.repairPerSeverity[damage.severity];
  }

  return Math.round(seconds);
}
