"use client";

import { useRoomStore } from "@/state/roomStore";
import { RaceStatusCard } from "@/components/dashboard/RaceStatusCard";
import { CurrentDriverCard } from "@/components/dashboard/CurrentDriverCard";

/**
 * Dashboard da sala. O layout (app/room/[code]/layout.tsx) só renderiza
 * esta página depois de status === "joined", então snapshot deveria
 * sempre existir aqui — o `if (!snapshot) return null` é só defensivo.
 */
export default function RoomPage() {
  const snapshot = useRoomStore((s) => s.snapshot);
  if (!snapshot) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <RaceStatusCard />

      <CurrentDriverCard />
      <PlaceholderCard title="Combustível" note="Fase 8" />
      <PlaceholderCard title="Pneus" note="Fase 9" />

      <section className="rounded-lg border border-border bg-surface p-4 sm:col-span-2 lg:col-span-3">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
          Escala de pilotos (dados do seed — edição de verdade chega na Fase 7)
        </h2>
        <ul className="flex flex-col gap-2">
          {snapshot.scheduleRows.map((row) => (
            <li
              key={row.id}
              className={`flex items-center justify-between rounded-md px-3 py-2 text-sm ${
                row.status === "ACTIVE" ? "border-l-2 border-brand bg-surface-raised" : ""
              } ${row.status === "DONE" ? "opacity-50 line-through" : ""}`}
            >
              <span className="font-mono tabular-nums">{row.plannedLabel}</span>
              <span>{snapshot.drivers.find((d) => d.id === row.driverId)?.name ?? "—"}</span>
              <span className="text-text-muted">{row.durationMinutes}min</span>
            </li>
          ))}
        </ul>
      </section>

      <PlaceholderCard title="Danos" note="Fase 10" />
      <PlaceholderCard title="Pit stop" note="Fase 11" />
      <PlaceholderCard title="Timeline" note="Fase 12" />
      <PlaceholderCard title="Alertas" note="Fase 13" />
    </div>
  );
}

function PlaceholderCard({ title, note }: { title: string; note: string }) {
  return (
    <section className="rounded-lg border border-dashed border-border bg-surface/50 p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-text-muted">{title}</h2>
      <p className="mt-2 text-sm text-text-muted">Chega na {note}.</p>
    </section>
  );
}
