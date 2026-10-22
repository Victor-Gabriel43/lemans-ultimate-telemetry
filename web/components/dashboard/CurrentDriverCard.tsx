"use client";

import { User } from "lucide-react";
import { colorForName } from "@lmu/shared";
import { useRoomStore } from "@/state/roomStore";
import { Panel, Metric } from "@/components/ui/Panel";
import { useValueFlash } from "@/lib/useValueFlash";

/**
 * "Quem está pilotando agora" — deriva da linha ACTIVE da planilha de escala,
 * não guarda estado próprio.
 */
export function CurrentDriverCard() {
  const snapshot = useRoomStore((s) => s.snapshot)!;
  const { room } = snapshot;
  const activeRow = snapshot.scheduleRows.find((r) => r.status === "ACTIVE");
  const driver = activeRow ? snapshot.drivers.find((d) => d.id === activeRow.driverId) : undefined;
  const flash = useValueFlash(driver?.id ?? null);

  return (
    <Panel title="Current Driver" icon={<User size={13} aria-hidden />} className="lg:col-span-4">
      {driver ? (
        <div className={`flex flex-col gap-4 ${flash}`}>
          <div className="flex items-center gap-3 border-l-2 border-brand pl-3">
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center font-mono text-sm font-semibold text-brand-fg"
              style={{ backgroundColor: driver.colorHex || colorForName(driver.id) }}
              aria-hidden
            >
              {driver.name.slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold leading-tight">{driver.name}</p>
              <p className="eyebrow mt-0.5">Desde {activeRow?.plannedLabel || "—"}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Metric label="Car" value={room.car ? room.car.split(" ")[0] : "—"} size="sm" />
            <Metric label="Lap" value={room.currentLap != null ? String(room.currentLap) : "—"} size="sm" />
            <Metric label="Pos" value={room.position != null ? `P${room.position}` : "—"} size="sm" />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-text-muted">Nenhum stint ativo na escala.</p>
          <p className="text-xs text-text-dim">
            Marque uma linha da escala como “Em andamento” para destacar o piloto no volante.
          </p>
        </div>
      )}
    </Panel>
  );
}
