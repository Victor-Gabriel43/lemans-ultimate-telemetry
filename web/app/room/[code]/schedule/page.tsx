"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ScheduleSheet } from "@/components/schedule/ScheduleSheet";
import { ScheduleTotals } from "@/components/schedule/ScheduleTotals";
import { DriverRoster } from "@/components/schedule/DriverRoster";
import { Panel } from "@/components/ui/Panel";

export default function ScheduleFullscreenPage() {
  const params = useParams<{ code: string }>();

  return (
    <div className="flex flex-col gap-4">
      <Link
        href={`/room/${params.code}`}
        className="flex w-fit items-center gap-1.5 text-xs uppercase tracking-wide text-text-muted transition-colors hover:text-text"
      >
        <ArrowLeft size={13} aria-hidden />
        Voltar ao pit wall
      </Link>
      <Panel title="Driver Stint Plan">
        <DriverRoster />
        <div className="h-px w-full bg-border" />
        <ScheduleTotals />
        <ScheduleSheet />
      </Panel>
    </div>
  );
}
