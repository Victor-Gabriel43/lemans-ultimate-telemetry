import { prisma } from "../db.js";
import { DEFAULT_ROOM_SETTINGS, computeFuelStats, type PitStop, type RoomSettings } from "@lmu/shared";
import { toPitStop } from "./roomService.js";
import { listFuelLog, logFuelEntry } from "./fuelService.js";
import { startNewTireStint } from "./tireService.js";
import { markDamageRepaired } from "./damageService.js";
import { advanceActiveDriver } from "./scheduleService.js";

export async function listPitStops(roomId: string): Promise<PitStop[]> {
  const rows = await prisma.pitStop.findMany({ where: { roomId }, orderBy: { startedAt: "desc" } });
  return rows.map(toPitStop);
}

export interface PitPlanInput {
  lap: number | null;
  fuelAddedLiters: number | null;
  tireChangeCompound: string | null;
  includeDriverChange: boolean;
  repairDamageIds: string[];
  createdBy: string;
}

export async function startPitStop(roomId: string, plan: PitPlanInput): Promise<void> {
  await prisma.pitStop.create({
    data: {
      roomId,
      lap: plan.lap != null && Number.isFinite(plan.lap) ? Math.round(plan.lap) : null,
      fuelAddedLiters:
        plan.fuelAddedLiters != null && Number.isFinite(plan.fuelAddedLiters) && plan.fuelAddedLiters > 0
          ? plan.fuelAddedLiters
          : null,
      tireChangeCompound: plan.tireChangeCompound?.trim() || null,
      includeDriverChange: Boolean(plan.includeDriverChange),
      repairs: plan.repairDamageIds.length > 0 ? JSON.stringify(plan.repairDamageIds) : null,
      createdBy: plan.createdBy,
    },
  });
}

/**
 * Aplica os efeitos do pit stop nos outros domínios (combustível, pneu,
 * danos, escala) e fecha o registro com a duração real. Tudo derivado do
 * que foi planejado no início — não dá pra EDITAR o plano de um pit já em
 * andamento (só cancelar via `cancelPitStop` e começar outro do zero).
 */
/** Cancela um pit stop iniciado por engano — só apaga se ainda não foi concluído (nenhum efeito colateral foi aplicado ainda nesse ponto). */
export async function cancelPitStop(roomId: string, pitStopId: string): Promise<void> {
  await prisma.pitStop.deleteMany({ where: { id: pitStopId, roomId, completedAt: null } });
}

export async function completePitStop(roomId: string, pitStopId: string): Promise<void> {
  const pit = await prisma.pitStop.findUnique({ where: { id: pitStopId, roomId } });
  if (!pit || pit.completedAt) return;

  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) return;

  let settings: RoomSettings = DEFAULT_ROOM_SETTINGS;
  try {
    settings = { ...DEFAULT_ROOM_SETTINGS, ...JSON.parse(room.settingsJson) };
  } catch {
    // usa o default já atribuído acima
  }

  const lap = pit.lap ?? room.currentLap ?? 0;

  if (pit.fuelAddedLiters != null && pit.fuelAddedLiters > 0) {
    const fuelLog = await listFuelLog(roomId);
    const { currentRemaining } = computeFuelStats(fuelLog, settings.fuelTankLiters);
    const newRemaining = (currentRemaining ?? settings.fuelTankLiters) + pit.fuelAddedLiters;
    await logFuelEntry(roomId, {
      lap,
      litersUsed: null,
      litersRemaining: Math.min(settings.fuelTankLiters, newRemaining),
      source: "MANUAL",
      createdBy: pit.createdBy,
    });
  }

  if (pit.tireChangeCompound) {
    await startNewTireStint(roomId, pit.tireChangeCompound, pit.createdBy);
  }

  let repairIds: string[] = [];
  if (pit.repairs) {
    try {
      repairIds = JSON.parse(pit.repairs);
    } catch {
      repairIds = [];
    }
  }
  for (const damageId of repairIds) {
    await markDamageRepaired(roomId, damageId);
  }

  let driverChangeToId: string | null = null;
  if (pit.includeDriverChange) {
    driverChangeToId = await advanceActiveDriver(roomId, pit.createdBy);
  }

  const durationSeconds = Math.max(0, Math.round((Date.now() - pit.startedAt.getTime()) / 1000));

  await prisma.pitStop.update({
    where: { id: pitStopId },
    data: { completedAt: new Date(), durationSeconds, driverChangeToId },
  });
}
