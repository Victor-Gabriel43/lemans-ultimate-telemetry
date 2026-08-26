/**
 * Fonte única de tipos compartilhados entre `server` e `web`.
 * Não duplicar estes tipos em nenhum dos dois pacotes — sempre importar de "@lmu/shared".
 */

export type RaceDurationType = "TIME" | "LAPS";
export type ScheduleStatus = "PLANNED" | "ACTIVE" | "DONE";
export type EntrySource = "MANUAL" | "TELEMETRY";
export type AlertSeverity = "INFO" | "WARNING" | "CRITICAL";
export type DamageSeverity = "LIGHT" | "MODERATE" | "SEVERE";

export interface RoomSettings {
  maxStintMinutes: number;
  minRestMinutes: number;
  /** Modelo simples de degradação: % de grip perdido por volta rodada no composto atual. */
  tireDegradationPercentPerLap: number;
  pitActionDurationsSeconds: {
    fuelPerLiter: number;
    tireChange: number;
    driverChange: number;
    repairPerSeverity: Record<DamageSeverity, number>;
  };
}

export const DEFAULT_ROOM_SETTINGS: RoomSettings = {
  maxStintMinutes: 90,
  minRestMinutes: 30,
  tireDegradationPercentPerLap: 1.5,
  pitActionDurationsSeconds: {
    fuelPerLiter: 1.2,
    tireChange: 12,
    driverChange: 25,
    repairPerSeverity: {
      LIGHT: 20,
      MODERATE: 60,
      SEVERE: 180,
    },
  },
};

export interface Driver {
  id: string;
  roomId: string;
  name: string;
  colorHex: string;
  createdAt: string;
}

export interface ScheduleRow {
  id: string;
  roomId: string;
  order: number;
  plannedLabel: string;
  driverId: string | null;
  status: ScheduleStatus;
  durationMinutes: number;
  notes: string;
  updatedBy: string;
  updatedAt: string;
}

export interface PitStop {
  id: string;
  roomId: string;
  lap: number | null;
  fuelAddedLiters: number | null;
  tireChangeCompound: string | null;
  driverChangeToId: string | null;
  repairs: DamageSeverity[] | null;
  durationSeconds: number | null;
  startedAt: string;
  completedAt: string | null;
  createdBy: string;
}

export interface FuelEntry {
  id: string;
  roomId: string;
  lap: number;
  litersUsed: number | null;
  litersRemaining: number | null;
  source: EntrySource;
  createdBy: string;
  createdAt: string;
}

export interface TireEntry {
  id: string;
  roomId: string;
  compound: string;
  stintStartLap: number;
  ageLaps: number;
  wearPercent: number | null;
  source: EntrySource;
  createdBy: string;
  createdAt: string;
}

export interface DamageEntry {
  id: string;
  roomId: string;
  part: string;
  severity: DamageSeverity;
  repairEstimateMinutes: number | null;
  source: EntrySource;
  repairedAt: string | null;
  createdBy: string;
  createdAt: string;
}

export interface Alert {
  id: string;
  roomId: string;
  type: string;
  message: string;
  severity: AlertSeverity;
  createdAt: string;
  dismissedAt: string | null;
}

export interface ConnectedUser {
  userId: string;
  name: string;
  colorHex: string;
  connectedAt: string;
}

export interface Room {
  id: string;
  inviteCode: string;
  name: string;
  car: string;
  track: string | null;
  raceDurationType: RaceDurationType;
  raceDurationValue: number;
  raceStartedAt: string | null;
  currentLap: number | null;
  position: number | null;
  lastLapTime: number | null;
  bestLapTime: number | null;
  gapAheadSec: number | null;
  gapBehindSec: number | null;
  settings: RoomSettings;
  createdAt: string;
  updatedAt: string;
}

export interface RoomSnapshot {
  room: Room;
  drivers: Driver[];
  scheduleRows: ScheduleRow[];
  pitStops: PitStop[];
  fuelLog: FuelEntry[];
  tireLog: TireEntry[];
  damageLog: DamageEntry[];
  alerts: Alert[];
  connectedUsers: ConnectedUser[];
}

// ---------------------------------------------------------------------------
// Eventos de Socket.IO — cliente <-> servidor. Ver PASSO_A_PASSO.md para a
// convenção de nomenclatura ("domínio:ação") antes de adicionar eventos novos.
// ---------------------------------------------------------------------------

export interface ClientToServerEvents {
  "room:join": (
    payload: { inviteCode: string; userId?: string; name: string },
    ack: (result: { ok: true; snapshot: RoomSnapshot; userId: string } | { ok: false; error: string }) => void
  ) => void;

  "schedule:add": (payload: { roomId: string; afterRowId?: string; updatedBy: string }) => void;
  "schedule:update": (payload: { roomId: string; rowId: string; patch: Partial<ScheduleRow>; updatedBy: string }) => void;
  "schedule:remove": (payload: { roomId: string; rowId: string }) => void;
  "schedule:reorder": (payload: { roomId: string; rowId: string; newOrder: number; updatedBy: string }) => void;

  "fuel:log": (payload: Omit<FuelEntry, "id" | "roomId" | "createdAt">) => void;
  "tire:newStint": (payload: Omit<TireEntry, "id" | "roomId" | "createdAt" | "ageLaps"> & { roomId: string }) => void;
  "damage:log": (payload: Omit<DamageEntry, "id" | "roomId" | "createdAt" | "repairedAt">) => void;
  "damage:repair": (payload: { roomId: string; damageId: string }) => void;

  "pitstop:start": (payload: { roomId: string; lap: number | null; createdBy: string }) => void;
  "pitstop:complete": (payload: { roomId: string; pitStopId: string; patch: Partial<PitStop> }) => void;

  "dashboard:update": (payload: { roomId: string; patch: Partial<Room>; updatedBy: string }) => void;
  "telemetry:push": (payload: { roomId: string; patch: Partial<Room> }) => void;

  "alert:dismiss": (payload: { roomId: string; alertId: string }) => void;
}

export interface ServerToClientEvents {
  "room:state": (snapshot: RoomSnapshot) => void;
  "presence:update": (connectedUsers: ConnectedUser[]) => void;
  "schedule:changed": (scheduleRows: ScheduleRow[]) => void;
  "fuel:changed": (fuelLog: FuelEntry[]) => void;
  "tire:changed": (tireLog: TireEntry[]) => void;
  "damage:changed": (damageLog: DamageEntry[]) => void;
  "pitstop:changed": (pitStops: PitStop[]) => void;
  "room:updated": (room: Room) => void;
  "alert:new": (alert: Alert) => void;
  "alert:changed": (alerts: Alert[]) => void;
}
