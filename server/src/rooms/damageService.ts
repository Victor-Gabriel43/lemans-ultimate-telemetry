import { prisma } from "../db.js";
import { DEFAULT_ROOM_SETTINGS, type DamageEntry, type DamageSeverity, type EntrySource } from "@lmu/shared";

const SEVERITIES: DamageSeverity[] = ["LIGHT", "MODERATE", "SEVERE"];

function toDamageEntry(db: {
  id: string;
  roomId: string;
  part: string;
  severity: string;
  repairEstimateMinutes: number | null;
  source: string;
  repairedAt: Date | null;
  createdBy: string;
  createdAt: Date;
}): DamageEntry {
  return {
    id: db.id,
    roomId: db.roomId,
    part: db.part,
    severity: db.severity as DamageSeverity,
    repairEstimateMinutes: db.repairEstimateMinutes,
    source: db.source as EntrySource,
    repairedAt: db.repairedAt?.toISOString() ?? null,
    createdBy: db.createdBy,
    createdAt: db.createdAt.toISOString(),
  };
}

export async function listDamageLog(roomId: string): Promise<DamageEntry[]> {
  const rows = await prisma.damageEntry.findMany({ where: { roomId }, orderBy: { createdAt: "asc" } });
  return rows.map(toDamageEntry);
}

export async function logDamageEntry(
  roomId: string,
  part: string,
  severity: string,
  createdBy: string
): Promise<void> {
  const safeSeverity = SEVERITIES.includes(severity as DamageSeverity) ? (severity as DamageSeverity) : "LIGHT";
  const safePart = part.trim().slice(0, 60) || "Não especificado";

  const room = await prisma.room.findUnique({ where: { id: roomId }, select: { settingsJson: true } });
  let repairEstimateMinutes = DEFAULT_ROOM_SETTINGS.damageRepairMinutesPerSeverity[safeSeverity];
  try {
    const settings = JSON.parse(room?.settingsJson ?? "{}");
    const configured = settings?.damageRepairMinutesPerSeverity?.[safeSeverity];
    if (typeof configured === "number") repairEstimateMinutes = configured;
  } catch {
    // usa o default já atribuído acima
  }

  await prisma.damageEntry.create({
    data: {
      roomId,
      part: safePart,
      severity: safeSeverity,
      repairEstimateMinutes,
      source: "MANUAL",
      createdBy,
    },
  });
}

export async function markDamageRepaired(roomId: string, damageId: string): Promise<void> {
  await prisma.damageEntry.update({
    where: { id: damageId, roomId },
    data: { repairedAt: new Date() },
  });
}
