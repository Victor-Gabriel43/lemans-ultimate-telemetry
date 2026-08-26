import type { RoomSettings, ScheduleRow } from "@lmu/shared";

export interface DriverScheduleStat {
  driverId: string;
  totalPlannedMinutes: number;
  totalDoneMinutes: number;
  violations: string[];
}

export interface ScheduleStats {
  perDriver: DriverScheduleStat[];
  totalScheduledMinutes: number;
}

/**
 * Deriva estatísticas por piloto a partir da ORDEM das linhas + duração de
 * cada uma — não do texto livre de `plannedLabel` (que pode ser "00:00",
 * "Volta 1-20", etc, não é parseável de forma confiável). O "relógio"
 * usado aqui é só a soma acumulada de durationMinutes na ordem da planilha.
 */
export function computeScheduleStats(rows: ScheduleRow[], settings: RoomSettings): ScheduleStats {
  const perDriverMap = new Map<string, DriverScheduleStat>();
  const lastEndByDriver = new Map<string, number>();
  let cursor = 0;

  for (const row of rows) {
    const start = cursor;
    const end = cursor + row.durationMinutes;

    if (row.driverId) {
      let stat = perDriverMap.get(row.driverId);
      if (!stat) {
        stat = { driverId: row.driverId, totalPlannedMinutes: 0, totalDoneMinutes: 0, violations: [] };
        perDriverMap.set(row.driverId, stat);
      }
      stat.totalPlannedMinutes += row.durationMinutes;
      if (row.status === "DONE") stat.totalDoneMinutes += row.durationMinutes;

      if (row.durationMinutes > settings.maxStintMinutes) {
        stat.violations.push(
          `Stint de ${row.durationMinutes}min passa do máximo configurado (${settings.maxStintMinutes}min)`
        );
      }

      const lastEnd = lastEndByDriver.get(row.driverId);
      if (lastEnd != null) {
        const rest = start - lastEnd;
        if (rest < settings.minRestMinutes) {
          stat.violations.push(
            `Só ${Math.max(0, Math.round(rest))}min de descanso antes deste stint (mínimo ${settings.minRestMinutes}min)`
          );
        }
      }
      lastEndByDriver.set(row.driverId, end);
    }

    cursor = end;
  }

  return { perDriver: Array.from(perDriverMap.values()), totalScheduledMinutes: cursor };
}
