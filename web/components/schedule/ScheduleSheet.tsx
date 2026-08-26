"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import type { ScheduleRow, ScheduleStatus } from "@lmu/shared";
import { useRoomStore } from "@/state/roomStore";
import { resolveMemberName } from "@/lib/members";
import { EditedByBadge } from "@/components/EditedByBadge";

type TextColumn = "plannedLabel" | "notes";
type NumberColumn = "durationMinutes";
type EditingCell = { rowId: string; column: TextColumn | NumberColumn } | null;

const STATUS_LABEL: Record<ScheduleStatus, string> = {
  PLANNED: "Planejado",
  ACTIVE: "Em andamento",
  DONE: "Concluído",
};

export function ScheduleSheet() {
  const snapshot = useRoomStore((s) => s.snapshot)!;
  const { scheduleRows, drivers, members } = snapshot;
  const addRow = useRoomStore((s) => s.addScheduleRow);
  const updateRow = useRoomStore((s) => s.updateScheduleRow);
  const removeRow = useRoomStore((s) => s.removeScheduleRow);
  const reorderRow = useRoomStore((s) => s.reorderScheduleRow);

  const [editingCell, setEditingCell] = useState<EditingCell>(null);

  function moveToNextRow(rowId: string, column: TextColumn | NumberColumn) {
    const idx = scheduleRows.findIndex((r) => r.id === rowId);
    const next = scheduleRows[idx + 1];
    setEditingCell(next ? { rowId: next.id, column } : null);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[860px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-raised text-left text-xs uppercase tracking-wide text-text-muted">
              <Th>Horário / volta</Th>
              <Th>Piloto</Th>
              <Th>Status</Th>
              <Th>Duração (min)</Th>
              <Th>Observações</Th>
              <Th>Editado por</Th>
              <Th className="text-right">Ações</Th>
            </tr>
          </thead>
          <tbody>
            {scheduleRows.map((row, idx) => (
              <Row
                key={row.id}
                row={row}
                isFirst={idx === 0}
                isLast={idx === scheduleRows.length - 1}
                drivers={drivers}
                editorName={resolveMemberName(members, row.updatedBy)}
                editingCell={editingCell}
                onStartEdit={(column) => setEditingCell({ rowId: row.id, column })}
                onStopEdit={() => setEditingCell(null)}
                onCommitAndAdvance={(column) => moveToNextRow(row.id, column)}
                onUpdate={(patch) => updateRow(row.id, patch)}
                onRemove={() => removeRow(row.id)}
                onMoveUp={() => reorderRow(row.id, "up")}
                onMoveDown={() => reorderRow(row.id, "down")}
              />
            ))}
            {scheduleRows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-text-muted">
                  Nenhum stint na escala ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={() => addRow(scheduleRows.at(-1)?.id)}
        className="flex min-h-11 w-fit cursor-pointer items-center gap-2 rounded-md border border-dashed border-border px-3 py-2 text-sm text-text-muted transition-colors hover:border-brand hover:text-text"
      >
        <Plus size={16} aria-hidden />
        Adicionar stint
      </button>
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-3 py-2 font-semibold ${className}`}>{children}</th>;
}

function Row({
  row,
  isFirst,
  isLast,
  drivers,
  editorName,
  editingCell,
  onStartEdit,
  onStopEdit,
  onCommitAndAdvance,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  row: ScheduleRow;
  isFirst: boolean;
  isLast: boolean;
  drivers: { id: string; name: string; colorHex: string }[];
  editorName: string;
  editingCell: EditingCell;
  onStartEdit: (column: TextColumn | NumberColumn) => void;
  onStopEdit: () => void;
  onCommitAndAdvance: (column: TextColumn | NumberColumn) => void;
  onUpdate: (patch: Partial<ScheduleRow>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const rowClasses = [
    "border-b border-border last:border-b-0",
    row.status === "ACTIVE" ? "border-l-2 border-l-brand bg-surface-raised" : "",
    row.status === "DONE" ? "text-text-muted line-through opacity-60" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <tr className={rowClasses}>
      <TextCell
        value={row.plannedLabel}
        placeholder="ex: 00:00"
        isEditing={editingCell?.rowId === row.id && editingCell.column === "plannedLabel"}
        onStartEdit={() => onStartEdit("plannedLabel")}
        onStopEdit={onStopEdit}
        onCommit={(v) => onUpdate({ plannedLabel: v })}
        onAdvance={() => onCommitAndAdvance("plannedLabel")}
      />

      <td className="px-3 py-2">
        <select
          value={row.driverId ?? ""}
          onChange={(e) => onUpdate({ driverId: e.target.value || null })}
          className="w-full min-w-[110px] cursor-pointer rounded-md border border-transparent bg-transparent px-1.5 py-1 hover:border-border hover:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <option value="">—</option>
          {drivers.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </td>

      <td className="px-3 py-2">
        <select
          value={row.status}
          onChange={(e) => onUpdate({ status: e.target.value as ScheduleStatus })}
          className="w-full min-w-[140px] cursor-pointer rounded-md border border-transparent bg-transparent px-1.5 py-1 hover:border-border hover:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          {(Object.keys(STATUS_LABEL) as ScheduleStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </td>

      <NumberCell
        value={row.durationMinutes}
        isEditing={editingCell?.rowId === row.id && editingCell.column === "durationMinutes"}
        onStartEdit={() => onStartEdit("durationMinutes")}
        onStopEdit={onStopEdit}
        onCommit={(v) => onUpdate({ durationMinutes: v })}
        onAdvance={() => onCommitAndAdvance("durationMinutes")}
      />

      <TextCell
        value={row.notes}
        placeholder="—"
        isEditing={editingCell?.rowId === row.id && editingCell.column === "notes"}
        onStartEdit={() => onStartEdit("notes")}
        onStopEdit={onStopEdit}
        onCommit={(v) => onUpdate({ notes: v })}
        onAdvance={() => onCommitAndAdvance("notes")}
      />

      <td className="px-3 py-2 align-top">
        <EditedByBadge name={editorName} at={row.updatedAt} />
      </td>

      <td className="px-3 py-2">
        <div className="flex items-center justify-end gap-1">
          <IconButton label="Mover pra cima" onClick={onMoveUp} disabled={isFirst}>
            <ArrowUp size={15} />
          </IconButton>
          <IconButton label="Mover pra baixo" onClick={onMoveDown} disabled={isLast}>
            <ArrowDown size={15} />
          </IconButton>
          <IconButton label="Remover stint" onClick={onRemove} variant="danger">
            <Trash2 size={15} />
          </IconButton>
        </div>
      </td>
    </tr>
  );
}

function IconButton({
  children,
  label,
  onClick,
  disabled = false,
  variant = "default",
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-md border border-transparent transition-colors hover:border-border hover:bg-surface-raised disabled:cursor-not-allowed disabled:opacity-30 ${
        variant === "danger" ? "hover:border-status-critical/40 hover:text-status-critical" : ""
      }`}
    >
      {children}
    </button>
  );
}

function TextCell({
  value,
  placeholder,
  isEditing,
  onStartEdit,
  onStopEdit,
  onCommit,
  onAdvance,
}: {
  value: string;
  placeholder?: string;
  isEditing: boolean;
  onStartEdit: () => void;
  onStopEdit: () => void;
  onCommit: (value: string) => void;
  onAdvance: () => void;
}) {
  const [draft, setDraft] = useState(value);

  if (!isEditing) {
    return (
      <td className="px-3 py-2">
        <button
          type="button"
          onClick={() => {
            setDraft(value);
            onStartEdit();
          }}
          className="w-full cursor-pointer rounded-md px-1.5 py-1 text-left transition-colors hover:bg-surface-raised"
        >
          {value || <span className="text-text-muted">{placeholder}</span>}
        </button>
      </td>
    );
  }

  return (
    <td className="px-3 py-2">
      <input
        autoFocus
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={(e) => e.currentTarget.select()}
        onBlur={() => {
          onCommit(draft);
          onStopEdit();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onCommit(draft);
            onAdvance();
          } else if (e.key === "Escape") {
            onStopEdit();
          }
        }}
        className="w-full rounded-md border border-brand bg-surface-raised px-1.5 py-1 focus:outline-none"
      />
    </td>
  );
}

function NumberCell({
  value,
  isEditing,
  onStartEdit,
  onStopEdit,
  onCommit,
  onAdvance,
}: {
  value: number;
  isEditing: boolean;
  onStartEdit: () => void;
  onStopEdit: () => void;
  onCommit: (value: number) => void;
  onAdvance: () => void;
}) {
  const [draft, setDraft] = useState(String(value));

  if (!isEditing) {
    return (
      <td className="px-3 py-2">
        <button
          type="button"
          onClick={() => {
            setDraft(String(value));
            onStartEdit();
          }}
          className="w-full cursor-pointer rounded-md px-1.5 py-1 text-left font-mono tabular-nums transition-colors hover:bg-surface-raised"
        >
          {value}
        </button>
      </td>
    );
  }

  function commit() {
    const num = Number(draft.replace(",", "."));
    if (Number.isFinite(num) && num >= 0) onCommit(num);
  }

  return (
    <td className="px-3 py-2">
      <input
        autoFocus
        type="text"
        inputMode="decimal"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={(e) => e.currentTarget.select()}
        onBlur={() => {
          commit();
          onStopEdit();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            commit();
            onAdvance();
          } else if (e.key === "Escape") {
            onStopEdit();
          }
        }}
        className="w-full rounded-md border border-brand bg-surface-raised px-1.5 py-1 font-mono tabular-nums focus:outline-none"
      />
    </td>
  );
}
