"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ScheduleSheet } from "@/components/schedule/ScheduleSheet";
import { ScheduleTotals } from "@/components/schedule/ScheduleTotals";

export default function ScheduleFullscreenPage() {
  const params = useParams<{ code: string }>();

  return (
    <div className="flex flex-col gap-4">
      <Link
        href={`/room/${params.code}`}
        className="flex w-fit items-center gap-1 text-sm text-text-muted transition-colors hover:text-text"
      >
        <ArrowLeft size={14} aria-hidden />
        Voltar ao painel
      </Link>
      <h1 className="text-lg font-semibold">Escala de pilotos</h1>
      <ScheduleTotals />
      <ScheduleSheet />
    </div>
  );
}
