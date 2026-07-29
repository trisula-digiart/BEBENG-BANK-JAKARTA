"use client";

import React, { useEffect, useState, useCallback } from "react";
import { StatCard } from "@/components/dashboard/StatCard";
import { PrayerWidget } from "@/components/dashboard/PrayerWidget";
import { createBrowserClient } from "@/lib/supabase/client";
import { getTodayDateString, formatDateID } from "@/lib/utils";

export default function HeadAreaDashboard() {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [unitReports, setUnitReports] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [lockingUnitId, setLockingUnitId] = useState<string | null>(null);

  const supabase = createBrowserClient();

  // Fetch Consolidated Status Unit
  const fetchAreaConsolidation = useCallback(async () => {
    setLoading(true);
    try {
      const timestamp = Date.now();
      const res = await fetch(`/api/reports?date=${selectedDate}&_t=${timestamp}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
      });
      const result = await res.json();

      if (res.ok && Array.isArray(result.data)) {
        setUnitReports(result.data);
      } else {
        setUnitReports([]);
      }
    } catch (err) {
      console.error("Failed fetching area consolidation:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchAreaConsolidation();

    // Listener Realtime Penguncian Unit
    const channel = supabase
      .channel("realtime_lock_status_channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "unit_locks" },
        () => {
          fetchAreaConsolidation();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAreaConsolidation, supabase]);

  // Toggle Lock Status Unit
  const handleToggleLock = async (unitId: string, currentLockState: boolean) => {
    setLockingUnitId(unitId);
    try {
      const res = await fetch("/api/lock-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          report_date: selectedDate,
          unit_id: unitId,
          is_locked: !currentLockState,
        }),
      });

      if (res.ok) {
        await fetchAreaConsolidation();
      } else {
        alert("Gagal mengubah status penguncian.");
      }
    } catch (err) {
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setLockingUnitId(null);
    }
  };

  const totalUnits = unitReports.length;
  const lockedUnitsCount = unitReports.filter((u) => u.is_locked).length;
  const openUnitsCount = totalUnits > 0 ? totalUnits - lockedUnitsCount : 17;

  return (
    <div className="w-full space-y-6 pb-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-blue-400 mb-1">
            <span>AREA HEAD CONTROL</span> • <span>WALIKOTA JAKARTA TIMUR</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">
            Konsolidasi & Control Penguncian Unit
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Pantau status pengisian dan kunci laporan harian dari unit area secara terpusat.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs font-medium text-slate-400">Pilih Tanggal:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Widget Jam Digital & Jadwal Sholat Realtime Tampil di Utama */}
      <PrayerWidget />

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="TOTAL UNIT AREA"
          value={`${totalUnits || 17} Unit`}
          description={formatDateID(selectedDate)}
          variant="default"
        />
        <StatCard
          title="LAPORAN TERKUNCI"
          value={`${lockedUnitsCount} Unit`}
          description="Laporan Final Diterima"
          variant="danger"
        />
        <StatCard
          title="LAPORAN MASIH TERBUKA"
          value={`${openUnitsCount} Unit`}
          description="Unit Dalam Proses Pengisian"
          variant="success"
        />
      </div>

      {/* Grid Unit Control List */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-xl">
        <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wide mb-4">
          📋 Status Penguncian Laporan Unit Harian
        </h3>

        {loading ? (
          <div className="flex h-48 items-center justify-center text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
              Memuat data konsolidasi area...
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase font-mono border-b border-slate-800">
                <tr>
                  <th className="px-3.5 py-3">Unit / KCP</th>
                  <th className="px-3.5 py-3">Sentra Mikro</th>
                  <th className="px-3.5 py-3">UNIT</th>
                  <th className="px-3.5 py-3">Analis Mikro</th>
                  <th className="px-3.5 py-3">Status Laporan</th>
                  <th className="px-3.5 py-3 text-right">Aksi Head Area</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {unitReports.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-slate-500">
                      Tidak ada data status penguncian unit untuk tanggal ini.
                    </td>
                  </tr>
                ) : (
                  unitReports.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-3.5 py-3 font-bold text-slate-100">{item.units?.kcp_name || "KCP Unit"}</td>
                      <td className="px-3.5 py-3 text-slate-400">{item.units?.sentra_mikro || "Sentra"}</td>
                      <td className="px-3.5 py-3 font-medium text-slate-200">{item.units?.muh_name || "MUH"}</td>
                      <td className="px-3.5 py-3 text-slate-300">{item.units?.analis_mikro || "Analis"}</td>
                      <td className="px-3.5 py-3">
                        <span
                          className={`px-2.5 py-1 rounded border text-[10px] font-mono font-bold ${
                            item.is_locked
                              ? "bg-rose-950 text-rose-400 border-rose-800"
                              : "bg-emerald-950 text-emerald-400 border-emerald-800"
                          }`}
                        >
                          {item.is_locked ? "🔒 TERKUNCI" : "🔓 TERBUKA"}
                        </span>
                      </td>
                      <td className="px-3.5 py-3 text-right">
                        <button
                          onClick={() => handleToggleLock(item.unit_id, Boolean(item.is_locked))}
                          disabled={lockingUnitId === item.unit_id}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                            item.is_locked
                              ? "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500"
                              : "bg-rose-600 hover:bg-rose-500 text-white border-rose-500"
                          }`}
                        >
                          {lockingUnitId === item.unit_id
                            ? "Proses..."
                            : item.is_locked
                            ? "Buka Kunci"
                            : "Kunci Laporan"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}