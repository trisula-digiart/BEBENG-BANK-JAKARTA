"use client";

import React, { useState, useEffect, useCallback } from "react";
import { getTodayDateString } from "@/lib/utils";

export interface ExecutionRowData {
  id?: string;
  no_urut?: number;
  unit_id?: string;
  report_date?: string;
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

const UNIT_PERSISTENT_STORAGE_KEY = "BANK_EMOK_PERSISTENT_GRID_CACHE_V3";

function SeamlessCellInput({
  value,
  onChange,
  disabled,
  className,
  type = "text",
}: {
  value: string | number;
  onChange: (val: string | number) => void;
  disabled?: boolean;
  className?: string;
  type?: string;
}) {
  const [localValue, setLocalValue] = useState<string | number>(value ?? "");

  useEffect(() => {
    setLocalValue(value ?? "");
  }, [value]);

  const handleBlur = () => {
    if (localValue !== value) {
      onChange(type === "number" ? Number(localValue) : localValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleBlur();
    }
  };

  return (
    <input
      type={type}
      disabled={disabled}
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={className}
    />
  );
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

  const rows = rowData || internalRows;
  const isReadOnly = isLocked || readOnly;

  const saveToLocalCache = (dataToSave: ExecutionRowData[]) => {
    if (readOnly) return;
    try {
      localStorage.setItem(UNIT_PERSISTENT_STORAGE_KEY, JSON.stringify(dataToSave));
    } catch (e) {
      console.error("Failed saving local cache", e);
    }
  };

  const fetchExecutions = useCallback(async () => {
    if (rowData) {
      setLoading(false);
      return;
    }
    setLoading(true);

    try {
      const timestamp = Date.now();
      const res = await fetch(`/api/executions?_t=${timestamp}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
      });
      const result = await res.json();

      if (res.ok && Array.isArray(result.data)) {
        const mappedApi: ExecutionRowData[] = result.data.map((item: any) => ({
          id: item.id,
          no_urut: item.no_urut,
          unit_id: item.unit_id,
          nama_sentra: item.nama_sentra || sentraName || "-",
          nama_muh: item.nama_muh || muhName || "-",
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

        setInternalRows(mappedApi);
        saveToLocalCache(mappedApi);
      }
    } catch (err) {
      console.error("Fetch executions error:", err);
    } finally {
      setLoading(false);
    }
  }, [rowData, sentraName, muhName]);

  useEffect(() => {
    fetchExecutions();
  }, [fetchExecutions]);

  const autoSaveRow = async (rowToSave: ExecutionRowData, rowIndex: number) => {
    setSaveStatus("💾 Menyimpan...");
    try {
      const cleanId =
        rowToSave.id && rowToSave.id.startsWith("temp_") ? undefined : rowToSave.id;

      const payload = {
        ...rowToSave,
        id: cleanId,
        unit_id: unitId || rowToSave.unit_id,
        nama_sentra: sentraName || rowToSave.nama_sentra || "cikarang",
        nama_muh: muhName || rowToSave.nama_muh || "andi",
        no_urut: rowToSave.no_urut || rowIndex + 1,
      };

      const res = await fetch("/api/executions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (res.ok && result.data && result.data.id && result.success !== false) {
        setInternalRows((prev) => {
          const newRows = [...prev];
          if (newRows[rowIndex]) {
            newRows[rowIndex].id = result.data.id;
            saveToLocalCache(newRows);
          }
          return newRows;
        });
        setSaveStatus("✓ Tersimpan DB!");
      } else {
        setSaveStatus("⚠️ Gagal DB (Lokal Saja)");
      }
    } catch (err) {
      setSaveStatus("⚠️ Gagal DB");
    } finally {
      setTimeout(() => setSaveStatus(""), 3000);
    }
  };

  const handleAddRow = () => {
    const nextNoUrut = rows.length + 1;
    const newRow: ExecutionRowData = {
      id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      no_urut: nextNoUrut,
      unit_id: unitId,
      report_date: reportDate,
      nama_sentra: sentraName || "cikarang",
      nama_muh: muhName || "andi",
      nama_sm: "",
      nama_debitur: "",
      bidang_usaha: "-",
      no_tabungan: "-",
      no_pinjaman: "-",
      line_proses: "SM",
      plafon: 0,
      nett_booking: 0,
      tgl_cair: getTodayDateString(),
      periode_bulan: `${new Date().getMonth() + 1}/${new Date().getFullYear()}`,
      qris: "",
      jakone_abank: "",
      jakone_mobile: "",
      edc: "",
      keterangan: "COLLECT DATA",
    };

    if (!rowData) {
      const updated = [...internalRows, newRow];
      setInternalRows(updated);
      saveToLocalCache(updated);
      autoSaveRow(newRow, updated.length - 1);
    }
  };

  const handleCellChange = (index: number, field: keyof ExecutionRowData, value: any) => {
    setInternalRows((prev) => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = { ...updated[index], [field]: value };
        saveToLocalCache(updated);
        autoSaveRow(updated[index], index);
      }
      return updated;
    });

    if (onSaveRow && rows[index]) {
      onSaveRow({ ...rows[index], [field]: value });
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
        const updated = internalRows.filter((_, i) => i !== index);
        setInternalRows(updated);
        saveToLocalCache(updated);
      }
    }
  };

  const totalPlafon = rows.reduce((acc, r) => acc + (Number(r.plafon) || 0), 0);
  const totalNett = rows.reduce((acc, r) => acc + (Number(r.nett_booking) || 0), 0);

  const formatRupiah = (val: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);

  return (
    <div className="w-full space-y-4">
      {/* SUMMARY STAT CARD */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
          <span className="text-[10px] font-mono text-slate-400 uppercase block">SENTRA MIKRO</span>
          <span className="text-sm font-bold text-slate-100 block mt-0.5">{sentraName || "cikarang"}</span>
          <span className="text-[10px] text-slate-500 block">MUH: {muhName || "andi"}</span>
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
            <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded shadow-md ${
              saveStatus.includes("✓") ? "bg-emerald-950 text-emerald-400 border border-emerald-800" : "bg-rose-950 text-rose-400 border border-rose-800"
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
              📊 <strong>Tabel Eksekusi Debitur:</strong> Tekan <strong>TAB</strong> pada keyboard untuk pindah kolom secara lancar.
            </span>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-950 text-slate-400 uppercase font-mono border-b border-slate-800 text-[10px]">
              <tr>
                <th className="p-2 border-r border-slate-800 w-8">NO</th>
                <th className="p-2 border-r border-slate-800 min-w-[120px]">NAMA SENTRA</th>
                <th className="p-2 border-r border-slate-800 min-w-[110px]">NAMA MUH</th>
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
              {loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={19} className="text-center py-8 text-slate-500 font-mono">
                    Memuat data eksekusi debitur...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={19} className="text-center py-8 text-slate-500">
                    Belum ada data eksekusi bulan berjalan.
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => (
                  <tr key={`row-${idx}`} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-2 border-r border-slate-800 font-mono text-slate-500 text-center">{idx + 1}</td>
                    <td className="p-2 border-r border-slate-800 font-bold text-rose-400">{row.nama_sentra || sentraName || "-"}</td>
                    <td className="p-2 border-r border-slate-800 text-slate-300">{row.nama_muh || muhName || "-"}</td>
                    
                    {/* Input NAMA SM */}
                    <td className="p-1 border-r border-slate-800">
                      <SeamlessCellInput
                        disabled={isReadOnly}
                        value={row.nama_sm || ""}
                        onChange={(val) => handleCellChange(idx, "nama_sm", val)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-100 focus:outline-none focus:border-rose-500 text-xs"
                      />
                    </td>

                    {/* Input NAMA DEBITUR */}
                    <td className="p-1 border-r border-slate-800 font-bold text-blue-400">
                      <SeamlessCellInput
                        disabled={isReadOnly}
                        value={row.nama_debitur || ""}
                        onChange={(val) => handleCellChange(idx, "nama_debitur", val)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 font-bold text-blue-400 focus:outline-none focus:border-rose-500 text-xs"
                      />
                    </td>

                    {/* Input BIDANG USAHA */}
                    <td className="p-1 border-r border-slate-800">
                      <SeamlessCellInput
                        disabled={isReadOnly}
                        value={row.bidang_usaha || ""}
                        onChange={(val) => handleCellChange(idx, "bidang_usaha", val)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-300 focus:outline-none focus:border-rose-500 text-xs"
                      />
                    </td>

                    {/* Input NO TABUNGAN */}
                    <td className="p-1 border-r border-slate-800">
                      <SeamlessCellInput
                        disabled={isReadOnly}
                        value={row.no_tabungan || ""}
                        onChange={(val) => handleCellChange(idx, "no_tabungan", val)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 font-mono text-slate-300 focus:outline-none focus:border-rose-500 text-xs"
                      />
                    </td>

                    {/* Input NO PINJAMAN */}
                    <td className="p-1 border-r border-slate-800">
                      <SeamlessCellInput
                        disabled={isReadOnly}
                        value={row.no_pinjaman || ""}
                        onChange={(val) => handleCellChange(idx, "no_pinjaman", val)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 font-mono text-slate-300 focus:outline-none focus:border-rose-500 text-xs"
                      />
                    </td>

                    {/* Select LINE PROSES */}
                    <td className="p-1 border-r border-slate-800">
                      <select
                        disabled={isReadOnly}
                        value={row.line_proses || "SM"}
                        onChange={(e) => handleCellChange(idx, "line_proses", e.target.value)}
                        className="w-full bg-amber-200 font-bold text-slate-950 border border-amber-300 rounded px-1.5 py-1 focus:outline-none text-xs cursor-pointer"
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
                      <SeamlessCellInput
                        type="number"
                        disabled={isReadOnly}
                        value={row.plafon || 0}
                        onChange={(val) => handleCellChange(idx, "plafon", val)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-right font-mono text-emerald-400 font-bold focus:outline-none focus:border-rose-500 text-xs"
                      />
                    </td>

                    {/* Input NETT BOOKING */}
                    <td className="p-1 border-r border-slate-800">
                      <SeamlessCellInput
                        type="number"
                        disabled={isReadOnly}
                        value={row.nett_booking || 0}
                        onChange={(val) => handleCellChange(idx, "nett_booking", val)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-right font-mono text-blue-400 font-bold focus:outline-none focus:border-rose-500 text-xs"
                      />
                    </td>

                    {/* Input TGL CAIR */}
                    <td className="p-1 border-r border-slate-800">
                      <SeamlessCellInput
                        disabled={isReadOnly}
                        value={row.tgl_cair || ""}
                        onChange={(val) => handleCellChange(idx, "tgl_cair", val)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1 font-mono text-slate-300 focus:outline-none text-[11px]"
                      />
                    </td>

                    {/* Input PERIODE BULAN */}
                    <td className="p-1 border-r border-slate-800">
                      <SeamlessCellInput
                        disabled={isReadOnly}
                        value={row.periode_bulan || ""}
                        onChange={(val) => handleCellChange(idx, "periode_bulan", val)}
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
                      <SeamlessCellInput
                        disabled={isReadOnly}
                        value={row.keterangan || ""}
                        onChange={(val) => handleCellChange(idx, "keterangan", val)}
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