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
    id: "",
    kcp_name: "KCP Unit",
    sentra_mikro: "Sentra Mikro",
    muh_name: "Petugas Unit",
  });

  const [reportDate, setReportDate] = useState<string>(getTodayDateString());
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState<boolean>(false);

  useEffect(() => {
    setIsMounted(true);

    // 1. Ambil data sesi user spesifik dari LocalStorage
    const savedUser = localStorage.getItem("app_user");
    let userUnitName = "";
    let userSentra = "";

    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        if (u.unit_name) userUnitName = u.unit_name;
        if (u.sentra_mikro) userSentra = u.sentra_mikro;
      } catch (e) {
        console.error("Failed parsing app_user");
      }
    }

    // 2. Fetch data unit UUID secara presisi dari API units
    fetch("/api/units")
      .then((res) => res.json())
      .then((result) => {
        if (result.data && Array.isArray(result.data)) {
          // Cari unit yang benar-benar cocok dengan akun yang sedang login
          const matchedUnit = result.data.find(
            (unit: any) =>
              (userUnitName && unit.kcp_name?.toLowerCase().trim() === userUnitName.toLowerCase().trim()) ||
              (userSentra && unit.sentra_mikro?.toLowerCase().trim() === userSentra.toLowerCase().trim())
          );

          if (matchedUnit) {
            setUnitInfo({
              id: matchedUnit.id,
              kcp_name: matchedUnit.kcp_name || userUnitName || "KCP Unit",
              sentra_mikro: matchedUnit.sentra_mikro || userSentra || "Sentra Mikro",
              muh_name: matchedUnit.muh_name || "Petugas Unit",
            });
          } else if (userUnitName) {
            // Jika unit baru belum ada di master units, gunakan info dari session user
            setUnitInfo({
              id: `user-unit-${userUnitName.replace(/\s+/g, "-").toLowerCase()}`,
              kcp_name: userUnitName,
              sentra_mikro: userSentra || "Sentra Mikro",
              muh_name: "Petugas Unit",
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

  if (!isMounted) {
    return (
      <div className="w-full h-64 flex items-center justify-center text-xs text-slate-400">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-rose-500 border-t-transparent mr-2" />
        Memuat modul eksekusi unit...
      </div>
    );
  }

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

      {/* Execution Grid Component dengan Unit ID Ter-Isolasi */}
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