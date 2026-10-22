import type { PitStop, RaceDurationType, ScheduleRow, ScheduleStatus } from "@lmu/shared";

export interface TimelineSegment {
  rowId: string;
  driverId: string | null;
  label: string;
  startMinutes: number;
  durationMinutes: number;
  status: ScheduleStatus;
}

/** Reaproveita a mesma lógica de "relógio derivado" da Fase 7 (soma acumulada de durationMinutes na ordem da planilha) — não duplica estado, só deriva. */
export function computeTimelineSegments(rows: ScheduleRow[]): { segments: TimelineSegment[]; totalMinutes: number } {
  let cursor = 0;
  const segments: TimelineSegment[] = rows.map((row) => {
    const seg: TimelineSegment = {
      rowId: row.id,
      driverId: row.driverId,
      label: row.plannedLabel,
      startMinutes: cursor,
      durationMinutes: row.durationMinutes,
      status: row.status,
    };
    cursor += row.durationMinutes;
    return seg;
  });
  return { segments, totalMinutes: cursor };
}

export interface TimelinePitMarker {
  id: string;
  atMinutes: number;
  lap: number | null;
  inProgress: boolean;
}

/** Posição no tempo vem de `startedAt` (timestamp real), não de `lap` — mais direto pra render numa régua de tempo. */
export function computePitMarkers(pitStops: PitStop[], raceStartedAt: string | null): TimelinePitMarker[] {
  if (!raceStartedAt) return [];
  const startMs = new Date(raceStartedAt).getTime();
  return pitStops
    .map((p) => ({
      id: p.id,
      atMinutes: (new Date(p.startedAt).getTime() - startMs) / 60000,
      lap: p.lap,
      inProgress: !p.completedAt,
    }))
    .filter((m) => m.atMinutes >= 0);
}

export function computeTimelineScaleMinutes(
  scheduleTotalMinutes: number,
  raceDurationType: RaceDurationType,
  raceDurationValue: number,
  elapsedMinutes: number
): number {
  const raceMinutes = raceDurationType === "TIME" ? raceDurationValue : 0;
  return Math.max(scheduleTotalMinutes, raceMinutes, elapsedMinutes) * 1.02 || 1;
}
