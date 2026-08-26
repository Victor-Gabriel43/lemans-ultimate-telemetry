-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "inviteCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "car" TEXT NOT NULL,
    "track" TEXT,
    "raceDurationType" TEXT NOT NULL,
    "raceDurationValue" REAL NOT NULL,
    "raceStartedAt" DATETIME,
    "currentLap" INTEGER,
    "position" INTEGER,
    "lastLapTime" REAL,
    "bestLapTime" REAL,
    "gapAheadSec" REAL,
    "gapBehindSec" REAL,
    "settingsJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Driver" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "colorHex" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Driver_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ScheduleRow" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomId" TEXT NOT NULL,
    "order" REAL NOT NULL,
    "plannedLabel" TEXT NOT NULL,
    "driverId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "durationMinutes" REAL NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "updatedBy" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ScheduleRow_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ScheduleRow_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PitStop" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomId" TEXT NOT NULL,
    "lap" INTEGER,
    "fuelAddedLiters" REAL,
    "tireChangeCompound" TEXT,
    "driverChangeToId" TEXT,
    "repairs" TEXT,
    "durationSeconds" INTEGER,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "createdBy" TEXT NOT NULL,
    CONSTRAINT "PitStop_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FuelEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomId" TEXT NOT NULL,
    "lap" INTEGER NOT NULL,
    "litersUsed" REAL,
    "litersRemaining" REAL,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FuelEntry_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TireEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomId" TEXT NOT NULL,
    "compound" TEXT NOT NULL,
    "stintStartLap" INTEGER NOT NULL,
    "ageLaps" INTEGER NOT NULL DEFAULT 0,
    "wearPercent" REAL,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TireEntry_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DamageEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomId" TEXT NOT NULL,
    "part" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "repairEstimateMinutes" REAL,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "repairedAt" DATETIME,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DamageEntry_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dismissedAt" DATETIME,
    CONSTRAINT "Alert_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Room_inviteCode_key" ON "Room"("inviteCode");

-- CreateIndex
CREATE INDEX "Driver_roomId_idx" ON "Driver"("roomId");

-- CreateIndex
CREATE INDEX "ScheduleRow_roomId_idx" ON "ScheduleRow"("roomId");

-- CreateIndex
CREATE INDEX "PitStop_roomId_idx" ON "PitStop"("roomId");

-- CreateIndex
CREATE INDEX "FuelEntry_roomId_idx" ON "FuelEntry"("roomId");

-- CreateIndex
CREATE INDEX "TireEntry_roomId_idx" ON "TireEntry"("roomId");

-- CreateIndex
CREATE INDEX "DamageEntry_roomId_idx" ON "DamageEntry"("roomId");

-- CreateIndex
CREATE INDEX "Alert_roomId_idx" ON "Alert"("roomId");
