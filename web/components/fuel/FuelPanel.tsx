"use client";

import { useState } from "react";
import { Fuel } from "lucide-react";
import { useRoomStore } from "@/state/roomStore";
import { computeFuelStats, litersToRefuel } from "@lmu/shared";

const CRITICAL_LAPS = 1.5;
const WARNING_LAPS = 3;

export function FuelPanel() {
  const snapshot = useRoomStore((s) => s.snapshot)!;
  const logFuel = useRoomStore((s) => s.logFuel);
  const { fuelLog, room } = snapshot;

  const stats = computeFuelStats(fuelLog, room.settings.fuelTankLiters);

  const [lapInput, setLapInput] = useState("");
  const [usedInput, setUsedInput] = useState("");
  const [targetLaps, setTargetLaps] = useState("");

  const nextLap = (room.currentLap ?? fuelLog.length) + 1;

  function submitLap(e: React.FormEvent) {
    e.preventDefault();
    const used = Number(usedInput.replace(",", "."));
    if (!Number.isFinite(used) || used <= 0) return;
    logFuel({ lap: Number(lapInput) || nextLap, litersUsed: used, litersRemaining: null });
    setUsedInput("");
    setLapInput("");
  }

  const statusColor =
    stats.lapsRemaining == null
      ? "text-text"
      : stats.lapsRemaining < CRITICAL_LAPS
        ? "text-status-critical"
        : stats.lapsRemaining < WARNING_LAPS
          ? "text-status-warning"
          : "text-status-ok";

  const refuelLiters = targetLaps ? litersToRefuel(Number(targetLaps), stats) : null;

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4">
      <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
        <Fuel size={14} aria-hidden />
        Combustível
      </h2>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Consumo médio" value={stats.averageConsumption != null ? `${stats.averageConsumption.toFixed(2)}L` : "—"} />
        <Stat label="Restante" value={stats.currentRemaining != null ? `${stats.currentRemaining.toFixed(1)}L` : "—"} />
        <Stat
          label="Voltas restantes"
          value={stats.lapsRemaining != null ? stats.lapsRemaining.toFixed(1) : "—"}
          className={statusColor}
        />
      </div>

      <form onSubmit={submitLap} className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-xs text-text-muted">
          Volta
          <input
            type="number"
            min={0}
            placeholder={String(nextLap)}
            value={lapInput}
            onChange={(e) => setLapInput(e.target.value)}
            className="w-20 rounded-md border border-border bg-surface-raised px-2 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-text-muted">
          Litros usados
          <input
            type="text"
            inputMode="decimal"
            required
            value={usedInput}
            onChange={(e) => setUsedInput(e.target.value)}
            className="w-24 rounded-md border border-border bg-surface-raised px-2 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          />
        </label>
        <button
          type="submit"
          className="min-h-9 cursor-pointer rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-brand-fg transition-opacity hover:opacity-90"
        >
          Registrar
        </button>
      </form>

      <div className="flex flex-wrap items-end gap-2 border-t border-border pt-3">
        <label className="flex flex-col gap-1 text-xs text-text-muted">
          Completar quantas voltas?
          <input
            type="number"
            min={0}
            value={targetLaps}
            onChange={(e) => setTargetLaps(e.target.value)}
            className="w-24 rounded-md border border-border bg-surface-raised px-2 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          />
        </label>
        <p className="text-sm text-text-muted">
          {refuelLiters != null ? (
            <>
              Abastecer <span className="font-mono font-medium text-text tabular-nums">{refuelLiters.toFixed(1)}L</span>
            </>
          ) : (
            "Registre pelo menos uma volta pra calcular"
          )}
        </p>
      </div>
    </section>
  );
}

function Stat({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-text-muted">{label}</span>
      <span className={`font-mono text-lg tabular-nums ${className}`}>{value}</span>
    </div>
  );
}
