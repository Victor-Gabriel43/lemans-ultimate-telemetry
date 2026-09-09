"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useRoomStore } from "@/state/roomStore";
import { computeScheduleStats } from "@/lib/scheduleStats";
import { formatMinutes } from "@/lib/format";

export function ScheduleTotals() {
  const snapshot = useRoomStore((s) => s.snapshot)!;
  const { room, scheduleRows, drivers } = snapshot;
  const { perDriver, totalScheduledMinutes } = computeScheduleStats(scheduleRows, room.settings);

  const coverage =
    room.raceDurationType === "TIME"
      ? { total: room.raceDurationValue, diff: totalScheduledMinutes - room.raceDurationValue }
      : null;

  return (
    <div className="flex flex-col gap-3">
      {coverage && (
        <div
          className={`flex items-start gap-2 border px-3 py-2 text-sm ${
            Math.abs(coverage.diff) < 1
              ? "border-status-ok/40 bg-status-ok/10 text-status-ok"
              : "border-status-warning/40 bg-status-warning/10 text-status-warning"
          }`}
        >
          {Math.abs(coverage.diff) < 1 ? (
            <CheckCircle2 size={16} className="mt-0.5 shrink-0" aria-hidden />
          ) : (
            <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden />
          )}
          <span>
            {Math.abs(coverage.diff) < 1
              ? `Escala cobre a corrida inteira (${formatMinutes(totalScheduledMinutes)}).`
              : coverage.diff < 0
                ? `Faltam ${formatMinutes(-coverage.diff)} sem piloto escalado (escala cobre ${formatMinutes(totalScheduledMinutes)} de ${formatMinutes(coverage.total)}).`
                : `Escala passa ${formatMinutes(coverage.diff)} da duração da corrida (${formatMinutes(totalScheduledMinutes)} de ${formatMinutes(coverage.total)}).`}
          </span>
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {perDriver.map((stat) => {
          const driver = drivers.find((d) => d.id === stat.driverId);
          if (!driver) return null;
          return (
            <div key={stat.driverId} className="border border-border bg-surface-raised px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 font-medium">
                  <span
                    className="h-2.5 w-2.5 shrink-0"
                    style={{ backgroundColor: driver.colorHex }}
                    aria-hidden
                  />
                  {driver.name}
                </span>
                <span className="font-mono text-xs tabular-nums text-text-muted">
                  {formatMinutes(stat.totalDoneMinutes)} / {formatMinutes(stat.totalPlannedMinutes)}
                </span>
              </div>
              {stat.violations.length > 0 && (
                <ul className="mt-1.5 flex flex-col gap-0.5">
                  {stat.violations.map((v, i) => (
                    <li key={i} className="flex items-start gap-1 text-xs text-status-warning">
                      <AlertTriangle size={12} className="mt-0.5 shrink-0" aria-hidden />
                      {v}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
        {perDriver.length === 0 && (
          <p className="text-sm text-text-muted">Nenhum piloto escalado ainda.</p>
        )}
      </div>
    </div>
  );
}
