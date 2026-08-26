"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Maximize2 } from "lucide-react";
import { useRoomStore } from "@/state/roomStore";
import { RaceStatusCard } from "@/components/dashboard/RaceStatusCard";
import { CurrentDriverCard } from "@/components/dashboard/CurrentDriverCard";
import { ScheduleSheet } from "@/components/schedule/ScheduleSheet";
import { ScheduleTotals } from "@/components/schedule/ScheduleTotals";
import { FuelPanel } from "@/components/fuel/FuelPanel";
import { TirePanel } from "@/components/tires/TirePanel";
import { DamagePanel } from "@/components/damage/DamagePanel";
import { PitStopPanel } from "@/components/pitstop/PitStopPanel";
import { TimelinePanel } from "@/components/timeline/TimelinePanel";
import { TelemetryToggle } from "@/components/telemetry/TelemetryToggle";

/**
 * Dashboard da sala. O layout (app/room/[code]/layout.tsx) só renderiza
 * esta página depois de status === "joined", então snapshot deveria
 * sempre existir aqui — o `if (!snapshot) return null` é só defensivo.
 */
export default function RoomPage() {
  const snapshot = useRoomStore((s) => s.snapshot);
  const params = useParams<{ code: string }>();
  if (!snapshot) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <RaceStatusCard />

      <CurrentDriverCard />
      <FuelPanel />
      <TirePanel />

      <section className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4 sm:col-span-2 lg:col-span-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-text-muted">Escala de pilotos</h2>
          <Link
            href={`/room/${params.code}/schedule`}
            className="flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-text"
          >
            <Maximize2 size={14} aria-hidden />
            Tela cheia
          </Link>
        </div>
        <ScheduleTotals />
        <ScheduleSheet />
      </section>

      <DamagePanel />
      <PitStopPanel />
      <TimelinePanel />
      <TelemetryToggle />
    </div>
  );
}
