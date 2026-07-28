"use client";

import React, { useState, useEffect, useCallback } from "react";
import { getTodayDateString } from "@/lib/utils";

export interface ExecutionRowData {
  id?: string;
  no_urut?: number;
  unit_id: string;
  report_date: string;
  nama_sentra?: string;
  nama_muh?: string;
  nama_sm: string;
  nama_debitur: string;
  bidang_usaha: string;
  no_tabungan: string;
  no_pinjaman: string;
  line_proses: string;
  plafon: number;
  nett_booking: number;
  tgl_cair: string;
  periode_bulan: string;
  qris: string;
  jakone_abank: string;
  jakone_mobile: string;
  edc: string;
  keterangan: string;
}

// Backward-compatibility alias
export type ExecutionRow = ExecutionRowData;

export interface ExecutionGridProps {
  unitId?: string;
  sentraName?: string;
  muhName?: string;
  reportDate?: string;
  isLocked?: boolean;
  rowData?: ExecutionRowData[];
  onSaveRow?: (row: ExecutionRowData) => Promise<void> | void;
  readOnly?: boolean;
}

export function ExecutionGrid({
  unitId,
  sentraName,
  muhName,
  reportDate = getTodayDateString(),
  isLocked = false,
  rowData,
  onSaveRow,
  readOnly = false,
}: ExecutionGridProps) {
  const [internalRows, setInternalRows] = useState<ExecutionRowData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saveStatus, setSaveStatus] = useState<string>("");

  // Gunakan data dari props jika disuplai (Head Execution), jika tidak gunakan internal state
  const rows = rowData || internalRows;
  const isReadOnly = isLocked || readOnly;

  // Safety Fallback UUID jika unitId dari parent belum terisi
  const activeUnitId =
    unitId && unitId !== "undefined" && unitId !== "null" && unitId.trim() !== ""
      ? unitId
      : "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

  const fetchExecutions = useCallback(async () => {
    if (rowData) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/executions?unit_id=${activeUnitId}&date=${reportDate}`);
      const result = await res.json();
      if (res.ok && Array.isArray(result.data)) {
        setInternalRows(result.data);
      }
    } catch (err) {
      console.error("Failed to fetch execution rows:", err);
    } finally {
      setLoading(false);
    }
  }, [activeUnitId, reportDate, rowData]);

  useEffect(() => {
    fetchExecutions();
  }, [fetchExecutions]);

  // Tambah Baris Baru
  const handleAddRow = () => {
    const nextNoUrut = rows.length + 1;
    const newRow: ExecutionRowData = {
      id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      no_urut: nextNoUrut,
      unit_id: activeUnitId,
      report_date: reportDate,
      nama_sm: "-",
      nama_debitur: "-",
      bidang_usaha: "-",
      no_tabungan: "-",
      no_pinjaman: "-",
      line_proses: "SM",
      plafon: 0,
      nett_booking: 0,
      tgl_cair: reportDate,
      periode_bulan: `${new Date().getMonth() + 1}/${new Date().getFullYear()}`,
      qris: "",
      jakone_abank: "",
      jakone_mobile: "",
      edc: "",
      keterangan: "COLLECT DATA",
    };

    if (!rowData) {
      setInternalRows((prev) => [...prev, newRow]);
    }
  };

  // Handle Perubahan Sel & Auto Save
  const handleCellChange = (index: number, field: keyof ExecutionRowData, value: any) => {
    const updatedRows = [...rows];
    updatedRows[index] = { ...updatedRows[index], [field]: value, no_urut: index + 1 };
    
    if (!rowData) {
      setInternalRows(updatedRows);
      autoSaveRow(updatedRows[index], index);
    } else if (onSaveRow) {
      onSaveRow(updatedRows[index]);
    }
  };

  const autoSaveRow = async (rowToSave: ExecutionRowData, rowIndex: number) => {
    setSaveStatus("💾 Menyimpan...");
    try {
      const payload = {
        ...rowToSave,
        unit_id: activeUnitId,
        no_urut: rowToSave.no_urut || rowIndex + 1,
      };

      const res = await fetch("/api/executions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (res.ok && result.data) {
        setInternalRows((prev) => {
          const newRows = [...prev];
          newRows[rowIndex] = { ...newRows[rowIndex], id: result.data.id, no_urut: result.data.no_urut };
          return newRows;
        });
        setSaveStatus("✓ Tersimpan!");
      } else {
        setSaveStatus("✕ Gagal");
      }
    } catch (err) {
      setSaveStatus("✕ Gagal");
    } finally {
      setTimeout(() => setSaveStatus(""), 2000);
    }
  };

  const handleDeleteRow = async (index: number, id?: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus baris debitur ini?")) {
      if (id && !id.startsWith("temp_")) {
        try {
          await fetch(`/api/executions?id=${id}`, { method: "DELETE" });
        } catch (e) {
          console.error("Delete row failed", e);
        }
      }
      if (!rowData) {
        setInternalRows((prev) => prev.filter((_, i) => i !== index));
      }
    }
  };

  const totalPlafon = rows.reduce((acc, r) => acc + (Number(r.plafon) || 0), 0);
  const totalNett = rows.reduce((acc, r) => acc + (Number(r.nett_booking) || 0), 0);

  const formatRupiah = (val: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);

  return (
    <div className="w-full space-y-4">
      {/* SINGLE UNIFIED SUMMARY STAT CARD */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
          <span className="text-[10px] font-mono text-slate-400 uppercase block">SENTRA MIKRO</span>
          <span className="text-sm font-bold text-slate-100 block mt-0.5">{sentraName || "Sentra Mikro Jkt Timur"}</span>
          <span className="text-[10px] text-slate-500 block">MUH: {muhName || "Budi Santoso"}</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
          <span className="text-[10px] font-mono text-slate-400 uppercase block">TOTAL PLAFON EKSEKUSI</span>
          <span className="text-sm font-bold text-emerald-400 block mt-0.5">{formatRupiah(totalPlafon)}</span>
          <span className="text-[10px] text-slate-500 block">{rows.length} Debitur Terdaftar</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
          <span className="text-[10px] font-mono text-slate-400 uppercase block">TOTAL NETT BOOKING</span>
          <span className="text-sm font-bold text-blue-400 block mt-0.5">{formatRupiah(totalNett)}</span>
          <span className="text-[10px] text-slate-500 block">Realisasi Akad & Booking</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-slate-400 uppercase block">STATUS LAPORAN</span>
            <span className={`text-xs font-bold block mt-0.5 ${isReadOnly ? "text-rose-400" : "text-emerald-400"}`}>
              {isReadOnly ? "🔒 TERKUNCI (READ ONLY)" : "TERBUKA"}
            </span>
          </div>
          {saveStatus && (
            <span className={`text-[10px] font-mono font-bold px-2 py-1 rounded ${
              saveStatus.includes("✓") ? "bg-emerald-950 text-emerald-400" : saveStatus.includes("✕") ? "bg-rose-950 text-rose-400" : "bg-indigo-950 text-indigo-400"
            }`}>
              {saveStatus}
            </span>
          )}
        </div>
      </div>

      {/* Main Grid Table Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-2xl">
        <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            {!isReadOnly && (
              <button
                onClick={handleAddRow}
                className="px-4 py-2 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-600/30 transition-all cursor-pointer flex items-center gap-2 active:scale-95"
              >
                <span className="text-sm font-black">+</span> Tambah Baris Eksekusi
              </button>
            )}
            <span className="text-[11px] text-slate-400 font-mono">
              📊 <strong>Tabel Eksekusi Debitur:</strong> Isi nama debitur, plafon, line proses & keterangan.
            </span>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-950 text-slate-400 uppercase font-mono border-b border-slate-800 text-[10px]">
              <tr>
                <th className="p-2 border-r border-slate-800 w-8">NO</th>
                <th className="p-2 border-r border-slate-800 min-w-[130px]">NAMA SENTRA</th>
                <th className="p-2 border-r border-slate-800 min-w-[120px]">NAMA MUH</th>
                <th className="p-2 border-r border-slate-800 min-w-[120px]">NAMA SM</th>
                <th className="p-2 border-r border-slate-800 min-w-[140px]">NAMA DEBITUR</th>
                <th className="p-2 border-r border-slate-800 min-w-[110px]">BIDANG USAHA</th>
                <th className="p-2 border-r border-slate-800 min-w-[100px]">NO TABUNGAN</th>
                <th className="p-2 border-r border-slate-800 min-w-[100px]">NO PINJAMAN</th>
                <th className="p-2 border-r border-slate-800 min-w-[100px]">LINE PROSES</th>
                <th className="p-2 border-r border-slate-800 min-w-[110px] text-right">PLAFON</th>
                <th className="p-2 border-r border-slate-800 min-w-[110px] text-right">NETT BOOKING</th>
                <th className="p-2 border-r border-slate-800 min-w-[100px]">TGL CAIR</th>
                <th className="p-2 border-r border-slate-800 min-w-[90px]">PERIODE</th>
                <th className="p-2 border-r border-slate-800 text-center">QRIS</th>
                <th className="p-2 border-r border-slate-800 text-center">JAKONE ABANK</th>
                <th className="p-2 border-r border-slate-800 text-center">JAKONE MOBILE</th>
                <th className="p-2 border-r border-slate-800 text-center">EDC</th>
                <th className="p-2 border-r border-slate-800 min-w-[130px]">KETERANGAN</th>
                {!isReadOnly && <th className="p-2 text-center w-10">AKSI</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans text-slate-200 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={19} className="text-center py-8 text-slate-500 font-mono">
                    Memuat data eksekusi debitur...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={19} className="text-center py-8 text-slate-500">
                    Belum ada data eksekusi hari ini.
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => (
                  <tr key={row.id || idx} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-2 border-r border-slate-800 font-mono text-slate-500 text-center">{idx + 1}</td>
                    <td className="p-2 border-r border-slate-800 font-bold text-rose-400">{row.nama_sentra || sentraName || "Sentra Mikro Jkt Timur"}</td>
                    <td className="p-2 border-r border-slate-800 text-slate-300">{row.nama_muh || muhName || "Budi Santoso"}</td>
                    
                    {/* Input NAMA SM */}
                    <td className="p-1 border-r border-slate-800">
                      <input
                        type="text"
                        disabled={isReadOnly}
                        value={row.nama_sm}
                        onChange={(e) => handleCellChange(idx, "nama_sm", e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-100 focus:outline-none focus:border-rose-500 text-xs"
                      />
                    </td>

                    {/* Input NAMA DEBITUR */}
                    <td className="p-1 border-r border-slate-800 font-bold text-blue-400">
                      <input
                        type="text"
                        disabled={isReadOnly}
                        value={row.nama_debitur}
                        onChange={(e) => handleCellChange(idx, "nama_debitur", e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 font-bold text-blue-400 focus:outline-none focus:border-rose-500 text-xs"
                      />
                    </td>

                    {/* Input BIDANG USAHA */}
                    <td className="p-1 border-r border-slate-800">
                      <input
                        type="text"
                        disabled={isReadOnly}
                        value={row.bidang_usaha}
                        onChange={(e) => handleCellChange(idx, "bidang_usaha", e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-300 focus:outline-none focus:border-rose-500 text-xs"
                      />
                    </td>

                    {/* Input NO TABUNGAN */}
                    <td className="p-1 border-r border-slate-800">
                      <input
                        type="text"
                        disabled={isReadOnly}
                        value={row.no_tabungan}
                        onChange={(e) => handleCellChange(idx, "no_tabungan", e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 font-mono text-slate-300 focus:outline-none focus:border-rose-500 text-xs"
                      />
                    </td>

                    {/* Input NO PINJAMAN */}
                    <td className="p-1 border-r border-slate-800">
                      <input
                        type="text"
                        disabled={isReadOnly}
                        value={row.no_pinjaman}
                        onChange={(e) => handleCellChange(idx, "no_pinjaman", e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 font-mono text-slate-300 focus:outline-none focus:border-rose-500 text-xs"
                      />
                    </td>

                    {/* Select LINE PROSES */}
                    <td className="p-1 border-r border-slate-800">
                      <select
                        disabled={isReadOnly}
                        value={row.line_proses}
                        onChange={(e) => handleCellChange(idx, "line_proses", e.target.value)}
                        className="w-full bg-amber-200 font-bold text-slate-950 border border-amber-300 rounded px-1.5 py-1 focus:outline-none text-xs"
                      >
                        <option value="SM">SM</option>
                        <option value="BOOKING">BOOKING</option>
                        <option value="REJECT">REJECT</option>
                        <option value="KC">KC</option>
                        <option value="RBM">RBM</option>
                      </select>
                    </td>

                    {/* Input PLAFON */}
                    <td className="p-1 border-r border-slate-800">
                      <input
                        type="number"
                        disabled={isReadOnly}
                        value={row.plafon}
                        onChange={(e) => handleCellChange(idx, "plafon", Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-right font-mono text-emerald-400 font-bold focus:outline-none focus:border-rose-500 text-xs"
                      />
                    </td>

                    {/* Input NETT BOOKING */}
                    <td className="p-1 border-r border-slate-800">
                      <input
                        type="number"
                        disabled={isReadOnly}
                        value={row.nett_booking}
                        onChange={(e) => handleCellChange(idx, "nett_booking", Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-right font-mono text-blue-400 font-bold focus:outline-none focus:border-rose-500 text-xs"
                      />
                    </td>

                    {/* Input TGL CAIR */}
                    <td className="p-1 border-r border-slate-800">
                      <input
                        type="date"
                        disabled={isReadOnly}
                        value={row.tgl_cair || ""}
                        onChange={(e) => handleCellChange(idx, "tgl_cair", e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1 font-mono text-slate-300 focus:outline-none text-[11px]"
                      />
                    </td>

                    {/* Input PERIODE BULAN */}
                    <td className="p-1 border-r border-slate-800">
                      <input
                        type="text"
                        disabled={isReadOnly}
                        value={row.periode_bulan}
                        onChange={(e) => handleCellChange(idx, "periode_bulan", e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1 font-mono text-slate-300 focus:outline-none text-[11px]"
                      />
                    </td>

                    {/* Checkbox QRIS */}
                    <td className="p-2 border-r border-slate-800 text-center">
                      <input
                        type="checkbox"
                        disabled={isReadOnly}
                        checked={row.qris === "V" || row.qris === "true"}
                        onChange={(e) => handleCellChange(idx, "qris", e.target.checked ? "V" : "")}
                        className="rounded border-slate-800 text-rose-600 focus:ring-0 cursor-pointer"
                      />
                    </td>

                    {/* Checkbox JAKONE ABANK */}
                    <td className="p-2 border-r border-slate-800 text-center">
                      <input
                        type="checkbox"
                        disabled={isReadOnly}
                        checked={row.jakone_abank === "V" || row.jakone_abank === "true"}
                        onChange={(e) => handleCellChange(idx, "jakone_abank", e.target.checked ? "V" : "")}
                        className="rounded border-slate-800 text-rose-600 focus:ring-0 cursor-pointer"
                      />
                    </td>

                    {/* Checkbox JAKONE MOBILE */}
                    <td className="p-2 border-r border-slate-800 text-center">
                      <input
                        type="checkbox"
                        disabled={isReadOnly}
                        checked={row.jakone_mobile === "V" || row.jakone_mobile === "true"}
                        onChange={(e) => handleCellChange(idx, "jakone_mobile", e.target.checked ? "V" : "")}
                        className="rounded border-slate-800 text-rose-600 focus:ring-0 cursor-pointer"
                      />
                    </td>

                    {/* Checkbox EDC */}
                    <td className="p-2 border-r border-slate-800 text-center">
                      <input
                        type="checkbox"
                        disabled={isReadOnly}
                        checked={row.edc === "V" || row.edc === "true"}
                        onChange={(e) => handleCellChange(idx, "edc", e.target.checked ? "V" : "")}
                        className="rounded border-slate-800 text-rose-600 focus:ring-0 cursor-pointer"
                      />
                    </td>

                    {/* Input KETERANGAN */}
                    <td className="p-1 border-r border-slate-800">
                      <input
                        type="text"
                        disabled={isReadOnly}
                        value={row.keterangan}
                        onChange={(e) => handleCellChange(idx, "keterangan", e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-300 focus:outline-none focus:border-rose-500 text-xs"
                      />
                    </td>

                    {/* Aksi Hapus Baris */}
                    {!isReadOnly && (
                      <td className="p-2 text-center">
                        <button
                          onClick={() => handleDeleteRow(idx, row.id)}
                          className="text-rose-500 hover:text-rose-400 font-bold px-1.5 py-0.5 rounded bg-rose-950/40 hover:bg-rose-950 border border-rose-900 transition-all cursor-pointer"
                          title="Hapus baris"
                        >
                          ✕
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}