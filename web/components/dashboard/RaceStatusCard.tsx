"use client";

import { useEffect, useState } from "react";
import { Flag } from "lucide-react";
import { useRoomStore } from "@/state/roomStore";
import { formatClock, formatGap, formatLapTime } from "@/lib/format";
import { EditableStat } from "@/components/EditableStat";

export function RaceStatusCard() {
  const room = useRoomStore((s) => s.snapshot!.room);
  const updateDashboard = useRoomStore((s) => s.updateDashboard);
  const [now, setNow] = useState(() => Date.now());

  // atualiza o relógio de decorrido/restante a cada segundo — Date.now() só
  // roda dentro do efeito, nunca direto no corpo do componente (regra do
  // react-hooks/purity: render tem que ser determinístico).
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

  return (
    <section className="rounded-lg border border-border bg-surface p-4 sm:col-span-2 lg:col-span-3">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-text-muted">Status da corrida</h2>
        {startedAtMs == null && (
          <span className="text-xs text-text-muted">
            Duração: {room.raceDurationType === "TIME" ? `${room.raceDurationValue} min` : `${room.raceDurationValue} voltas`}
          </span>
        )}
      </div>

      {startedAtMs == null ? (
        <button
          type="button"
          onClick={() => updateDashboard({ raceStartedAt: new Date().toISOString() })}
          className="flex min-h-12 cursor-pointer items-center gap-2 rounded-md bg-brand px-4 py-3 font-medium text-brand-fg transition-opacity hover:opacity-90"
        >
          <Flag size={18} aria-hidden />
          Iniciar corrida agora
        </button>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Decorrido" value={formatClock(elapsedSec)} />
          <Stat
            label="Restante"
            value={remainingSec != null ? formatClock(remainingSec) : remainingLaps != null ? `${remainingLaps} voltas` : "—"}
            critical={remainingSec != null && remainingSec < 0}
          />
          <EditableStat
            label="Volta"
            value={room.currentLap}
            displayValue={room.currentLap != null ? String(room.currentLap) : "—"}
            onSave={(v) => updateDashboard({ currentLap: v })}
          />
          <EditableStat
            label="Posição"
            value={room.position}
            displayValue={room.position != null ? `P${room.position}` : "—"}
            onSave={(v) => updateDashboard({ position: v != null ? Math.round(v) : null })}
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
    </section>
  );
}

function Stat({ label, value, critical = false }: { label: string; value: string; critical?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wide text-text-muted">{label}</span>
      <span className={`font-mono text-xl tabular-nums ${critical ? "text-status-critical" : ""}`}>{value}</span>
    </div>
  );
}
