import { prisma } from "../db.js";
import type { ScheduleRow, ScheduleStatus } from "@lmu/shared";
import { toScheduleRow } from "./roomService.js";

const STATUS_VALUES: ScheduleStatus[] = ["PLANNED", "ACTIVE", "DONE"];

export async function listScheduleRows(roomId: string): Promise<ScheduleRow[]> {
  const rows = await prisma.scheduleRow.findMany({ where: { roomId }, orderBy: { order: "asc" } });
  return rows.map(toScheduleRow);
}

export async function addScheduleRow(
  roomId: string,
  afterRowId: string | undefined,
  updatedBy: string
): Promise<void> {
  const rows = await prisma.scheduleRow.findMany({ where: { roomId }, orderBy: { order: "asc" } });

  let order: number;
  if (rows.length === 0) {
    order = 1;
  } else if (!afterRowId) {
    order = rows[rows.length - 1].order + 1;
  } else {
    const idx = rows.findIndex((r) => r.id === afterRowId);
    if (idx === -1) {
      order = rows[rows.length - 1].order + 1;
    } else if (idx === rows.length - 1) {
      order = rows[idx].order + 1;
    } else {
      order = (rows[idx].order + rows[idx + 1].order) / 2;
    }
  }

  await prisma.scheduleRow.create({
    data: {
      roomId,
      order,
      plannedLabel: "",
      driverId: null,
      status: "PLANNED",
      durationMinutes: 60,
      notes: "",
      updatedBy,
    },
  });
}

interface SanitizedScheduleRowPatch {
  plannedLabel?: string;
  driverId?: string | null;
  status?: ScheduleStatus;
  durationMinutes?: number;
  notes?: string;
}

function sanitizeScheduleRowPatch(patch: Partial<ScheduleRow>): SanitizedScheduleRowPatch {
  const clean: SanitizedScheduleRowPatch = {};
  if (typeof patch.plannedLabel === "string") clean.plannedLabel = patch.plannedLabel.slice(0, 500);
  if ("driverId" in patch) clean.driverId = patch.driverId === null ? null : String(patch.driverId);
  if (typeof patch.status === "string" && STATUS_VALUES.includes(patch.status)) clean.status = patch.status;
  if (typeof patch.durationMinutes === "number" && Number.isFinite(patch.durationMinutes) && patch.durationMinutes >= 0) {
    clean.durationMinutes = patch.durationMinutes;
  }
  if (typeof patch.notes === "string") clean.notes = patch.notes.slice(0, 500);
  return clean;
}

export async function updateScheduleRow(
  roomId: string,
  rowId: string,
  patch: Partial<ScheduleRow>,
  updatedBy: string
): Promise<void> {
  const clean = sanitizeScheduleRowPatch(patch);
  if (Object.keys(clean).length === 0) return;
  await prisma.scheduleRow.update({
    where: { id: rowId, roomId },
    data: { ...clean, updatedBy },
  });
}

export async function removeScheduleRow(roomId: string, rowId: string): Promise<void> {
  await prisma.scheduleRow.deleteMany({ where: { id: rowId, roomId } });
}

export async function reorderScheduleRow(
  roomId: string,
  rowId: string,
  direction: "up" | "down",
  updatedBy: string
): Promise<void> {
  const rows = await prisma.scheduleRow.findMany({ where: { roomId }, orderBy: { order: "asc" } });
  const idx = rows.findIndex((r) => r.id === rowId);
  if (idx === -1) return;

  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= rows.length) return; // já está na ponta, não faz nada

  const current = rows[idx];
  const other = rows[swapIdx];

  await prisma.$transaction([
    prisma.scheduleRow.update({ where: { id: current.id }, data: { order: other.order, updatedBy } }),
    prisma.scheduleRow.update({ where: { id: other.id }, data: { order: current.order } }),
  ]);
}

/**
 * Usado pela conclusão do pit stop (Fase 11) quando inclui troca de piloto:
 * marca a linha ACTIVE atual como DONE e a próxima linha PLANNED (na ordem
 * da planilha, depois da que virou DONE) como ACTIVE. Retorna o driverId da
 * nova linha ativa (ou null se não havia nenhuma linha PLANNED seguinte).
 */
export async function advanceActiveDriver(roomId: string, updatedBy: string): Promise<string | null> {
  const rows = await prisma.scheduleRow.findMany({ where: { roomId }, orderBy: { order: "asc" } });

  const activeIdx = rows.findIndex((r) => r.status === "ACTIVE");
  const searchFrom = activeIdx === -1 ? 0 : activeIdx + 1;
  const nextIdx = rows.findIndex((r, i) => i >= searchFrom && r.status === "PLANNED");

  const updates = [];
  if (activeIdx !== -1) {
    updates.push(prisma.scheduleRow.update({ where: { id: rows[activeIdx].id }, data: { status: "DONE", updatedBy } }));
  }
  if (nextIdx !== -1) {
    updates.push(prisma.scheduleRow.update({ where: { id: rows[nextIdx].id }, data: { status: "ACTIVE", updatedBy } }));
  }
  if (updates.length > 0) await prisma.$transaction(updates);

  return nextIdx !== -1 ? rows[nextIdx].driverId : null;
}
