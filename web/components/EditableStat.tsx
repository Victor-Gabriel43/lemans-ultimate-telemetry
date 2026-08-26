"use client";

import { useState } from "react";

/**
 * Estatística clicável pra editar (sem modal — clica, vira input, Enter/blur
 * salva, Esc cancela). Usada nos números manuais do dashboard (Fase 6) antes
 * de existir telemetria de verdade (Fase 14).
 */
export function EditableStat({
  label,
  value,
  displayValue,
  unit,
  onSave,
}: {
  label: string;
  value: number | null;
  displayValue: string;
  unit?: string;
  onSave: (value: number | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  function startEdit() {
    setDraft(value != null ? String(value) : "");
    setEditing(true);
  }

  function commit() {
    const trimmed = draft.trim();
    if (trimmed === "") {
      onSave(null);
    } else {
      const num = Number(trimmed.replace(",", "."));
      if (Number.isFinite(num)) onSave(num);
    }
    setEditing(false);
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wide text-text-muted">{label}</span>
      {editing ? (
        <input
          autoFocus
          type="text"
          inputMode="decimal"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") setEditing(false);
          }}
          className="w-full min-w-0 rounded-md border border-brand bg-surface-raised px-2 py-1 font-mono text-xl tabular-nums focus:outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={startEdit}
          className="cursor-pointer rounded-md px-2 py-1 text-left font-mono text-xl tabular-nums transition-colors hover:bg-surface-raised"
        >
          {displayValue}
          {unit && <span className="ml-1 text-sm font-sans text-text-muted">{unit}</span>}
        </button>
      )}
    </div>
  );
}
