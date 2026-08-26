import type { FuelEntry } from "@lmu/shared";

export interface FuelStats {
  averageConsumption: number | null; // litros por volta
  currentRemaining: number | null; // litros
  lapsRemaining: number | null;
}

/**
 * Deriva o estado do combustível a partir do log de entradas:
 * - consumo médio = média de `litersUsed` registrados.
 * - restante = a leitura absoluta (`litersRemaining`) mais recente, menos o
 *   consumo registrado depois dela; se nunca houve leitura absoluta, parte
 *   do tanque cheio (`tankLiters`, das settings da sala).
 */
export function computeFuelStats(entries: FuelEntry[], tankLiters: number): FuelStats {
  const sorted = [...entries].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const usedValues = sorted.map((e) => e.litersUsed).filter((v): v is number => v != null);
  const averageConsumption = usedValues.length > 0 ? usedValues.reduce((a, b) => a + b, 0) / usedValues.length : null;

  let currentRemaining = tankLiters;
  let sinceIdx = -1;
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i].litersRemaining != null) {
      currentRemaining = sorted[i].litersRemaining as number;
      sinceIdx = i;
      break;
    }
  }
  for (let i = sinceIdx + 1; i < sorted.length; i++) {
    if (sorted[i].litersUsed != null) currentRemaining -= sorted[i].litersUsed as number;
  }
  currentRemaining = Math.max(0, currentRemaining);

  const lapsRemaining =
    averageConsumption != null && averageConsumption > 0 ? currentRemaining / averageConsumption : null;

  return {
    averageConsumption,
    currentRemaining: sorted.length > 0 ? currentRemaining : null,
    lapsRemaining,
  };
}

/** "Quero completar X voltas" -> quantos litros faltam pra chegar lá (nunca negativo). */
export function litersToRefuel(targetLaps: number, stats: FuelStats): number | null {
  if (stats.averageConsumption == null || stats.currentRemaining == null) return null;
  const needed = targetLaps * stats.averageConsumption - stats.currentRemaining;
  return Math.max(0, needed);
}
