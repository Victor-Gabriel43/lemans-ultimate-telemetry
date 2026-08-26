import type { RoomMember } from "@lmu/shared";

export function resolveMemberName(members: RoomMember[], userId: string | null | undefined): string {
  if (!userId) return "alguém";
  return members.find((m) => m.userId === userId)?.name ?? "alguém";
}
