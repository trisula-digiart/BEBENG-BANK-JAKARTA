"use client";

import React, { useEffect, useState, useCallback } from "react";
import { getTodayDateString } from "@/lib/utils";

interface DailyOperationFormProps {
  unitId: string;
}

export function DailyOperationForm({ unitId }: DailyOperationFormProps) {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [ringkasan, setRingkasan] = useState<string>("");
  const [kendala, setKendala] = useState<string>("");
  const [tindakLanjut, setTindakLanjut] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const fetchDailyOp = useCallback(async () => {
    if (!unitId) return;
    setLoading(true);
    setSavedSuccess(false);
    try {
      const res = await fetch(`/api/unit-operations?unit_id=${unitId}&date=${selectedDate}`);
      const result = await res.json();
      if (res.ok && result.data) {
        setRingkasan(result.data.ringkasan_kegiatan || "");
        setKendala(result.data.kendala_lapangan || "");
        setTindakLanjut(result.data.tindak_lanjut || "");
      } else {
        setRingkasan("");
        setKendala("");
        setTindakLanjut("");
      }
    } catch (err) {
      console.error("Failed fetching daily operation report:", err);
    } finally {
      setLoading(false);
    }
  }, [unitId, selectedDate]);

  useEffect(() => {
    fetchDailyOp();
  }, [fetchDailyOp]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ringkasan.trim()) {
      alert("Ringkasan kegiatan operasional wajib diisi.");
      return;
    }

    setSaving(true);
    setSavedSuccess(false);
    try {
      const res = await fetch("/api/unit-operations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unit_id: unitId,
          report_date: selectedDate,
          ringkasan_kegiatan: ringkasan,
          kendala_lapangan: kendala,
          tindak_lanjut: tindakLanjut,
        }),
      });

      if (res.ok) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      } else {
        alert("Gagal menyimpan laporan operasional.");
      }
    } catch (err) {
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl backdrop-blur">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
        <div>
          <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <span className="text-amber-500">📝</span> Input Laporan Harian Operasional Unit
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Laporan ringkasan kegiatan dan isu lapangan yang terhubung langsung ke Area Head.
          </p>
        </div>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-1 text-xs text-slate-200 focus:outline-none"
        />
      </div>

      {loading ? (
        <div className="text-xs text-slate-500 py-6 text-center animate-pulse">Memuat laporan operasional tanggal ini...</div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-300 mb-1">
              1. Ringkasan Kegiatan Operasional & Layanan Hari Ini *
            </label>
            <textarea
              required
              rows={3}
              value={ringkasan}
              onChange={(e) => setRingkasan(e.target.value)}
              placeholder="Contoh: Pencairan 2 debitur mikro total Rp 150jt, kanvasing pasar daerah..."
              className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-slate-100 placeholder-slate-600 focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                2. Kendala Lapangan / Isu Kritis (Jika Ada)
              </label>
              <textarea
                rows={3}
                value={kendala}
                onChange={(e) => setKendala(e.target.value)}
                placeholder="Contoh: Gangguan jaringan core banking 1 jam, pencetakan kartu..."
                className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-slate-100 placeholder-slate-600 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                3. Rencana Tindak Lanjut Unit
              </label>
              <textarea
                rows={3}
                value={tindakLanjut}
                onChange={(e) => setTindakLanjut(e.target.value)}
                placeholder="Contoh: Kunjungan ulang calon nasabah esok pagi..."
                className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-slate-100 placeholder-slate-600 focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              {savedSuccess && <span className="text-emerald-400 font-medium">✓ Laporan operasional berhasil dikirim ke Area Head</span>}
            </div>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-500 font-bold text-white rounded-lg transition-colors cursor-pointer shadow-md shadow-amber-600/20"
            >
              {saving ? "Mengirim Laporan..." : "Kirim Laporan Operasional"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}