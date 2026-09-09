"use client";

import { useEffect, useState } from "react";
import { Wrench } from "lucide-react";
import { useRoomStore } from "@/state/roomStore";
import { estimatePitStopSeconds } from "@/lib/pitStopStats";
import { formatClock } from "@/lib/format";
import { resolveMemberName } from "@/lib/members";
import { formatRelativeTime } from "@/lib/relativeTime";
import { Panel, Metric, primaryButton, ghostButton, fieldInput, StatusDot } from "@/components/ui/Panel";

const COMPOUNDS = ["Macio", "Médio", "Duro", "Chuva"];

export function PitStopPanel() {
  const snapshot = useRoomStore((s) => s.snapshot)!;
  const startPitStop = useRoomStore((s) => s.startPitStop);
  const completePitStop = useRoomStore((s) => s.completePitStop);
  const cancelPitStop = useRoomStore((s) => s.cancelPitStop);
  const { pitStops, damageLog, scheduleRows, drivers, members, room } = snapshot;

  const inProgress = pitStops.find((p) => !p.completedAt) ?? null;
  const activeDamage = damageLog.filter((d) => !d.repairedAt);
  const completedStops = pitStops.filter((p) => p.completedAt);

  const [fuelInput, setFuelInput] = useState("");
  const [tireCompound, setTireCompound] = useState("");
  const [includeDriverChange, setIncludeDriverChange] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState("");
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
    // Vazio = deixa o servidor decidir (próxima linha PLANNED da escala, comportamento antigo).
    driverChangeToId: includeDriverChange ? selectedDriverId || null : null,
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
    setSelectedDriverId("");
    setRepairIds([]);
  }

  return (
    <Panel title="Pit Stop Planner" icon={<Wrench size={13} aria-hidden />} className="lg:col-span-8">
      {inProgress ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3 border border-status-warning/50 bg-status-warning/10 px-4 py-3">
            <div className="flex items-center gap-3">
              <StatusDot tone="warning" pulse />
              <div>
                <p className="eyebrow text-status-warning">Pit stop em andamento</p>
                <p className="font-mono text-3xl font-medium tabular-nums">
                  {formatClock((now - new Date(inProgress.startedAt).getTime()) / 1000)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => cancelPitStop(inProgress.id)} className={ghostButton}>
                Cancelar
              </button>
              <button type="button" onClick={() => completePitStop(inProgress.id)} className={primaryButton}>
                Concluir pit stop
              </button>
            </div>
          </div>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-text-muted">
            {inProgress.fuelAddedLiters != null && <li>Abastecer {inProgress.fuelAddedLiters}L</li>}
            {inProgress.tireChangeCompound && <li>Trocar pneu: {inProgress.tireChangeCompound}</li>}
            {inProgress.includeDriverChange && (
              <li>
                Trocar piloto
                {inProgress.driverChangeToId
                  ? ` → ${drivers.find((d) => d.id === inProgress.driverChangeToId)?.name ?? "?"}`
                  : nextDriverName
                    ? ` → ${nextDriverName} (próximo da escala)`
                    : " (nenhum planejado)"}
              </li>
            )}
            {(inProgress.repairs?.length ?? 0) > 0 && <li>Reparar {inProgress.repairs?.length} dano(s)</li>}
          </ul>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex flex-col gap-1">
              <span className="eyebrow">Abastecer (L)</span>
              <input
                type="text"
                inputMode="decimal"
                value={fuelInput}
                onChange={(e) => setFuelInput(e.target.value)}
                placeholder="0"
                className={fieldInput}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="eyebrow">Trocar pneu</span>
              <select
                value={tireCompound}
                onChange={(e) => setTireCompound(e.target.value)}
                className={`${fieldInput} cursor-pointer`}
              >
                <option value="">Manter</option>
                {COMPOUNDS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="eyebrow">Troca de piloto</span>
              <span className="flex items-center gap-2 py-2">
                <input
                  type="checkbox"
                  checked={includeDriverChange}
                  onChange={(e) => setIncludeDriverChange(e.target.checked)}
                  className="h-4 w-4 cursor-pointer accent-brand"
                />
                {includeDriverChange ? "Sim" : "Não"}
              </span>
              {includeDriverChange && (
                <select
                  value={selectedDriverId}
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                  className={`${fieldInput} cursor-pointer`}
                  aria-label="Piloto que assume no pit stop"
                >
                  <option value="">
                    {nextDriverName ? `Automático (${nextDriverName})` : "Automático (próximo da escala)"}
                  </option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              )}
            </label>
            <Metric label="Tempo estimado" value={String(estimatedSeconds)} unit="s" />
          </div>

          {activeDamage.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="eyebrow">Reparos</span>
              <div className="flex flex-wrap gap-2">
                {activeDamage.map((d) => (
                  <label
                    key={d.id}
                    className="flex cursor-pointer items-center gap-1.5 border border-border bg-surface-raised px-2 py-1 text-sm"
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

          <button type="button" onClick={handleStart} className={`${primaryButton} w-fit`}>
            Iniciar pit stop
          </button>
        </div>
      )}

      {completedStops.length > 0 && (
        <div className="border-t border-border pt-3">
          <h3 className="eyebrow mb-2">Histórico</h3>
          <ul className="flex flex-col gap-1.5 text-sm">
            {completedStops.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-1 text-text-muted">
                <span>
                  {p.lap != null ? `Volta ${p.lap}` : "—"} · {p.durationSeconds}s ·{" "}
                  {[
                    p.fuelAddedLiters != null && `+${p.fuelAddedLiters}L`,
                    p.tireChangeCompound && `pneu ${p.tireChangeCompound}`,
                    p.driverChangeToId &&
                      `piloto → ${drivers.find((d) => d.id === p.driverChangeToId)?.name ?? "?"}`,
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
    </Panel>
  );
}
