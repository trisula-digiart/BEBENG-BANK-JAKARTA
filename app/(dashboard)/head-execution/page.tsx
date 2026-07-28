"use client";

import React, { useEffect, useState, useCallback } from "react";
import { ExecutionGrid, ExecutionRowData } from "@/components/grid/ExecutionGrid";
import { StatCard } from "@/components/dashboard/StatCard";
import { getTodayDateString, formatDateID } from "@/lib/utils";
import { createClient } from "@supabase/supabase-js";

// Inisialisasi Supabase Client untuk Realtime Subscription
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function HeadExecutionPage() {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [allData, setAllData] = useState<ExecutionRowData[]>([]);
  const [filteredData, setFilteredData] = useState<ExecutionRowData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [appName, setAppName] = useState<string>("Bank Daily Report");

  // State Filter
  const [selectedSentra, setSelectedSentra] = useState<string>("ALL");
  const [selectedMuh, setSelectedMuh] = useState<string>("ALL");

  useEffect(() => {
    const savedName = localStorage.getItem("APP_BANK_NAME");
    if (savedName) setAppName(savedName);
  }, []);

  const fetchConsolidatedExecutions = useCallback(async () => {
    try {
      const res = await fetch(`/api/executions?date=${selectedDate}`, { cache: "no-store" });
      const result = await res.json();

      if (res.ok && Array.isArray(result.data)) {
        const mappedRows: ExecutionRowData[] = result.data.map((item: any) => ({
          id: item.id,
          no_urut: item.no_urut,
          nama_sentra: item.nama_sentra || item.units?.sentra_mikro || "Sentra Mikro",
          nama_muh: item.nama_muh || item.units?.muh_name || "MUH Unit",
          nama_sm: item.nama_sm || "",
          nama_debitur: item.nama_debitur || "",
          bidang_usaha: item.bidang_usaha || "",
          no_tabungan: item.no_tabungan || "",
          no_pinjaman: item.no_pinjaman || "",
          line_proses: item.line_proses || "SM",
          plafon: Number(item.plafon) || 0,
          nett_booking: Number(item.nett_booking) || 0,
          tgl_cair: item.tgl_cair || selectedDate,
          periode_bulan: item.periode_bulan || "",
          qris: item.qris || "",
          jakone_abank: item.jakone_abank || "",
          jakone_mobile: item.jakone_mobile || "",
          edc: item.edc || "",
          keterangan: item.keterangan || "",
        }));

        setAllData(mappedRows);
        setFilteredData(mappedRows);
      }
    } catch (err) {
      console.error("Gagal mengambil konsolidasi eksekusi:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    setLoading(true);
    fetchConsolidatedExecutions();

    // =========================================================================
    // DUAL-ENGINE REALTIME SYNC (WEBSOCKET CHANNEL + 5s POLLING FALLSAFE)
    // =========================================================================
    
    // 1. Supabase Realtime Listener (WebSocket)
    const channel = supabase
      .channel("realtime_head_executions_channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "executions" },
        () => {
          fetchConsolidatedExecutions();
        }
      )
      .subscribe();

    // 2. High-Frequency Polling Fallback (Tiap 5 Detik)
    const pollInterval = setInterval(() => {
      fetchConsolidatedExecutions();
    }, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [fetchConsolidatedExecutions]);

  // Handle Filtering Real-Time
  useEffect(() => {
    let result = allData;
    if (selectedSentra !== "ALL") {
      result = result.filter((item) => item.nama_sentra === selectedSentra);
    }
    if (selectedMuh !== "ALL") {
      result = result.filter((item) => item.nama_muh === selectedMuh);
    }
    setFilteredData(result);
  }, [selectedSentra, selectedMuh, allData]);

  const sentraOptions = Array.from(new Set(allData.map((d) => d.nama_sentra))).filter(Boolean);
  const muhOptions = Array.from(new Set(allData.map((d) => d.nama_muh))).filter(Boolean);

  const totalPlafonArea = filteredData.reduce((acc, curr) => acc + (Number(curr.plafon) || 0), 0);
  const totalNettBookingArea = filteredData.reduce((acc, curr) => acc + (Number(curr.nett_booking) || 0), 0);
  const totalDebitur = filteredData.filter((r) => r.nama_debitur && r.nama_debitur !== "-").length;

  const formatRupiah = (val: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);

  // GENERATOR SPREADSHEET EXCEL NATIVE BERKOLOM RAPIH
  const handleExportExcel = () => {
    if (filteredData.length === 0) {
      alert("Tidak ada data eksekusi untuk diexport.");
      return;
    }

    let tableHTML = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
        <style>
          table { border-collapse: collapse; width: 100%; }
          th { background-color: #1e3a8a; color: #ffffff; font-weight: bold; border: 1px solid #000000; text-align: center; }
          td { border: 1px solid #000000; font-size: 11px; }
          .num { text-align: right; mso-number-format:"\\#\\,\\#\\#0"; }
          .text { mso-number-format:"\\@"; }
        </style>
      </head>
      <body>
        <h2>REKAPITULASI DATA EKSEKUSI AREA - ${appName.toUpperCase()}</h2>
        <p><b>Tanggal Laporan:</b> ${formatDateID(selectedDate)} | <b>Filter Sentra:</b> ${selectedSentra} | <b>Filter MUH:</b> ${selectedMuh}</p>
        <table>
          <thead>
            <tr>
              <th>NO</th>
              <th>NAMA SENTRA</th>
              <th>NAMA MUH</th>
              <th>NAMA SM</th>
              <th>NAMA DEBITUR</th>
              <th>BIDANG USAHA</th>
              <th>NO TABUNGAN</th>
              <th>NO PINJAMAN</th>
              <th>LINE PROSES</th>
              <th>PLAFON (IDR)</th>
              <th>NETT BOOKING (IDR)</th>
              <th>TGL CAIR</th>
              <th>PERIODE BULAN</th>
              <th>QRIS</th>
              <th>JAKONE ABANK</th>
              <th>JAKONE MOBILE</th>
              <th>EDC</th>
              <th>KETERANGAN</th>
            </tr>
          </thead>
          <tbody>
    `;

    filteredData.forEach((row, idx) => {
      tableHTML += `
        <tr>
          <td align="center">${idx + 1}</td>
          <td class="text">${row.nama_sentra || ""}</td>
          <td class="text">${row.nama_muh || ""}</td>
          <td class="text">${row.nama_sm || ""}</td>
          <td class="text"><b>${row.nama_debitur || ""}</b></td>
          <td class="text">${row.bidang_usaha || ""}</td>
          <td class="text">${row.no_tabungan || ""}</td>
          <td class="text">${row.no_pinjaman || ""}</td>
          <td align="center" style="background-color: #fef08a;">${row.line_proses || ""}</td>
          <td class="num">${row.plafon || 0}</td>
          <td class="num">${row.nett_booking || 0}</td>
          <td align="center">${row.tgl_cair || ""}</td>
          <td align="center">${row.periode_bulan || ""}</td>
          <td align="center">${row.qris || ""}</td>
          <td align="center">${row.jakone_abank || ""}</td>
          <td align="center">${row.jakone_mobile || ""}</td>
          <td align="center">${row.edc || ""}</td>
          <td class="text">${row.keterangan || ""}</td>
        </tr>
      `;
    });

    tableHTML += `
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([tableHTML], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Rekap_Eksekusi_${selectedDate}_${selectedSentra.replace(/\s+/g, "_")}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full space-y-5 pb-8">
      {/* 1. TAMPILAN DASHBOARD WEB */}
      <div className="print:hidden space-y-5">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-rose-400 mb-1">
              <span>AREA HEAD MONITORING</span> • <span>WALIKOTA JAKARTA TIMUR</span> • <span className="text-emerald-400 animate-pulse">⚡ LIVE REALTIME ACTIVE</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-100">
              Rekap Data Eksekusi Seluruh Area
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Konsolidasi rekapitulasi data debitur eksekusi, line proses, plafon, dan nett booking secara otomatis tanpa perlu merefresh.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-slate-400">Pilih Tanggal:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 focus:border-rose-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Area Metrics Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            title="TOTAL DEBITUR EKSEKUSI AREA"
            value={`${totalDebitur} Debitur`}
            description={formatDateID(selectedDate)}
            variant="info"
          />
          <StatCard
            title="TOTAL PLAFON AREA"
            value={formatRupiah(totalPlafonArea)}
            description="Akumulasi Hasil Filter"
            variant="default"
          />
          <StatCard
            title="TOTAL NETT BOOKING AREA"
            value={formatRupiah(totalNettBookingArea)}
            description="Realisasi Booking Hasil Filter"
            variant="success"
          />
        </div>

        {/* Filter & Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between bg-slate-900 border border-slate-800 p-3 rounded-xl gap-3">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">Filter Sentra:</span>
              <select
                value={selectedSentra}
                onChange={(e) => setSelectedSentra(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-2.5 py-1.5 focus:border-rose-500 focus:outline-none"
              >
                <option value="ALL">-- Semua Sentra --</option>
                {sentraOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">Filter MUH:</span>
              <select
                value={selectedMuh}
                onChange={(e) => setSelectedMuh(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-2.5 py-1.5 focus:border-rose-500 focus:outline-none"
              >
                <option value="ALL">-- Semua MUH --</option>
                {muhOptions.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>📥</span> Export Excel (.xls)
            </button>
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg shadow-md shadow-blue-600/20 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>🖨️</span> Cetak Laporan PDF
            </button>
          </div>
        </div>

        {/* Grid Container Read-Only */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-xl">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wide flex items-center gap-2">
              <span>📋 Tabel Rekapitulasi Data Eksekusi Area (Read-Only)</span>
              <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded font-mono">
                LIVE REALTIME
              </span>
            </h3>
            <span className="text-[11px] font-mono text-slate-400">
              Tanggal Laporan: <span className="text-rose-400">{formatDateID(selectedDate)}</span>
            </span>
          </div>

          {loading ? (
            <div className="flex h-64 items-center justify-center text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
                Memuat konsolidasi rekap data eksekusi area...
              </div>
            </div>
          ) : (
            <ExecutionGrid
              rowData={filteredData}
              isLocked={true}
              onSaveRow={async () => {}}
              readOnly={true}
            />
          )}
        </div>
      </div>

      {/* 2. TABEL KHUSUS CETAK PRINT / PDF */}
      <div className="print-only-container">
        <div style={{ textAlign: "center", marginBottom: "15px" }}>
          <h2 style={{ margin: "0", fontSize: "16pt", textTransform: "uppercase" }}>{appName}</h2>
          <h3 style={{ margin: "5px 0 0 0", fontSize: "12pt" }}>LAPORAN REKAPITULASI DATA EKSEKUSI DEBITUR AREA</h3>
          <p style={{ margin: "5px 0 0 0", fontSize: "10pt" }}>
            Tanggal Laporan: <b>{formatDateID(selectedDate)}</b> | Filter Sentra: <b>{selectedSentra}</b> | Total Debitur: <b>{totalDebitur}</b>
          </p>
        </div>

        <table className="print-table">
          <thead>
            <tr>
              <th>NO</th>
              <th>SENTRA</th>
              <th>MUH</th>
              <th>SM</th>
              <th>NAMA DEBITUR</th>
              <th>BIDANG USAHA</th>
              <th>NO TABUNGAN</th>
              <th>NO PINJAMAN</th>
              <th>LINE PROSES</th>
              <th>PLAFON</th>
              <th>NETT BOOKING</th>
              <th>TGL CAIR</th>
              <th>PERIODE</th>
              <th>QRIS</th>
              <th>JAKONE</th>
              <th>EDC</th>
              <th>KETERANGAN</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((row, idx) => (
              <tr key={row.id || idx}>
                <td style={{ textAlign: "center" }}>{idx + 1}</td>
                <td>{row.nama_sentra}</td>
                <td>{row.nama_muh}</td>
                <td>{row.nama_sm}</td>
                <td><b>{row.nama_debitur}</b></td>
                <td>{row.bidang_usaha}</td>
                <td>{row.no_tabungan}</td>
                <td>{row.no_pinjaman}</td>
                <td style={{ textAlign: "center" }}>{row.line_proses}</td>
                <td style={{ textAlign: "right" }}>{formatRupiah(row.plafon)}</td>
                <td style={{ textAlign: "right" }}>{formatRupiah(row.nett_booking)}</td>
                <td style={{ textAlign: "center" }}>{row.tgl_cair}</td>
                <td style={{ textAlign: "center" }}>{row.periode_bulan}</td>
                <td style={{ textAlign: "center" }}>{row.qris}</td>
                <td style={{ textAlign: "center" }}>{row.jakone_mobile || row.jakone_abank}</td>
                <td style={{ textAlign: "center" }}>{row.edc}</td>
                <td>{row.keterangan}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginTop: "30px", display: "flex", justifyContent: "space-between", fontSize: "10pt" }}>
          <div>
            <p>Dicetak Otomatis Oleh System</p>
            <p>Waktu Cetak: {new Date().toLocaleString("id-ID")}</p>
          </div>
          <div style={{ textAlign: "center", width: "200px" }}>
            <p>Area Head Walikota Jkt Timur</p>
            <br /><br /><br />
            <p style={{ fontWeight: "bold", textDecoration: "underline" }}>( .................................... )</p>
          </div>
        </div>
      </div>
    </div>
  );
}