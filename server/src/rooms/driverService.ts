import { prisma } from "../db.js";
import { colorForName, type Driver } from "@lmu/shared";
import { toDriver } from "./roomService.js";

export async function listDrivers(roomId: string): Promise<Driver[]> {
  const drivers = await prisma.driver.findMany({ where: { roomId }, orderBy: { createdAt: "asc" } });
  return drivers.map(toDriver);
}

export async function addDriver(roomId: string, name: string): Promise<void> {
  const trimmed = name.trim().slice(0, 40);
  if (!trimmed) return;
  await prisma.driver.create({
    data: { roomId, name: trimmed, colorHex: colorForName(trimmed) },
  });
}

interface SanitizedDriverPatch {
  name?: string;
  colorHex?: string;
}

function sanitizeDriverPatch(patch: { name?: string; colorHex?: string }): SanitizedDriverPatch {
  const clean: SanitizedDriverPatch = {};
  if (typeof patch.name === "string" && patch.name.trim()) clean.name = patch.name.trim().slice(0, 40);
  if (typeof patch.colorHex === "string" && /^#[0-9a-fA-F]{6}$/.test(patch.colorHex)) clean.colorHex = patch.colorHex;
  return clean;
}

export async function updateDriver(
  roomId: string,
  driverId: string,
  patch: { name?: string; colorHex?: string }
): Promise<void> {
  const clean = sanitizeDriverPatch(patch);
  if (Object.keys(clean).length === 0) return;
  await prisma.driver.updateMany({ where: { id: driverId, roomId }, data: clean });
}

export async function removeDriver(roomId: string, driverId: string): Promise<void> {
  await prisma.driver.deleteMany({ where: { id: driverId, roomId } });
}
