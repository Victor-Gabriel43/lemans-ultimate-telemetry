"use client";

import { colorForName } from "@lmu/shared";
import { useRoomStore } from "@/state/roomStore";

/**
 * "Quem está pilotando agora" — deriva da linha ACTIVE da planilha de
 * escala (Fase 7), não guarda estado próprio. Enquanto a Fase 7 não
 * existir de verdade, reflete o que já vier do seed/dashboard:update.
 */
export function CurrentDriverCard() {
  const snapshot = useRoomStore((s) => s.snapshot)!;
  const activeRow = snapshot.scheduleRows.find((r) => r.status === "ACTIVE");
  const driver = activeRow ? snapshot.drivers.find((d) => d.id === activeRow.driverId) : undefined;

  return (
    <section className="rounded-lg border border-border bg-surface p-4">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-muted">Pilotando agora</h2>
      {driver ? (
        <div className="flex items-center gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-brand-fg"
            style={{ backgroundColor: driver.colorHex || colorForName(driver.id) }}
            aria-hidden
          >
            {driver.name.slice(0, 2).toUpperCase()}
          </span>
          <div>
            <p className="font-medium">{driver.name}</p>
            <p className="text-sm text-text-muted">desde {activeRow?.plannedLabel}</p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-text-muted">Nenhum stint ativo na escala.</p>
      )}
    </section>
  );
}
