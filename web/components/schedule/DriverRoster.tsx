"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { useRoomStore } from "@/state/roomStore";

/**
 * Roster de pilotos da sala — adicionar / renomear / remover. Os pilotos aqui
 * são o que alimenta o seletor "Piloto" da escala (ScheduleSheet). Sem eles a
 * escala não tem quem escalar.
 *
 * Tudo via os eventos de socket `driver:*` (mesmo mecanismo de tempo real dos
 * outros domínios) — a mudança aparece pra todo mundo na hora.
 */
export function DriverRoster() {
  const snapshot = useRoomStore((s) => s.snapshot)!;
  const addDriver = useRoomStore((s) => s.addDriver);
  const updateDriver = useRoomStore((s) => s.updateDriver);
  const removeDriver = useRoomStore((s) => s.removeDriver);
  const { drivers } = snapshot;

  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  function submitNew(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    addDriver(name);
    setNewName("");
  }

  function commitRename(id: string) {
    const name = draft.trim();
    if (name) updateDriver(id, { name });
    setEditingId(null);
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <span className="eyebrow">Pilotos da equipe</span>
        <span className="font-mono text-[0.65rem] text-text-dim">{drivers.length}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {drivers.map((d) => (
          <span
            key={d.id}
            className="flex items-center gap-2 border border-border bg-surface-raised py-1 pl-2 pr-1"
          >
            <span className="h-2.5 w-2.5 shrink-0" style={{ backgroundColor: d.colorHex }} aria-hidden />
            {editingId === d.id ? (
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={() => commitRename(d.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitRename(d.id);
                  if (e.key === "Escape") setEditingId(null);
                }}
                className="w-24 border-none bg-transparent text-sm text-text focus:outline-none"
              />
            ) : (
              <button
                type="button"
                onClick={() => {
                  setEditingId(d.id);
                  setDraft(d.name);
                }}
                className="cursor-pointer text-sm transition-colors hover:text-brand"
                title="Renomear piloto"
              >
                {d.name}
              </button>
            )}
            <button
              type="button"
              onClick={() => removeDriver(d.id)}
              aria-label={`Remover ${d.name}`}
              title="Remover piloto"
              className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center text-text-dim transition-colors hover:text-status-critical"
            >
              <X size={13} />
            </button>
          </span>
        ))}

        <form onSubmit={submitNew} className="flex items-center gap-1.5">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Novo piloto"
            maxLength={40}
            className="w-32 border border-border bg-surface-raised px-2 py-1.5 text-sm placeholder:text-text-dim focus:border-brand focus:outline-none"
          />
          <button
            type="submit"
            aria-label="Adicionar piloto"
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center border border-brand bg-brand text-brand-fg transition-opacity hover:opacity-90 disabled:opacity-40"
            disabled={!newName.trim()}
          >
            <Plus size={15} />
          </button>
        </form>
      </div>

      {drivers.length === 0 && (
        <p className="text-xs text-text-dim">
          Adicione os pilotos da equipe para poder montar a escala de stints.
        </p>
      )}
    </div>
  );
}
