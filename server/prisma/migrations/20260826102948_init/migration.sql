-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "inviteCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "car" TEXT NOT NULL,
    "track" TEXT,
    "raceDurationType" TEXT NOT NULL,
    "raceDurationValue" DOUBLE PRECISION NOT NULL,
    "raceStartedAt" TIMESTAMP(3),
    "currentLap" INTEGER,
    "position" INTEGER,
    "lastLapTime" DOUBLE PRECISION,
    "bestLapTime" DOUBLE PRECISION,
    "gapAheadSec" DOUBLE PRECISION,
    "gapBehindSec" DOUBLE PRECISION,
    "settingsJson" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomMember" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoomMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Driver" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "colorHex" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Driver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleRow" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "order" DOUBLE PRECISION NOT NULL,
    "plannedLabel" TEXT NOT NULL,
    "driverId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "durationMinutes" DOUBLE PRECISION NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "updatedBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduleRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PitStop" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "lap" INTEGER,
    "fuelAddedLiters" DOUBLE PRECISION,
    "tireChangeCompound" TEXT,
    "includeDriverChange" BOOLEAN NOT NULL DEFAULT false,
    "driverChangeToId" TEXT,
    "repairs" TEXT,
    "durationSeconds" INTEGER,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "PitStop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FuelEntry" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "lap" INTEGER NOT NULL,
    "litersUsed" DOUBLE PRECISION,
    "litersRemaining" DOUBLE PRECISION,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FuelEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TireEntry" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "compound" TEXT NOT NULL,
    "stintStartLap" INTEGER NOT NULL,
    "ageLaps" INTEGER NOT NULL DEFAULT 0,
    "wearPercent" DOUBLE PRECISION,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TireEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DamageEntry" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "part" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "repairEstimateMinutes" DOUBLE PRECISION,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "repairedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DamageEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dismissedAt" TIMESTAMP(3),

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Room_inviteCode_key" ON "Room"("inviteCode");

-- CreateIndex
CREATE INDEX "RoomMember_roomId_idx" ON "RoomMember"("roomId");

-- CreateIndex
CREATE UNIQUE INDEX "RoomMember_roomId_userId_key" ON "RoomMember"("roomId", "userId");

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

-- AddForeignKey
ALTER TABLE "RoomMember" ADD CONSTRAINT "RoomMember_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Driver" ADD CONSTRAINT "Driver_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleRow" ADD CONSTRAINT "ScheduleRow_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleRow" ADD CONSTRAINT "ScheduleRow_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PitStop" ADD CONSTRAINT "PitStop_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelEntry" ADD CONSTRAINT "FuelEntry_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TireEntry" ADD CONSTRAINT "TireEntry_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DamageEntry" ADD CONSTRAINT "DamageEntry_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
