-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PitStop" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomId" TEXT NOT NULL,
    "lap" INTEGER,
    "fuelAddedLiters" REAL,
    "tireChangeCompound" TEXT,
    "includeDriverChange" BOOLEAN NOT NULL DEFAULT false,
    "driverChangeToId" TEXT,
    "repairs" TEXT,
    "durationSeconds" INTEGER,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "createdBy" TEXT NOT NULL,
    CONSTRAINT "PitStop_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PitStop" ("completedAt", "createdBy", "driverChangeToId", "durationSeconds", "fuelAddedLiters", "id", "lap", "repairs", "roomId", "startedAt", "tireChangeCompound") SELECT "completedAt", "createdBy", "driverChangeToId", "durationSeconds", "fuelAddedLiters", "id", "lap", "repairs", "roomId", "startedAt", "tireChangeCompound" FROM "PitStop";
DROP TABLE "PitStop";
ALTER TABLE "new_PitStop" RENAME TO "PitStop";
CREATE INDEX "PitStop_roomId_idx" ON "PitStop"("roomId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
