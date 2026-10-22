"use client";

import { useState } from "react";

/**
 * Estatística clicável pra editar (sem modal — clica, vira input, Enter/blur
 * salva, Esc cancela). Usada nos números manuais do dashboard enquanto não
 * há telemetria de verdade alimentando esses campos.
 */
export function EditableStat({
  label,
  value,
  displayValue,
  unit,
  onSave,
  className = "",
}: {
  label: string;
  value: number | null;
  displayValue: string;
  unit?: string;
  onSave: (value: number | null) => void;
  className?: string;
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
    <div className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <span className="eyebrow">{label}</span>
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
          className="w-full min-w-0 border border-brand bg-surface-raised px-1.5 py-1 font-mono text-xl font-medium tabular-nums focus:outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={startEdit}
          title="Clique para editar"
          className="-mx-1.5 cursor-pointer rounded-none px-1.5 py-1 text-left font-mono text-xl font-medium leading-none tabular-nums transition-colors hover:bg-surface-raised"
        >
          {displayValue}
          {unit && <span className="ml-1 text-[0.55em] font-normal text-text-muted">{unit}</span>}
        </button>
      )}
    </div>
  );
}
