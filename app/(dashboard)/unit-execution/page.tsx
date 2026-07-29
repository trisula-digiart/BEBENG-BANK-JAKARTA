"use client";

import React, { useEffect, useState } from "react";
import { ExecutionGrid } from "@/components/grid/ExecutionGrid";
import { getTodayDateString } from "@/lib/utils";

export default function UnitExecutionPage() {
  // Ambil cache awal langsung agar data user tidak hilang saat render pertama
  const getInitialUser = () => {
    if (typeof window === "undefined") return null;
    try {
      const saved = localStorage.getItem("app_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  };

  const initialUser = getInitialUser();

  const [unitInfo, setUnitInfo] = useState<{
    id: string;
    kcp_name: string;
    sentra_mikro: string;
    muh_name: string;
  }>({
    id: initialUser?.unit_id || "",
    kcp_name: initialUser?.unit_name || initialUser?.kcp_name || "cikarang",
    sentra_mikro: initialUser?.sentra_mikro || "cikarang",
    muh_name: initialUser?.muh_name || initialUser?.username || "andi",
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
    let userMuh = "";

    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        if (u.unit_name) userUnitName = u.unit_name;
        if (u.sentra_mikro) userSentra = u.sentra_mikro;
        if (u.muh_name || u.username) userMuh = u.muh_name || u.username;
      } catch (e) {
        console.error("Gagal membaca session app_user");
      }
    }

    // 2. Fetch data unit resmi dari API /api/units
    fetch("/api/units")
      .then((res) => res.json())
      .then((result) => {
        if (result.data && Array.isArray(result.data)) {
          const matchedUnit = result.data.find(
            (unit: any) =>
              (userUnitName && unit.kcp_name?.toLowerCase().trim() === userUnitName.toLowerCase().trim()) ||
              (userSentra && unit.sentra_mikro?.toLowerCase().trim() === userSentra.toLowerCase().trim()) ||
              (userMuh && unit.muh_name?.toLowerCase().trim() === userMuh.toLowerCase().trim())
          );

          if (matchedUnit) {
            setUnitInfo({
              id: matchedUnit.id || "",
              kcp_name: matchedUnit.kcp_name || userUnitName || "cikarang",
              sentra_mikro: matchedUnit.sentra_mikro || userSentra || "cikarang",
              muh_name: matchedUnit.muh_name || userMuh || "andi",
            });
          } else {
            // Gunakan fallback profil user yang ada tanpa mengacak nama sentra
            setUnitInfo((prev) => ({
              ...prev,
              kcp_name: userUnitName || prev.kcp_name || "cikarang",
              sentra_mikro: userSentra || prev.sentra_mikro || "cikarang",
              muh_name: userMuh || prev.muh_name || "andi",
            }));
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
            <span>TABEL EKSEKUSI UNIT</span> • <span className="uppercase">{unitInfo.sentra_mikro} ({unitInfo.muh_name})</span> • <span className="text-emerald-400 font-bold">RETENSI BULAN BERJALAN</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">
            Data Eksekusi Debitur & Pencairan
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Input dan pantau rincian debitur eksekusi bulan berjalan. Seluruh data bertahan 1 bulan penuh dan otomatis di-reset pada bulan baru.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Tanggal Transaksi:</span>
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