"use client";

import { useEffect, useState } from "react";
import { GanttChartSquare } from "lucide-react";
import { useRoomStore } from "@/state/roomStore";
import { colorForName } from "@lmu/shared";
import { computeTimelineSegments, computePitMarkers, computeTimelineScaleMinutes } from "@/lib/timelineStats";
import { formatMinutes } from "@/lib/format";

export function TimelinePanel() {
  const snapshot = useRoomStore((s) => s.snapshot)!;
  const { scheduleRows, pitStops, drivers, room } = snapshot;

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!room.raceStartedAt) return;
    const id = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(id);
  }, [room.raceStartedAt]);

  const { segments, totalMinutes: scheduleTotal } = computeTimelineSegments(scheduleRows);
  const pitMarkers = computePitMarkers(pitStops, room.raceStartedAt);
  const elapsedMinutes = room.raceStartedAt ? (now - new Date(room.raceStartedAt).getTime()) / 60000 : 0;
  const scaleMinutes = computeTimelineScaleMinutes(scheduleTotal, room.raceDurationType, room.raceDurationValue, elapsedMinutes);

  const pct = (minutes: number) => `${Math.min(100, Math.max(0, (minutes / scaleMinutes) * 100))}%`;

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 sm:col-span-2 lg:col-span-3">
      <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
        <GanttChartSquare size={14} aria-hidden />
        Timeline
      </h2>

      {segments.length === 0 ? (
        <p className="text-sm text-text-muted">Adicione stints na escala pra ver a timeline.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          <div className="relative h-12 w-full overflow-hidden rounded-md bg-surface-raised">
            {segments.map((seg) => (
              <div
                key={seg.rowId}
                title={`${seg.label || "—"} · ${formatMinutes(seg.durationMinutes)}`}
                className={`absolute top-0 h-full border-r border-bg/60 px-2 py-1 text-xs text-brand-fg ${
                  seg.status === "DONE" ? "opacity-40" : ""
                } ${seg.status === "ACTIVE" ? "ring-2 ring-inset ring-white/40" : ""}`}
                style={{
                  left: pct(seg.startMinutes),
                  width: pct(seg.durationMinutes),
                  backgroundColor: seg.driverId ? colorForName(seg.driverId) : "var(--border-c)",
                }}
              >
                <span className="truncate">{drivers.find((d) => d.id === seg.driverId)?.name ?? "—"}</span>
              </div>
            ))}
          </div>

          <div className="relative h-6 w-full">
            {pitMarkers.map((m) => (
              <div
                key={m.id}
                title={`Pit stop${m.lap != null ? ` · volta ${m.lap}` : ""}`}
                className={`absolute top-0 h-full w-1 -translate-x-1/2 rounded-full ${
                  m.inProgress ? "bg-status-warning" : "bg-status-ok"
                }`}
                style={{ left: pct(m.atMinutes) }}
              />
            ))}
          </div>

          {room.raceStartedAt && (
            <div className="relative h-0 w-full">
              <div
                className="pointer-events-none absolute -top-[72px] h-[72px] w-0.5 -translate-x-1/2 bg-brand"
                style={{ left: pct(elapsedMinutes) }}
                title="Agora"
              />
            </div>
          )}

          <div className="flex justify-between text-xs text-text-muted">
            <span>0min</span>
            <span>{formatMinutes(scaleMinutes)}</span>
          </div>
        </div>
      )}
    </section>
  );
}
