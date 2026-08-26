import type { AlertSeverity, RoomSnapshot } from "@lmu/shared";
import { computeFuelStats } from "@lmu/shared";
import { computeTireStats } from "./tireStats";
import { computeScheduleStats } from "./scheduleStats";
import { computeTimelineSegments } from "./timelineStats";

export interface AlertItem {
  /** Chave estável — usada tanto de `key` de lista quanto pra rastrear dispensa manual. */
  key: string;
  severity: AlertSeverity;
  message: string;
}

const FUEL_CRITICAL_LAPS = 1.5;
const FUEL_WARNING_LAPS = 3;
const UPCOMING_STINT_WINDOW_MINUTES = 5;

/**
 * Motor de alertas — 100% derivado do snapshot já sincronizado (fuel/tire/
 * schedule) mais o relógio local. Como todo mundo na sala vê o MESMO
 * snapshot, cada cliente calcula os mesmos alertas de forma independente —
 * não precisa de um evento de socket dedicado pra "todo mundo receber
 * igual" (ver PASSO_A_PASSO.md pra o racional completo dessa decisão).
 */
export function computeActiveAlerts(snapshot: RoomSnapshot, nowMs: number): AlertItem[] {
  const { room, fuelLog, tireLog, scheduleRows } = snapshot;
  const alerts: AlertItem[] = [];

  // 1) Combustível baixo
  const fuelStats = computeFuelStats(fuelLog, room.settings.fuelTankLiters);
  if (fuelStats.lapsRemaining != null) {
    if (fuelStats.lapsRemaining < FUEL_CRITICAL_LAPS) {
      alerts.push({
        key: "fuel-low",
        severity: "CRITICAL",
        message: `Combustível crítico: ~${fuelStats.lapsRemaining.toFixed(1)} voltas restantes.`,
      });
    } else if (fuelStats.lapsRemaining < FUEL_WARNING_LAPS) {
      alerts.push({
        key: "fuel-low",
        severity: "WARNING",
        message: `Combustível baixo: ~${fuelStats.lapsRemaining.toFixed(1)} voltas restantes.`,
      });
    }
  }

  // 2) Pneu no fim da vida
  const tireStats = computeTireStats(tireLog, room.currentLap, room.settings);
  if (tireStats.current) {
    if (tireStats.gripPercent < 50) {
      alerts.push({
        key: "tire-worn",
        severity: "CRITICAL",
        message: `Pneu (${tireStats.current.compound}) com grip estimado em ${tireStats.gripPercent.toFixed(0)}%.`,
      });
    } else if (tireStats.gripPercent < 65) {
      alerts.push({
        key: "tire-worn",
        severity: "WARNING",
        message: `Pneu (${tireStats.current.compound}) perto do fim da vida — grip estimado ${tireStats.gripPercent.toFixed(0)}%.`,
      });
    }
  }

  // 3) Piloto perto do limite de stint (reaproveita a mesma checagem da planilha, Fase 7)
  const activeRow = scheduleRows.find((r) => r.status === "ACTIVE");
  if (activeRow?.driverId) {
    const { perDriver } = computeScheduleStats(scheduleRows, room.settings);
    const stat = perDriver.find((d) => d.driverId === activeRow.driverId);
    for (const violation of stat?.violations ?? []) {
      alerts.push({ key: `driver-limit:${activeRow.driverId}`, severity: "WARNING", message: violation });
    }
  }

  // 4) Próximo stint da planilha prestes a começar
  if (room.raceStartedAt) {
    const elapsedMinutes = (nowMs - new Date(room.raceStartedAt).getTime()) / 60000;
    const { segments } = computeTimelineSegments(scheduleRows);
    const upcoming = segments.find(
      (s) => s.status === "PLANNED" && s.startMinutes - elapsedMinutes <= UPCOMING_STINT_WINDOW_MINUTES && s.startMinutes - elapsedMinutes > -2
    );
    if (upcoming) {
      const minutesLeft = Math.max(0, Math.round(upcoming.startMinutes - elapsedMinutes));
      alerts.push({
        key: `stint-upcoming:${upcoming.rowId}`,
        severity: "WARNING",
        message:
          minutesLeft <= 0
            ? `Stint "${upcoming.label || "próximo"}" deveria estar começando agora.`
            : `Stint "${upcoming.label || "próximo"}" começa em ~${minutesLeft}min.`,
      });
    }
  }

  return alerts;
}
