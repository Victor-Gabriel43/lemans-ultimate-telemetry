import { prisma } from "../db.js";
import type { EntrySource, TireEntry } from "@lmu/shared";

function toTireEntry(db: {
  id: string;
  roomId: string;
  compound: string;
  stintStartLap: number;
  ageLaps: number;
  wearPercent: number | null;
  source: string;
  createdBy: string;
  createdAt: Date;
}): TireEntry {
  return {
    id: db.id,
    roomId: db.roomId,
    compound: db.compound,
    stintStartLap: db.stintStartLap,
    ageLaps: db.ageLaps,
    wearPercent: db.wearPercent,
    source: db.source as EntrySource,
    createdBy: db.createdBy,
    createdAt: db.createdAt.toISOString(),
  };
}

export async function listTireLog(roomId: string): Promise<TireEntry[]> {
  const rows = await prisma.tireEntry.findMany({ where: { roomId }, orderBy: { createdAt: "asc" } });
  return rows.map(toTireEntry);
}

const KNOWN_COMPOUNDS = ["Macio", "Médio", "Duro", "Chuva"];

/** Começa um stint de pneu novo — a volta de início vem do `currentLap` atual da sala (0 se ainda não houver). */
export async function startNewTireStint(roomId: string, compound: string, createdBy: string): Promise<void> {
  const room = await prisma.room.findUnique({ where: { id: roomId }, select: { currentLap: true } });
  if (!room) return;
  const safeCompound = KNOWN_COMPOUNDS.includes(compound) ? compound : compound.trim().slice(0, 40) || "Médio";

  await prisma.tireEntry.create({
    data: {
      roomId,
      compound: safeCompound,
      stintStartLap: room.currentLap ?? 0,
      ageLaps: 0,
      source: "MANUAL",
      createdBy,
    },
  });
}
