import { PrismaClient } from "@prisma/client";
import { DEFAULT_ROOM_SETTINGS } from "@lmu/shared";

const prisma = new PrismaClient();

/**
 * Sala fixa de desenvolvimento — código sempre "DEV001" pra facilitar
 * testar as fases seguintes sem ter que recriar sala/pilotos toda hora.
 * Rodar com: npm run db:seed --workspace=server
 */
async function main() {
  await prisma.room.deleteMany({ where: { inviteCode: "DEV001" } });

  const room = await prisma.room.create({
    data: {
      inviteCode: "DEV001",
      name: "24h de Le Mans (teste)",
      car: "Porsche 963 LMDh",
      track: "Circuit de la Sarthe",
      raceDurationType: "TIME",
      raceDurationValue: 24 * 60, // minutos
      settingsJson: JSON.stringify(DEFAULT_ROOM_SETTINGS),
      drivers: {
        create: [
          { name: "Ana", colorHex: "#3B82F6" },
          { name: "Bruno", colorHex: "#22C55E" },
          { name: "Carla", colorHex: "#F59E0B" },
        ],
      },
    },
    include: { drivers: true },
  });

  const [ana, bruno, carla] = room.drivers;

  await prisma.scheduleRow.createMany({
    data: [
      {
        roomId: room.id,
        order: 1,
        plannedLabel: "00:00",
        driverId: ana.id,
        status: "ACTIVE",
        durationMinutes: 90,
        notes: "Largada",
        updatedBy: "seed",
      },
      {
        roomId: room.id,
        order: 2,
        plannedLabel: "01:30",
        driverId: bruno.id,
        status: "PLANNED",
        durationMinutes: 90,
        notes: "",
        updatedBy: "seed",
      },
      {
        roomId: room.id,
        order: 3,
        plannedLabel: "03:00",
        driverId: carla.id,
        status: "PLANNED",
        durationMinutes: 90,
        notes: "",
        updatedBy: "seed",
      },
    ],
  });

  console.log(`Sala de teste criada: código ${room.inviteCode} (id ${room.id})`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
