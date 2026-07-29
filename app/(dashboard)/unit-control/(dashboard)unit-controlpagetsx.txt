"use client";

import React, { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { PerformanceTrackerCard } from "@/components/unit-control/PerformanceTrackerCard";
import { PipelineManager } from "@/components/unit-control/PipelineManager";
import { DailyOperationForm } from "@/components/unit-control/DailyOperationForm";
import { BroadcastInbox } from "@/components/unit-control/BroadcastInbox";
import { PrayerWidget } from "@/components/dashboard/PrayerWidget";

export default function UnitControlPage() {
  const [loading, setLoading] = useState<boolean>(true);
  const [unitProfile, setUnitProfile] = useState<{
    unit_id: string;
    kcp_name: string;
    kc_name: string;
  } | null>(null);

  const supabase = createBrowserClient();

  useEffect(() => {
    async function loadUnit() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("unit_id, units:unit_id(kcp_name, kc_name)")
          .eq("id", session.user.id)
          .single();

        if (profile?.unit_id) {
          const u = profile.units as any;
          setUnitProfile({
            unit_id: profile.unit_id,
            kcp_name: u?.kcp_name || "Unit Kerja",
            kc_name: u?.kc_name || "Walikota Jakarta Timur",
          });
        }
      } catch (err) {
        console.error("Failed loading unit profile:", err);
      } finally {
        setLoading(false);
      }
    }

    loadUnit();
  }, [supabase]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          Memuat Modul Operational Control Kepala Unit...
        </div>
      </div>
    );
  }

  if (!unitProfile?.unit_id) {
    return (
      <div className="rounded-xl border border-amber-800/60 bg-amber-950/30 p-6 text-amber-200 text-xs text-center">
        💡 <strong>Akses Dibatasi:</strong> Modul Unit Operational Control khusus untuk akun Role <strong>UNIT (Kepala Unit / MUH)</strong>.
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-8">
      {/* Page Header Full-Width */}
      <div className="border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 mb-1">
          <span>OPERATIONAL CONTROL PANEL</span> • <span>{unitProfile.kcp_name}</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-100">
          Control Panel & Kinerja Operasional Unit
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Pantau target kinerja, prospek nasabah, laporan operasional, dan arahan Area Head secara real-time.
        </p>
      </div>

      {/* Widget Jam Digital & Jadwal Sholat Tampil di Utama */}
      <PrayerWidget />

      {/* 1. Performance Tracker Card Full Width */}
      <PerformanceTrackerCard unitId={unitProfile.unit_id} />

      {/* 2. Grid Row: Pipeline Manager & Broadcast Reader */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 w-full">
        <PipelineManager unitId={unitProfile.unit_id} />
        <BroadcastInbox unitId={unitProfile.unit_id} />
      </div>

      {/* 3. Daily Operational Report Form Full Width */}
      <DailyOperationForm unitId={unitProfile.unit_id} />
    </div>
  );
}