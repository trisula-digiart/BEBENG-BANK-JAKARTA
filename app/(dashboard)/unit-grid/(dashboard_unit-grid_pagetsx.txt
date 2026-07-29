"use client";

import React, { useEffect, useState, useCallback } from "react";
import { UnitGrid, GridRowData } from "@/components/grid/UnitGrid";
import { StatCard } from "@/components/dashboard/StatCard";
import { createBrowserClient } from "@/lib/supabase/client";
import { getTodayDateString, formatDateID } from "@/lib/utils";

function UnitGridPage() {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [rowData, setRowData] = useState<GridRowData[]>([]);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [unitProfile, setUnitProfile] = useState<{
    unit_id: string;
    kc_name: string;
    kcp_name: string;
    sentra_mikro: string;
    muh_name: string;
    muh_status: "Tetap" | "Backup";
    analis_mikro: string;
  } | null>(null);

  const supabase = createBrowserClient();

  // 1. Fetch User Profile & Metadata Unit
  useEffect(() => {
    async function loadUserProfile() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          setLoading(false);
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select(`
            role,
            unit_id,
            units:unit_id (
              kc_name,
              kcp_name,
              sentra_mikro,
              muh_name,
              muh_status,
              analis_mikro
            )
          `)
          .eq("id", session.user.id)
          .single();

        if (profile) {
          setUserRole(profile.role);
          if (profile.unit_id) {
            const u = profile.units as any;
            setUnitProfile({
              unit_id: profile.unit_id,
              kc_name: u?.kc_name || "Walikota Jakarta Timur",
              kcp_name: u?.kcp_name || "KCP Walikota",
              sentra_mikro: u?.sentra_mikro || "Sentra Mikro Jkt Timur",
              muh_name: u?.muh_name || "Budi Santoso",
              muh_status: u?.muh_status || "Tetap",
              analis_mikro: u?.analis_mikro || "Ahmad Dahlan",
            });
          } else {
            setLoading(false);
          }
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error("Gagal memuat profil unit:", err);
        setLoading(false);
      }
    }

    loadUserProfile();
  }, [supabase]);

  // 2. Fetch Reports dari API Backend
  const fetchUnitReports = useCallback(async () => {
    if (!unitProfile?.unit_id) return;

    setLoading(true);
    try {
      const res = await fetch(
        `/api/reports?date=${selectedDate}&unit_id=${unitProfile.unit_id}`
      );
      const result = await res.json();

      if (res.ok && Array.isArray(result.data)) {
        if (result.data.length > 0) {
          const mappedRows: GridRowData[] = result.data.map((item: any) => ({
            id: item.id,
            no_urut: item.no_urut,
            kc_name: item.units?.kc_name || unitProfile.kc_name,
            kcp_name: item.units?.kcp_name || unitProfile.kcp_name,
            sentra_mikro: item.units?.sentra_mikro || unitProfile.sentra_mikro,
            muh_name: item.units?.muh_name || unitProfile.muh_name,
            muh_status: item.units?.muh_status || unitProfile.muh_status,
            analis_mikro: item.units?.analis_mikro || unitProfile.analis_mikro,
            nama_sm: item.nama_sm || "",
            nrik: item.nrik || "",
            vendor: item.vendor || "",
            join_date: item.join_date || selectedDate,
            dblm_status: item.dblm_status || "DBLM",
            kode_officer: item.kode_officer || "",
          }));

          setRowData(mappedRows);
          setIsLocked(Boolean(result.data[0]?.is_locked));
        } else {
          setRowData([
            {
              no_urut: 1,
              kc_name: unitProfile.kc_name,
              kcp_name: unitProfile.kcp_name,
              sentra_mikro: unitProfile.sentra_mikro,
              muh_name: unitProfile.muh_name,
              muh_status: unitProfile.muh_status,
              analis_mikro: unitProfile.analis_mikro,
              nama_sm: "",
              nrik: "",
              vendor: "",
              join_date: selectedDate,
              dblm_status: "DBLM",
              kode_officer: "",
            },
          ]);
          setIsLocked(false);
        }
      }
    } catch (err) {
      console.error("Gagal mengambil laporan unit:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, unitProfile]);

  useEffect(() => {
    if (unitProfile?.unit_id) {
      fetchUnitReports();
    }
  }, [fetchUnitReports, unitProfile]);

  // 3. Simpan Baris Data via API Handler
  const handleSaveRow = async (updatedRow: GridRowData) => {
    if (!unitProfile?.unit_id) return;

    const updatedAllRows = rowData.map((r) =>
      r.no_urut === updatedRow.no_urut ? updatedRow : r
    );

    if (!rowData.some((r) => r.no_urut === updatedRow.no_urut)) {
      updatedAllRows.push(updatedRow);
    }

    const payload = {
      report_date: selectedDate,
      unit_id: unitProfile.unit_id,
      reports: updatedAllRows.map((item) => ({
        ...(item.id ? { id: item.id } : {}),
        no_urut: item.no_urut,
        nama_sm: item.nama_sm,
        nrik: item.nrik,
        vendor: item.vendor,
        join_date: item.join_date,
        dblm_status: item.dblm_status,
        kode_officer: item.kode_officer,
      })),
    };

    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || "Gagal menyimpan data ke server.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-100">
            Input Lembar Kerja Harian Unit
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Isi dan perbarui data Sales Officer / SM harian. Perubahan tersimpan otomatis.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs font-medium text-slate-400">Tanggal Laporan:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Unit Info Summary Bar */}
      {unitProfile ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            title="KCP / UNIT"
            value={unitProfile.kcp_name}
            description={unitProfile.kc_name}
            variant="default"
          />
          <StatCard
            title="SENTRA MIKRO"
            value={unitProfile.sentra_mikro}
            description={`UNIT: ${unitProfile.muh_name}`}
            variant="info"
          />
          <StatCard
            title="ANALIS MIKRO"
            value={unitProfile.analis_mikro}
            description={`Status UNIT: ${unitProfile.muh_status}`}
            variant="default"
          />
          <StatCard
            title="STATUS LAPORAN"
            value={isLocked ? "TERKUNCI" : "TERBUKA"}
            description={formatDateID(selectedDate)}
            variant={isLocked ? "danger" : "success"}
          />
        </div>
      ) : userRole === "HEAD_AREA" ? (
        <div className="rounded-xl border border-amber-800/60 bg-amber-950/30 p-4 text-amber-200 text-xs">
          💡 <strong>Informasi Peran (Head Area):</strong> Anda sedang masuk sebagai <strong>HEAD_AREA</strong>. Halaman ini khusus untuk penginputan unit harian oleh role <strong>UNIT</strong>. Silakan klik menu <a href="/head-area" className="underline font-bold text-amber-400">Konsolidasi Unit</a> di atas untuk memantau dan mengunci seluruh 17 unit area.
        </div>
      ) : null}

      {/* Interactive Grid Container */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-xl">
        {loading ? (
          <div className="flex h-64 items-center justify-center text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
              Memuat data lembar kerja harian...
            </div>
          </div>
        ) : unitProfile ? (
          <UnitGrid
            rowData={rowData}
            isLocked={isLocked}
            onSaveRow={handleSaveRow}
            unitMetaData={unitProfile || undefined}
          />
        ) : (
          <div className="flex h-48 items-center justify-center text-xs text-slate-500 text-center p-6">
            Pilih unit kerja atau masuk menggunakan akun Role UNIT untuk dapat menginput data tabel harian.
          </div>
        )}
      </div>
    </div>
  );
}

// Explicit Standard Default Export for Next.js App Router
export default UnitGridPage;