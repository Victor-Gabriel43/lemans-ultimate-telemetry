"use client";

import { useEffect, useState } from "react";
import { Flag } from "lucide-react";
import { useRoomStore } from "@/state/roomStore";
import { formatClock, formatGap, formatLapTime, formatMinutes } from "@/lib/format";
import { EditableStat } from "@/components/EditableStat";
import { Panel, Metric, primaryButton } from "@/components/ui/Panel";
import { useValueFlash } from "@/lib/useValueFlash";

export function RaceStatusCard() {
  const room = useRoomStore((s) => s.snapshot!.room);
  const updateDashboard = useRoomStore((s) => s.updateDashboard);
  const [now, setNow] = useState(() => Date.now());

  // atualiza o relógio de decorrido/restante a cada segundo — Date.now() só
  // roda dentro do efeito, nunca direto no corpo do componente.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const startedAtMs = room.raceStartedAt ? new Date(room.raceStartedAt).getTime() : null;
  const elapsedSec = startedAtMs != null ? (now - startedAtMs) / 1000 : 0;
  const totalSec = room.raceDurationType === "TIME" ? room.raceDurationValue * 60 : null;
  const remainingSec = totalSec != null ? totalSec - elapsedSec : null;
  const remainingLaps =
    room.raceDurationType === "LAPS" && room.currentLap != null
      ? Math.max(0, room.raceDurationValue - room.currentLap)
      : null;

  const lapFlash = useValueFlash(room.currentLap);
  const posFlash = useValueFlash(room.position);

  return (
    <Panel
      title="Main Race Status"
      className="lg:col-span-12"
      actions={
        startedAtMs == null ? (
          <span className="eyebrow">
            Duração{" "}
            {room.raceDurationType === "TIME"
              ? formatMinutes(room.raceDurationValue)
              : `${room.raceDurationValue} voltas`}
          </span>
        ) : null
      }
    >
      {startedAtMs == null ? (
        <button
          type="button"
          onClick={() => updateDashboard({ raceStartedAt: new Date().toISOString() })}
          className={primaryButton}
        >
          <Flag size={16} aria-hidden />
          Iniciar corrida agora
        </button>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 lg:grid-cols-8">
          <Metric label="Decorrido" value={formatClock(elapsedSec)} size="lg" />
          <Metric
            label="Restante"
            value={
              remainingSec != null
                ? formatClock(remainingSec)
                : remainingLaps != null
                  ? `${remainingLaps}`
                  : "—"
            }
            unit={remainingSec == null && remainingLaps != null ? "voltas" : undefined}
            size="lg"
            tone={remainingSec != null && remainingSec < 0 ? "critical" : "default"}
          />
          <EditableStat
            label="Volta"
            value={room.currentLap}
            displayValue={room.currentLap != null ? String(room.currentLap) : "—"}
            onSave={(v) => updateDashboard({ currentLap: v })}
            className={lapFlash}
          />
          <EditableStat
            label="Posição"
            value={room.position}
            displayValue={room.position != null ? `P${room.position}` : "—"}
            onSave={(v) => updateDashboard({ position: v != null ? Math.round(v) : null })}
            className={posFlash}
          />
          <EditableStat
            label="Última volta"
            value={room.lastLapTime}
            displayValue={formatLapTime(room.lastLapTime)}
            onSave={(v) => updateDashboard({ lastLapTime: v })}
          />
          <EditableStat
            label="Melhor volta"
            value={room.bestLapTime}
            displayValue={formatLapTime(room.bestLapTime)}
            onSave={(v) => updateDashboard({ bestLapTime: v })}
          />
          <EditableStat
            label="Gap à frente"
            value={room.gapAheadSec}
            displayValue={formatGap(room.gapAheadSec)}
            onSave={(v) => updateDashboard({ gapAheadSec: v })}
          />
          <EditableStat
            label="Gap atrás"
            value={room.gapBehindSec}
            displayValue={formatGap(room.gapBehindSec)}
            onSave={(v) => updateDashboard({ gapBehindSec: v })}
          />
        </div>
      )}
    </Panel>
  );
}
