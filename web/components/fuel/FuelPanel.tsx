"use client";

import { useState } from "react";
import { Fuel } from "lucide-react";
import { useRoomStore } from "@/state/roomStore";
import { computeFuelStats, litersToRefuel } from "@lmu/shared";
import { Panel, Metric, fieldInput } from "@/components/ui/Panel";
import { useValueFlash } from "@/lib/useValueFlash";

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
  const flash = useValueFlash(stats.currentRemaining);

  function submitLap(e: React.FormEvent) {
    e.preventDefault();
    const used = Number(usedInput.replace(",", "."));
    if (!Number.isFinite(used) || used <= 0) return;
    logFuel({ lap: Number(lapInput) || nextLap, litersUsed: used, litersRemaining: null });
    setUsedInput("");
    setLapInput("");
  }

  const tone =
    stats.lapsRemaining == null
      ? "default"
      : stats.lapsRemaining < CRITICAL_LAPS
        ? "critical"
        : stats.lapsRemaining < WARNING_LAPS
          ? "warning"
          : "ok";

  const fuelPct =
    stats.currentRemaining != null
      ? Math.max(0, Math.min(100, (stats.currentRemaining / room.settings.fuelTankLiters) * 100))
      : null;

  const barColor =
    tone === "critical" ? "bg-status-critical" : tone === "warning" ? "bg-status-warning" : "bg-brand";

  const refuelLiters = targetLaps ? litersToRefuel(Number(targetLaps), stats) : null;

  return (
    <Panel title="Fuel" icon={<Fuel size={13} aria-hidden />} className="lg:col-span-4">
      <div className={`flex flex-col gap-3 ${flash}`}>
        <div className="flex items-end justify-between gap-3">
          <Metric
            label="Restante"
            value={stats.currentRemaining != null ? stats.currentRemaining.toFixed(1) : "—"}
            unit="L"
            size="lg"
            tone={tone}
          />
          <Metric
            label="Voltas rest."
            value={stats.lapsRemaining != null ? stats.lapsRemaining.toFixed(1) : "—"}
            tone={tone}
            className="items-end text-right"
          />
        </div>

        {fuelPct != null && (
          <div className="h-1.5 w-full bg-surface-raised">
            <div className={`h-full ${barColor}`} style={{ width: `${fuelPct}%` }} />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 border-t border-border pt-3">
          <Metric
            label="Consumo médio"
            value={stats.averageConsumption != null ? stats.averageConsumption.toFixed(2) : "—"}
            unit="L/v"
            size="sm"
          />
          <Metric
            label="Nível"
            value={fuelPct != null ? fuelPct.toFixed(0) : "—"}
            unit="%"
            size="sm"
          />
        </div>
      </div>

      <form onSubmit={submitLap} className="flex flex-wrap items-end gap-2 border-t border-border pt-3">
        <label className="flex flex-col gap-1">
          <span className="eyebrow">Volta</span>
          <input
            type="number"
            min={0}
            placeholder={String(nextLap)}
            value={lapInput}
            onChange={(e) => setLapInput(e.target.value)}
            className={`${fieldInput} w-16`}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="eyebrow">Litros usados</span>
          <input
            type="text"
            inputMode="decimal"
            required
            value={usedInput}
            onChange={(e) => setUsedInput(e.target.value)}
            className={`${fieldInput} w-24`}
          />
        </label>
        <button
          type="submit"
          className="min-h-9 cursor-pointer border border-brand bg-brand px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-brand-fg transition-opacity hover:opacity-90"
        >
          Registrar
        </button>
      </form>

      <div className="flex flex-wrap items-end gap-2 border-t border-border pt-3">
        <label className="flex flex-col gap-1">
          <span className="eyebrow">Completar quantas voltas?</span>
          <input
            type="number"
            min={0}
            value={targetLaps}
            onChange={(e) => setTargetLaps(e.target.value)}
            className={`${fieldInput} w-24`}
          />
        </label>
        <p className="pb-1 text-sm text-text-muted">
          {refuelLiters != null ? (
            <>
              Abastecer{" "}
              <span className="font-mono font-medium text-text tabular-nums">{refuelLiters.toFixed(1)}L</span>
            </>
          ) : (
            "Registre uma volta para calcular"
          )}
        </p>
      </div>
    </Panel>
  );
}
