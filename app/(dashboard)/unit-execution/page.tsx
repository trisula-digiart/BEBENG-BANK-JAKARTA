"use client";

import React, { useEffect, useState } from "react";
import { ExecutionGrid } from "@/components/grid/ExecutionGrid";
import { getTodayDateString } from "@/lib/utils";

export default function UnitExecutionPage() {
  const [unitInfo, setUnitInfo] = useState<{
    id: string;
    kcp_name: string;
    sentra_mikro: string;
    muh_name: string;
  }>({
    id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    kcp_name: "KCP Walikota",
    sentra_mikro: "Sentra Mikro Jkt Timur",
    muh_name: "Budi Santoso",
  });

  const [reportDate, setReportDate] = useState<string>(getTodayDateString());
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    // 1. Ambil data sesi user dari LocalStorage
    const savedUser = localStorage.getItem("app_user");
    let userUnitName = "KCP Walikota";

    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        if (u.unit_name) userUnitName = u.unit_name;
      } catch (e) {
        console.error("Failed parsing app_user");
      }
    }

    // 2. Fetch data unit UUID dari API units
    fetch("/api/units")
      .then((res) => res.json())
      .then((result) => {
        if (result.success && Array.isArray(result.data)) {
          const matchedUnit = result.data.find(
            (unit: any) =>
              unit.kcp_name?.toLowerCase() === userUnitName.toLowerCase() ||
              unit.sentra_mikro?.toLowerCase().includes("walikota")
          ) || result.data[0];

          if (matchedUnit) {
            setUnitInfo({
              id: matchedUnit.id || "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
              kcp_name: matchedUnit.kcp_name || "KCP Walikota",
              sentra_mikro: matchedUnit.sentra_mikro || "Sentra Mikro Jkt Timur",
              muh_name: matchedUnit.muh_name || "Budi Santoso",
            });
          }
        }
      })
      .catch((err) => console.error("Fetch units error:", err));

    // 3. Check Lock Status
    fetch(`/api/lock-status?date=${reportDate}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.is_locked !== undefined) {
          setIsLocked(data.is_locked);
        }
      })
      .catch(() => {});
  }, [reportDate]);

  return (
    <div className="w-full space-y-6 pb-8">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-rose-400 mb-1">
            <span>TABEL EKSEKUSI UNIT</span> • <span>{unitInfo.kcp_name}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">
            Data Eksekusi Debitur & Pencairan
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Input dan pantau rincian debitur eksekusi, line proses, plafon, nett booking, serta fasilitas pendukung.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Tanggal Laporan:</span>
          <input
            type="date"
            value={reportDate}
            onChange={(e) => setReportDate(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-slate-200 text-xs font-mono rounded-lg px-3 py-1.5 focus:border-rose-500 focus:outline-none shadow-inner"
          />
        </div>
      </div>

      {/* Execution Grid Component */}
      <ExecutionGrid
        unitId={unitInfo.id}
        sentraName={unitInfo.sentra_mikro}
        muhName={unitInfo.muh_name}
        reportDate={reportDate}
        isLocked={isLocked}
      />
    </div>
  );
}