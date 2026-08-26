import { prisma } from "../db.js";
import type { EntrySource, FuelEntry } from "@lmu/shared";

function toFuelEntry(db: {
  id: string;
  roomId: string;
  lap: number;
  litersUsed: number | null;
  litersRemaining: number | null;
  source: string;
  createdBy: string;
  createdAt: Date;
}): FuelEntry {
  return {
    id: db.id,
    roomId: db.roomId,
    lap: db.lap,
    litersUsed: db.litersUsed,
    litersRemaining: db.litersRemaining,
    source: db.source as EntrySource,
    createdBy: db.createdBy,
    createdAt: db.createdAt.toISOString(),
  };
}

export async function listFuelLog(roomId: string): Promise<FuelEntry[]> {
  const rows = await prisma.fuelEntry.findMany({ where: { roomId }, orderBy: { createdAt: "asc" } });
  return rows.map(toFuelEntry);
}

export interface LogFuelInput {
  lap: number;
  litersUsed: number | null;
  litersRemaining: number | null;
  source: EntrySource;
  createdBy: string;
}

export async function logFuelEntry(roomId: string, input: LogFuelInput): Promise<void> {
  if (!Number.isFinite(input.lap) || input.lap < 0) return;
  const litersUsed =
    typeof input.litersUsed === "number" && Number.isFinite(input.litersUsed) ? input.litersUsed : null;
  const litersRemaining =
    typeof input.litersRemaining === "number" && Number.isFinite(input.litersRemaining)
      ? input.litersRemaining
      : null;
  if (litersUsed === null && litersRemaining === null) return; // nada pra registrar

  await prisma.fuelEntry.create({
    data: {
      roomId,
      lap: Math.round(input.lap),
      litersUsed,
      litersRemaining,
      source: input.source === "TELEMETRY" ? "TELEMETRY" : "MANUAL",
      createdBy: input.createdBy,
    },
  });
}
