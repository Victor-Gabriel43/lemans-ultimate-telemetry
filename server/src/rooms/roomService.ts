import { prisma } from "../db.js";
import {
  DEFAULT_ROOM_SETTINGS,
  type Room,
  type RoomSettings,
  type RoomSnapshot,
  type Driver,
  type RoomMember,
  type ScheduleRow,
  type PitStop,
  type FuelEntry,
  type TireEntry,
  type DamageEntry,
  type Alert,
  type RaceDurationType,
} from "@lmu/shared";
import type {
  Room as DbRoom,
  Driver as DbDriver,
  RoomMember as DbRoomMember,
  ScheduleRow as DbScheduleRow,
  PitStop as DbPitStop,
  FuelEntry as DbFuelEntry,
  TireEntry as DbTireEntry,
  DamageEntry as DbDamageEntry,
  Alert as DbAlert,
} from "@prisma/client";

// Alfabeto sem caracteres ambíguos (sem O/0, I/1) — código de convite lido em voz alta / digitado no celular.
const INVITE_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateInviteCode(length = 6): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += INVITE_CODE_ALPHABET[Math.floor(Math.random() * INVITE_CODE_ALPHABET.length)];
  }
  return code;
}

async function generateUniqueInviteCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateInviteCode();
    const existing = await prisma.room.findUnique({ where: { inviteCode: code } });
    if (!existing) return code;
  }
  throw new Error("Não foi possível gerar um código de convite único — tente novamente.");
}

export interface CreateRoomInput {
  name: string;
  car: string;
  track?: string;
  raceDurationType: RaceDurationType;
  raceDurationValue: number;
}

export async function createRoom(input: CreateRoomInput): Promise<DbRoom> {
  const inviteCode = await generateUniqueInviteCode();
  return prisma.room.create({
    data: {
      inviteCode,
      name: input.name.trim() || "Corrida sem nome",
      car: input.car.trim() || "Carro não definido",
      track: input.track?.trim() || null,
      raceDurationType: input.raceDurationType,
      raceDurationValue: input.raceDurationValue,
      settingsJson: JSON.stringify(DEFAULT_ROOM_SETTINGS),
    },
  });
}

export async function findRoomByInviteCode(inviteCode: string): Promise<DbRoom | null> {
  return prisma.room.findUnique({ where: { inviteCode: inviteCode.toUpperCase().trim() } });
}

function toRoom(db: DbRoom): Room {
  let settings: RoomSettings;
  try {
    settings = { ...DEFAULT_ROOM_SETTINGS, ...JSON.parse(db.settingsJson) };
  } catch {
    settings = DEFAULT_ROOM_SETTINGS;
  }
  return {
    id: db.id,
    inviteCode: db.inviteCode,
    name: db.name,
    car: db.car,
    track: db.track,
    raceDurationType: db.raceDurationType as RaceDurationType,
    raceDurationValue: db.raceDurationValue,
    raceStartedAt: db.raceStartedAt?.toISOString() ?? null,
    currentLap: db.currentLap,
    position: db.position,
    lastLapTime: db.lastLapTime,
    bestLapTime: db.bestLapTime,
    gapAheadSec: db.gapAheadSec,
    gapBehindSec: db.gapBehindSec,
    settings,
    createdAt: db.createdAt.toISOString(),
    updatedAt: db.updatedAt.toISOString(),
  };
}

function toDriver(db: DbDriver): Driver {
  return { id: db.id, roomId: db.roomId, name: db.name, colorHex: db.colorHex, createdAt: db.createdAt.toISOString() };
}

function toRoomMember(db: DbRoomMember): RoomMember {
  return { userId: db.userId, name: db.name };
}

/** Chamado a cada room:join — mantém o roster durável (userId -> nome) em dia. */
export async function upsertRoomMember(roomId: string, userId: string, name: string): Promise<void> {
  await prisma.roomMember.upsert({
    where: { roomId_userId: { roomId, userId } },
    create: { roomId, userId, name },
    update: { name },
  });
}

export function toScheduleRow(db: DbScheduleRow): ScheduleRow {
  return {
    id: db.id,
    roomId: db.roomId,
    order: db.order,
    plannedLabel: db.plannedLabel,
    driverId: db.driverId,
    status: db.status as ScheduleRow["status"],
    durationMinutes: db.durationMinutes,
    notes: db.notes,
    updatedBy: db.updatedBy,
    updatedAt: db.updatedAt.toISOString(),
  };
}

export function toPitStop(db: DbPitStop): PitStop {
  let repairs: PitStop["repairs"] = null;
  if (db.repairs) {
    try {
      repairs = JSON.parse(db.repairs);
    } catch {
      repairs = null;
    }
  }
  return {
    id: db.id,
    roomId: db.roomId,
    lap: db.lap,
    fuelAddedLiters: db.fuelAddedLiters,
    tireChangeCompound: db.tireChangeCompound,
    includeDriverChange: db.includeDriverChange,
    driverChangeToId: db.driverChangeToId,
    repairs,
    durationSeconds: db.durationSeconds,
    startedAt: db.startedAt.toISOString(),
    completedAt: db.completedAt?.toISOString() ?? null,
    createdBy: db.createdBy,
  };
}

function toFuelEntry(db: DbFuelEntry): FuelEntry {
  return {
    id: db.id,
    roomId: db.roomId,
    lap: db.lap,
    litersUsed: db.litersUsed,
    litersRemaining: db.litersRemaining,
    source: db.source as FuelEntry["source"],
    createdBy: db.createdBy,
    createdAt: db.createdAt.toISOString(),
  };
}

function toTireEntry(db: DbTireEntry): TireEntry {
  return {
    id: db.id,
    roomId: db.roomId,
    compound: db.compound,
    stintStartLap: db.stintStartLap,
    ageLaps: db.ageLaps,
    wearPercent: db.wearPercent,
    source: db.source as TireEntry["source"],
    createdBy: db.createdBy,
    createdAt: db.createdAt.toISOString(),
  };
}

function toDamageEntry(db: DbDamageEntry): DamageEntry {
  return {
    id: db.id,
    roomId: db.roomId,
    part: db.part,
    severity: db.severity as DamageEntry["severity"],
    repairEstimateMinutes: db.repairEstimateMinutes,
    source: db.source as DamageEntry["source"],
    repairedAt: db.repairedAt?.toISOString() ?? null,
    createdBy: db.createdBy,
    createdAt: db.createdAt.toISOString(),
  };
}

function toAlert(db: DbAlert): Alert {
  return {
    id: db.id,
    roomId: db.roomId,
    type: db.type,
    message: db.message,
    severity: db.severity as Alert["severity"],
    createdAt: db.createdAt.toISOString(),
    dismissedAt: db.dismissedAt?.toISOString() ?? null,
  };
}

// Campos "de placar" que qualquer um na sala pode atualizar direto (manual
// ou, na Fase 14, via telemetria). Uma whitelist explícita — nunca aceitar
// um Partial<Room> do cliente e gravar campos arbitrários (id, inviteCode,
// settingsJson etc não devem ser editáveis por esse caminho).
const DASHBOARD_EDITABLE_FIELDS = [
  "raceStartedAt",
  "currentLap",
  "position",
  "lastLapTime",
  "bestLapTime",
  "gapAheadSec",
  "gapBehindSec",
] as const;
type DashboardEditableField = (typeof DASHBOARD_EDITABLE_FIELDS)[number];

export function sanitizeDashboardPatch(patch: Partial<Room>): Partial<Pick<Room, DashboardEditableField>> {
  const clean: Partial<Record<DashboardEditableField, unknown>> = {};
  for (const key of DASHBOARD_EDITABLE_FIELDS) {
    if (!(key in patch)) continue;
    const value = patch[key];
    if (key === "raceStartedAt") {
      clean[key] = value === null ? null : String(value);
    } else if (value === null) {
      clean[key] = null;
    } else if (typeof value === "number" && Number.isFinite(value)) {
      clean[key] = value;
    }
  }
  return clean as Partial<Pick<Room, DashboardEditableField>>;
}

export async function updateRoomDashboard(roomId: string, patch: Partial<Room>): Promise<Room> {
  const clean = sanitizeDashboardPatch(patch);
  const data: Record<string, unknown> = { ...clean };
  if ("raceStartedAt" in data) {
    data.raceStartedAt = data.raceStartedAt ? new Date(data.raceStartedAt as string) : null;
  }
  const updated = await prisma.room.update({ where: { id: roomId }, data });
  return toRoom(updated);
}

/** Monta o snapshot completo da sala — usado tanto no join quanto em qualquer rehydrate. */
export async function getRoomSnapshot(roomId: string): Promise<RoomSnapshot | null> {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      drivers: { orderBy: { createdAt: "asc" } },
      members: true,
      scheduleRows: { orderBy: { order: "asc" } },
      pitStops: { orderBy: { startedAt: "desc" } },
      fuelLog: { orderBy: { createdAt: "desc" } },
      tireLog: { orderBy: { createdAt: "desc" } },
      damageLog: { orderBy: { createdAt: "desc" } },
      alerts: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!room) return null;

  return {
    room: toRoom(room),
    drivers: room.drivers.map(toDriver),
    members: room.members.map(toRoomMember),
    scheduleRows: room.scheduleRows.map(toScheduleRow),
    pitStops: room.pitStops.map(toPitStop),
    fuelLog: room.fuelLog.map(toFuelEntry),
    tireLog: room.tireLog.map(toTireEntry),
    damageLog: room.damageLog.map(toDamageEntry),
    alerts: room.alerts.map(toAlert),
    connectedUsers: [], // preenchido pelo caller a partir da presença em memória (ver socket/presence.ts)
  };
}
