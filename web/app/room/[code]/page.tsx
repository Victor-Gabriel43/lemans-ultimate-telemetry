"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Maximize2 } from "lucide-react";
import { useRoomStore } from "@/state/roomStore";
import { RaceStatusCard } from "@/components/dashboard/RaceStatusCard";
import { CurrentDriverCard } from "@/components/dashboard/CurrentDriverCard";
import { ScheduleSheet } from "@/components/schedule/ScheduleSheet";
import { ScheduleTotals } from "@/components/schedule/ScheduleTotals";
import { DriverRoster } from "@/components/schedule/DriverRoster";
import { FuelPanel } from "@/components/fuel/FuelPanel";
import { TirePanel } from "@/components/tires/TirePanel";
import { DamagePanel } from "@/components/damage/DamagePanel";
import { PitStopPanel } from "@/components/pitstop/PitStopPanel";
import { TimelinePanel } from "@/components/timeline/TimelinePanel";
import { TeamPresence } from "@/components/room/TeamPresence";
import { TelemetryToggle } from "@/components/telemetry/TelemetryToggle";
import { Panel } from "@/components/ui/Panel";

/**
 * Dashboard da sala — o "pit wall". O layout (app/room/[code]/layout.tsx) só
 * renderiza esta página depois de status === "joined", então snapshot deveria
 * sempre existir aqui — o `if (!snapshot) return null` é só defensivo.
 */
export default function RoomPage() {
  const snapshot = useRoomStore((s) => s.snapshot);
  const params = useParams<{ code: string }>();
  if (!snapshot) return null;

  return (
    <div className="flex flex-col gap-6">
      <Group label="Race Status">
        <div className="grid gap-3 lg:grid-cols-12">
          <RaceStatusCard />
          <CurrentDriverCard />
          <FuelPanel />
          <TirePanel />
        </div>
      </Group>

      <Group
        label="Strategy — Driver Stint Plan"
        action={
          <Link
            href={`/room/${params.code}/schedule`}
            className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-text-muted transition-colors hover:text-text"
          >
            <Maximize2 size={13} aria-hidden />
            Tela cheia
          </Link>
        }
      >
        <Panel title="Escala de pilotos">
          <DriverRoster />
          <div className="h-px w-full bg-border" />
          <ScheduleTotals />
          <ScheduleSheet />
        </Panel>
        <TimelinePanel />
      </Group>

      <Group label="Live Operations">
        <div className="grid gap-3 lg:grid-cols-12">
          <PitStopPanel />
          <DamagePanel />
        </div>
      </Group>

      <Group label="Team & Systems">
        <div className="grid gap-3 lg:grid-cols-12">
          <TeamPresence />
          <TelemetryToggle />
        </div>
      </Group>
    </div>
  );
}

function Group({
  label,
  action,
  children,
}: {
  label: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3 border-b border-border pb-1.5">
        <h2 className="eyebrow text-text">{label}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
