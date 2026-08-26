"use client";

import { useEffect, useState } from "react";
import { Wrench } from "lucide-react";
import { useRoomStore } from "@/state/roomStore";
import { estimatePitStopSeconds } from "@/lib/pitStopStats";
import { formatClock } from "@/lib/format";
import { resolveMemberName } from "@/lib/members";
import { formatRelativeTime } from "@/lib/relativeTime";

const COMPOUNDS = ["Macio", "Médio", "Duro", "Chuva"];

export function PitStopPanel() {
  const snapshot = useRoomStore((s) => s.snapshot)!;
  const startPitStop = useRoomStore((s) => s.startPitStop);
  const completePitStop = useRoomStore((s) => s.completePitStop);
  const { pitStops, damageLog, scheduleRows, drivers, members, room } = snapshot;

  const inProgress = pitStops.find((p) => !p.completedAt) ?? null;
  const activeDamage = damageLog.filter((d) => !d.repairedAt);
  const completedStops = pitStops.filter((p) => p.completedAt);

  const [fuelInput, setFuelInput] = useState("");
  const [tireCompound, setTireCompound] = useState("");
  const [includeDriverChange, setIncludeDriverChange] = useState(false);
  const [repairIds, setRepairIds] = useState<string[]>([]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!inProgress) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [inProgress]);

  const nextPlannedRow = (() => {
    const activeIdx = scheduleRows.findIndex((r) => r.status === "ACTIVE");
    const from = activeIdx === -1 ? 0 : activeIdx + 1;
    return scheduleRows.find((r, i) => i >= from && r.status === "PLANNED") ?? null;
  })();
  const nextDriverName = nextPlannedRow ? drivers.find((d) => d.id === nextPlannedRow.driverId)?.name : null;

  const plan = {
    fuelAddedLiters: fuelInput ? Number(fuelInput.replace(",", ".")) : null,
    tireChangeCompound: tireCompound || null,
    includeDriverChange,
    repairDamageIds: repairIds,
  };
  const estimatedSeconds = estimatePitStopSeconds(plan, room.settings, activeDamage);

  function toggleRepair(id: string) {
    setRepairIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function handleStart() {
    startPitStop({ lap: room.currentLap, ...plan });
    setFuelInput("");
    setTireCompound("");
    setIncludeDriverChange(false);
    setRepairIds([]);
  }

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4 sm:col-span-2 lg:col-span-3">
      <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
        <Wrench size={14} aria-hidden />
        Pit stop
      </h2>

      {inProgress ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-brand/40 bg-brand/10 px-4 py-3">
            <div>
              <p className="text-sm text-text-muted">Pit stop em andamento</p>
              <p className="font-mono text-2xl tabular-nums">
                {formatClock((now - new Date(inProgress.startedAt).getTime()) / 1000)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => completePitStop(inProgress.id)}
              className="min-h-12 cursor-pointer rounded-md bg-brand px-4 py-3 font-medium text-brand-fg transition-opacity hover:opacity-90"
            >
              Concluir pit stop
            </button>
          </div>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-text-muted">
            {inProgress.fuelAddedLiters != null && <li>Abastecer {inProgress.fuelAddedLiters}L</li>}
            {inProgress.tireChangeCompound && <li>Trocar pneu: {inProgress.tireChangeCompound}</li>}
            {inProgress.includeDriverChange && <li>Trocar piloto</li>}
            {(inProgress.repairs?.length ?? 0) > 0 && <li>Reparar {inProgress.repairs?.length} dano(s)</li>}
          </ul>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex flex-col gap-1 text-xs text-text-muted">
              Abastecer (L)
              <input
                type="text"
                inputMode="decimal"
                value={fuelInput}
                onChange={(e) => setFuelInput(e.target.value)}
                placeholder="0"
                className="rounded-md border border-border bg-surface-raised px-2 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-text-muted">
              Trocar pneu
              <select
                value={tireCompound}
                onChange={(e) => setTireCompound(e.target.value)}
                className="cursor-pointer rounded-md border border-border bg-surface-raised px-2 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <option value="">Manter</option>
                {COMPOUNDS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 self-end text-sm">
              <input
                type="checkbox"
                checked={includeDriverChange}
                onChange={(e) => setIncludeDriverChange(e.target.checked)}
                className="h-4 w-4 cursor-pointer accent-brand"
              />
              Trocar piloto
              {includeDriverChange && (
                <span className="text-text-muted">{nextDriverName ? `→ ${nextDriverName}` : "(nenhum planejado)"}</span>
              )}
            </label>
            <div className="flex flex-col gap-1 self-end text-xs text-text-muted">
              Tempo estimado
              <span className="font-mono text-lg tabular-nums text-text">{estimatedSeconds}s</span>
            </div>
          </div>

          {activeDamage.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-text-muted">Reparos</span>
              <div className="flex flex-wrap gap-2">
                {activeDamage.map((d) => (
                  <label
                    key={d.id}
                    className="flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-surface-raised px-2 py-1 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={repairIds.includes(d.id)}
                      onChange={() => toggleRepair(d.id)}
                      className="h-4 w-4 cursor-pointer accent-brand"
                    />
                    {d.part}
                  </label>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleStart}
            className="min-h-12 w-fit cursor-pointer rounded-md bg-brand px-4 py-3 font-medium text-brand-fg transition-opacity hover:opacity-90"
          >
            Iniciar pit stop
          </button>
        </div>
      )}

      {completedStops.length > 0 && (
        <div className="border-t border-border pt-3">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Histórico</h3>
          <ul className="flex flex-col gap-1.5 text-sm">
            {completedStops.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-1 text-text-muted">
                <span>
                  {p.lap != null ? `Volta ${p.lap}` : "—"} · {p.durationSeconds}s ·{" "}
                  {[
                    p.fuelAddedLiters != null && `+${p.fuelAddedLiters}L`,
                    p.tireChangeCompound && `pneu ${p.tireChangeCompound}`,
                    p.driverChangeToId && "troca de piloto",
                    (p.repairs?.length ?? 0) > 0 && `${p.repairs?.length} reparo(s)`,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "nada"}
                </span>
                <span>
                  {resolveMemberName(members, p.createdBy)} · {formatRelativeTime(p.completedAt ?? p.startedAt)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
