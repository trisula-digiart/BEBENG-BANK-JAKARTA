"use client";

import React, { useEffect, useState, useCallback } from "react";
import { ExecutionGrid, ExecutionRowData } from "@/components/grid/ExecutionGrid";
import { getTodayDateString, formatDateID } from "@/lib/utils";
import { createBrowserClient } from "@/lib/supabase/client";

export default function HeadExecutionPage() {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [allData, setAllData] = useState<ExecutionRowData[]>([]);
  const [filteredData, setFilteredData] = useState<ExecutionRowData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [appName, setAppName] = useState<string>("Bank Daily Report");
  const [isMounted, setIsMounted] = useState<boolean>(false);

  // Filter State (Default ALL)
  const [selectedSentra, setSelectedSentra] = useState<string>("ALL");
  const [selectedMuh, setSelectedMuh] = useState<string>("ALL");

  useEffect(() => {
    setIsMounted(true);
    const today = getTodayDateString();
    setSelectedDate(today);

    const savedName = localStorage.getItem("APP_BANK_NAME");
    if (savedName) setAppName(savedName);
  }, []);

  // Fetch Consolidated Executions Realtime dari Supabase Cloud via Backend API
  const fetchConsolidatedExecutions = useCallback(async () => {
    try {
      const timestamp = Date.now();
      const res = await fetch(`/api/executions?_t=${timestamp}`, {
        cache: "no-store",
        headers: {
          "Pragma": "no-cache",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      });
      const result = await res.json();

      if (res.ok && Array.isArray(result.data)) {
        const mappedRows: ExecutionRowData[] = result.data.map((item: any) => ({
          id: item.id,
          no_urut: item.no_urut,
          nama_sentra: item.nama_sentra ? String(item.nama_sentra).trim() : "-",
          nama_muh: item.nama_muh ? String(item.nama_muh).trim() : "-",
          nama_sm: item.nama_sm || "",
          nama_debitur: item.nama_debitur || "",
          bidang_usaha: item.bidang_usaha || "",
          no_tabungan: item.no_tabungan || "",
          no_pinjaman: item.no_pinjaman || "",
          line_proses: item.line_proses || "SM",
          plafon: Number(item.plafon) || 0,
          nett_booking: Number(item.nett_booking) || 0,
          tgl_cair: item.tgl_cair || "",
          periode_bulan: item.periode_bulan || "",
          qris: item.qris || "",
          jakone_abank: item.jakone_abank || "",
          jakone_mobile: item.jakone_mobile || "",
          edc: item.edc || "",
          keterangan: item.keterangan || "",
        }));

        setAllData(mappedRows);
      }
    } catch (err) {
      console.error("Gagal mengambil konsolidasi eksekusi dari API:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchConsolidatedExecutions();

    // Browser Supabase Client Singleton menggunakan createBrowserClient
    const supabase = createBrowserClient();

    // DUAL-ENGINE INSTANT SYNC
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

    const pollInterval = setInterval(() => {
      fetchConsolidatedExecutions();
    }, 1500);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [fetchConsolidatedExecutions]);

  // Logika Penyaringan
  useEffect(() => {
    let result = [...allData];

    if (selectedSentra && selectedSentra !== "ALL") {
      result = result.filter(
        (item) =>
          (item.nama_sentra ?? "").toLowerCase().trim() === selectedSentra.toLowerCase().trim()
      );
    }

    if (selectedMuh && selectedMuh !== "ALL") {
      result = result.filter(
        (item) =>
          (item.nama_muh ?? "").toLowerCase().trim() === selectedMuh.toLowerCase().trim()
      );
    }

    setFilteredData(result);
  }, [selectedSentra, selectedMuh, allData]);

  const sentraOptions = Array.from(
    new Set(allData.map((d) => d.nama_sentra).filter((s): s is string => Boolean(s) && s !== "-"))
  );
  
  const muhOptions = Array.from(
    new Set(allData.map((d) => d.nama_muh).filter((m): m is string => Boolean(m) && m !== "-"))
  );

  const totalPlafonArea = filteredData.reduce((acc, curr) => acc + (Number(curr.plafon) || 0), 0);
  const totalNettBookingArea = filteredData.reduce((acc, curr) => acc + (Number(curr.nett_booking) || 0), 0);
  const totalDebitur = filteredData.filter((r) => r.nama_debitur && r.nama_debitur !== "-").length;

  const activeSentraName = filteredData[0]?.nama_sentra || "Semua Sentra Area";
  const activeMuhName = filteredData[0]?.nama_muh || "Seluruh Petugas";

  const formatRupiah = (val: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);

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
        <p><b>Periode Bulan:</b> ${formatDateID(selectedDate)} | <b>Filter Sentra:</b> ${selectedSentra} | <b>Filter MUH:</b> ${selectedMuh}</p>
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

  if (!isMounted) {
    return (
      <div className="w-full h-64 flex items-center justify-center text-xs text-slate-400">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-rose-500 border-t-transparent mr-2" />
        Memuat konsolidasi rekap data eksekusi area...
      </div>
    );
  }

  return (
    <div className="w-full space-y-2 pb-4">
      {/* 1. TAMPILAN DASHBOARD WEB COMPACT */}
      <div className="print:hidden space-y-2">
        {/* Compact Header Toolbar */}
        <div className="flex flex-wrap items-center justify-between bg-slate-900 border border-slate-800 p-2.5 rounded-xl gap-2">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span>📋 Rekap Eksekusi Area</span>
              <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded font-mono animate-pulse">
                ⚡ LIVE REALTIME ALL UNITS ({filteredData.length})
              </span>
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Metric Bar */}
            <div className="hidden lg:flex items-center gap-3 bg-slate-950 px-3 py-1 rounded-lg border border-slate-800 font-mono text-[11px]">
              <span className="text-slate-400">Total: <strong className="text-rose-400">{totalDebitur} Debitur</strong></span>
              <span className="text-slate-700">|</span>
              <span className="text-slate-400">Plafon: <strong className="text-emerald-400">{formatRupiah(totalPlafonArea)}</strong></span>
              <span className="text-slate-700">|</span>
              <span className="text-slate-400">Nett: <strong className="text-blue-400">{formatRupiah(totalNettBookingArea)}</strong></span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 text-[11px]">Sentra:</span>
              <select
                value={selectedSentra}
                onChange={(e) => setSelectedSentra(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-200 rounded px-2 py-1 text-xs focus:outline-none"
              >
                <option value="ALL">-- Semua Sentra --</option>
                {sentraOptions.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 text-[11px]">MUH:</span>
              <select
                value={selectedMuh}
                onChange={(e) => setSelectedMuh(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-200 rounded px-2 py-1 text-xs focus:outline-none"
              >
                <option value="ALL">-- Semua MUH --</option>
                {muhOptions.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleExportExcel}
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded transition-all cursor-pointer"
            >
              📥 Excel
            </button>
            <button
              onClick={handlePrint}
              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded transition-all cursor-pointer"
            >
              🖨️ PDF
            </button>
          </div>
        </div>

        {/* Maximize Grid Height Area */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-2 shadow-2xl">
          {loading && allData.length === 0 ? (
            <div className="flex h-96 items-center justify-center text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
                Memuat konsolidasi rekap data eksekusi area...
              </div>
            </div>
          ) : (
            <ExecutionGrid
              sentraName={activeSentraName}
              muhName={activeMuhName}
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
            Acuan Periode: <b>{formatDateID(selectedDate)}</b> | Filter Sentra: <b>{selectedSentra}</b> | Total Debitur: <b>{totalDebitur}</b>
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