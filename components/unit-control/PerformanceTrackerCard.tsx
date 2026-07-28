"use client";

import React, { useEffect, useState, useCallback } from "react";

interface PerformanceData {
  unit_id: string;
  period_month: string;
  target_kredit: number;
  realisasi_kredit: number;
  target_funding: number;
  realisasi_funding: number;
  npl_percentage: number;
}

interface PerformanceTrackerCardProps {
  unitId: string;
}

export function PerformanceTrackerCard({ unitId }: PerformanceTrackerCardProps) {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  // Form Edit State
  const [formData, setFormData] = useState({
    target_kredit: 0,
    realisasi_kredit: 0,
    target_funding: 0,
    realisasi_funding: 0,
    npl_percentage: 0,
  });

  const fetchPerformance = useCallback(async () => {
    if (!unitId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/unit-performance?unit_id=${unitId}`);
      const result = await res.json();
      if (res.ok && result.data) {
        setData(result.data);
        setFormData({
          target_kredit: result.data.target_kredit || 0,
          realisasi_kredit: result.data.realisasi_kredit || 0,
          target_funding: result.data.target_funding || 0,
          realisasi_funding: result.data.realisasi_funding || 0,
          npl_percentage: result.data.npl_percentage || 0,
        });
      }
    } catch (err) {
      console.error("Failed to load performance data:", err);
    } finally {
      setLoading(false);
    }
  }, [unitId]);

  useEffect(() => {
    fetchPerformance();
  }, [fetchPerformance]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const period = new Date().toISOString().slice(0, 7);
      const res = await fetch("/api/unit-performance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unit_id: unitId,
          period_month: period,
          ...formData,
        }),
      });

      if (res.ok) {
        await fetchPerformance();
        setIsEditing(false);
      } else {
        alert("Gagal memperbarui target performance.");
      }
    } catch (err) {
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setSaving(false);
    }
  };

  const formatRupiah = (val: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);

  const kreditAch = data?.target_kredit ? Math.min(Math.round((data.realisasi_kredit / data.target_kredit) * 100), 100) : 0;
  const fundingAch = data?.target_funding ? Math.min(Math.round((data.realisasi_funding / data.target_funding) * 100), 100) : 0;

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-slate-400 text-xs animate-pulse">
        Memuat pantauan kinerja internal unit...
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl backdrop-blur">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
        <div>
          <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <span className="text-blue-500">📊</span> Pantauan Kinerja Internal Unit (Performance Tracker)
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Evaluasi mandiri realisasi Kredit, Funding, dan NPL bulan ini.
          </p>
        </div>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
        >
          {isEditing ? "Batal" : "✏️ Update Target & Realisasi"}
        </button>
      </div>

      {isEditing ? (
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">Target Kredit (IDR)</label>
              <input
                type="number"
                value={formData.target_kredit}
                onChange={(e) => setFormData({ ...formData, target_kredit: Number(e.target.value) })}
                className="w-full rounded bg-slate-950 border border-slate-800 p-2 text-slate-100"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Realisasi Kredit (IDR)</label>
              <input
                type="number"
                value={formData.realisasi_kredit}
                onChange={(e) => setFormData({ ...formData, realisasi_kredit: Number(e.target.value) })}
                className="w-full rounded bg-slate-950 border border-slate-800 p-2 text-slate-100"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Target Funding (IDR)</label>
              <input
                type="number"
                value={formData.target_funding}
                onChange={(e) => setFormData({ ...formData, target_funding: Number(e.target.value) })}
                className="w-full rounded bg-slate-950 border border-slate-800 p-2 text-slate-100"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Realisasi Funding (IDR)</label>
              <input
                type="number"
                value={formData.realisasi_funding}
                onChange={(e) => setFormData({ ...formData, realisasi_funding: Number(e.target.value) })}
                className="w-full rounded bg-slate-950 border border-slate-800 p-2 text-slate-100"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-slate-400 mb-1">Tingkat NPL Unit (%)</label>
              <input
                type="number"
                step="0.01"
                value={formData.npl_percentage}
                onChange={(e) => setFormData({ ...formData, npl_percentage: Number(e.target.value) })}
                className="w-full rounded bg-slate-950 border border-slate-800 p-2 text-slate-100"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full py-2 bg-blue-600 hover:bg-blue-500 font-semibold text-white rounded-lg transition-colors cursor-pointer"
          >
            {saving ? "Menyimpan Data..." : "Simpan Perubahan Performance"}
          </button>
        </form>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Kredit Card */}
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
            <div className="text-xs text-slate-400 font-medium">Realisasi Kredit</div>
            <div className="text-base font-bold text-slate-100 mt-1">
              {formatRupiah(data?.realisasi_kredit || 0)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Target: {formatRupiah(data?.target_kredit || 0)}
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
              <div className="bg-blue-500 h-2 rounded-full transition-all duration-500" style={{ width: `${kreditAch}%` }} />
            </div>
            <div className="text-[10px] text-blue-400 font-semibold text-right mt-1">{kreditAch}% Achieved</div>
          </div>

          {/* Funding Card */}
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
            <div className="text-xs text-slate-400 font-medium">Realisasi Funding</div>
            <div className="text-base font-bold text-slate-100 mt-1">
              {formatRupiah(data?.realisasi_funding || 0)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Target: {formatRupiah(data?.target_funding || 0)}
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
              <div className="bg-emerald-500 h-2 rounded-full transition-all duration-500" style={{ width: `${fundingAch}%` }} />
            </div>
            <div className="text-[10px] text-emerald-400 font-semibold text-right mt-1">{fundingAch}% Achieved</div>
          </div>

          {/* NPL Card */}
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
            <div className="text-xs text-slate-400 font-medium">Kualitas Kredit (NPL Unit)</div>
            <div className={`text-2xl font-black mt-1 ${Number(data?.npl_percentage || 0) <= 2.0 ? "text-emerald-400" : "text-rose-400"}`}>
              {data?.npl_percentage || 0}%
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {Number(data?.npl_percentage || 0) <= 2.0 ? "🟢 Kategori Sehat (Toleransi < 2.5%)" : "⚠️ Perlu Penanganan Khusus"}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}