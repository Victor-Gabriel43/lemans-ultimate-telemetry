"use client";

import { useEffect, useState } from "react";
import { GanttChartSquare } from "lucide-react";
import { useRoomStore } from "@/state/roomStore";
import { colorForName } from "@lmu/shared";
import { computeTimelineSegments, computePitMarkers, computeTimelineScaleMinutes } from "@/lib/timelineStats";
import { formatMinutes } from "@/lib/format";
import { Panel } from "@/components/ui/Panel";

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
  const scaleMinutes = computeTimelineScaleMinutes(
    scheduleTotal,
    room.raceDurationType,
    room.raceDurationValue,
    elapsedMinutes
  );

  const pct = (minutes: number) => `${Math.min(100, Math.max(0, (minutes / scaleMinutes) * 100))}%`;

  return (
    <Panel title="Race Timeline" icon={<GanttChartSquare size={13} aria-hidden />}>
      {segments.length === 0 ? (
        <p className="text-sm text-text-muted">
          Adicione stints na escala para montar a linha do tempo da corrida.
        </p>
      ) : (
        <div className="flex flex-col gap-1.5 pt-4">
          <div className="flex justify-between">
            <span className="eyebrow">Start</span>
            <span className="eyebrow">Finish</span>
          </div>
          <div className="relative h-11 w-full overflow-hidden border border-border bg-surface-raised">
            {segments.map((seg) => (
              <div
                key={seg.rowId}
                title={`${seg.label || "—"} · ${formatMinutes(seg.durationMinutes)}`}
                className={`absolute top-0 flex h-full items-center border-r border-bg/70 px-2 text-xs text-brand-fg ${
                  seg.status === "DONE" ? "opacity-40" : ""
                } ${seg.status === "ACTIVE" ? "ring-2 ring-inset ring-white/50" : ""}`}
                style={{
                  left: pct(seg.startMinutes),
                  width: pct(seg.durationMinutes),
                  backgroundColor: seg.driverId ? colorForName(seg.driverId) : "var(--border-strong)",
                }}
              >
                <span className="truncate font-medium">
                  {drivers.find((d) => d.id === seg.driverId)?.name ?? "—"}
                </span>
              </div>
            ))}
          </div>

          <div className="relative h-4 w-full">
            {pitMarkers.map((m) => (
              <div
                key={m.id}
                title={`Pit stop${m.lap != null ? ` · volta ${m.lap}` : ""}`}
                className={`absolute top-0 h-full w-0.5 -translate-x-1/2 ${
                  m.inProgress ? "bg-status-warning" : "bg-text-muted"
                }`}
                style={{ left: pct(m.atMinutes) }}
              />
            ))}
          </div>

          {room.raceStartedAt && (
            <div className="relative h-0 w-full">
              <div
                className="pointer-events-none absolute -top-[76px] h-[76px] w-0.5 -translate-x-1/2 bg-brand"
                style={{ left: pct(elapsedMinutes) }}
                title="Agora"
              />
            </div>
          )}

          <div className="flex justify-between text-xs tabular-nums text-text-muted">
            <span>0min</span>
            <span>{formatMinutes(scaleMinutes)}</span>
          </div>
        </div>
      )}
    </Panel>
  );
}
