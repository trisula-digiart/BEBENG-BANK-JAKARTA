"use client";

import React, { useEffect, useState, useCallback } from "react";

interface PipelineItem {
  id?: string;
  unit_id: string;
  nama_nasabah: string;
  segmen: "Mikro" | "Retail" | "Komersial" | "Consumer";
  potensi_plafond: number;
  status_funnel: "Prospek" | "Inisiasi" | "Analisis" | "Putusan" | "Pencairan" | "Batal";
  catatan: string;
  created_at?: string;
}

interface PipelineManagerProps {
  unitId: string;
}

export function PipelineManager({ unitId }: PipelineManagerProps) {
  const [pipelines, setPipelines] = useState<PipelineItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [showForm, setShowForm] = useState<boolean>(false);

  // Form State
  const [formData, setFormData] = useState<Partial<PipelineItem>>({
    nama_nasabah: "",
    segmen: "Mikro",
    potensi_plafond: 0,
    status_funnel: "Prospek",
    catatan: "",
  });

  const fetchPipelines = useCallback(async () => {
    if (!unitId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/unit-pipelines?unit_id=${unitId}`);
      const result = await res.json();
      if (res.ok && result.data) {
        setPipelines(result.data);
      }
    } catch (err) {
      console.error("Failed fetching pipelines:", err);
    } finally {
      setLoading(false);
    }
  }, [unitId]);

  useEffect(() => {
    fetchPipelines();
  }, [fetchPipelines]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama_nasabah) {
      alert("Nama calon nasabah wajib diisi.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/unit-pipelines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unit_id: unitId,
          ...formData,
        }),
      });

      if (res.ok) {
        await fetchPipelines();
        setFormData({ nama_nasabah: "", segmen: "Mikro", potensi_plafond: 0, status_funnel: "Prospek", catatan: "" });
        setShowForm(false);
      } else {
        alert("Gagal menyimpan data pipeline.");
      }
    } catch (err) {
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setSaving(false);
    }
  };

  const formatRupiah = (val: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Pencairan": return "bg-emerald-950 text-emerald-400 border-emerald-800";
      case "Putusan": return "bg-blue-950 text-blue-400 border-blue-800";
      case "Analisis": return "bg-amber-950 text-amber-400 border-amber-800";
      case "Inisiasi": return "bg-purple-950 text-purple-400 border-purple-800";
      case "Batal": return "bg-rose-950 text-rose-400 border-rose-800";
      default: return "bg-slate-800 text-slate-300 border-slate-700";
    }
  };

  const totalPotensi = pipelines.reduce((acc, curr) => acc + (Number(curr.potensi_plafond) || 0), 0);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl backdrop-blur">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-3 mb-4 gap-2">
        <div>
          <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <span className="text-emerald-500">📈</span> Digital Pipeline & Prospek Nasabah
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Lacak calon debitur potensial dan potensi plafond prospek unit. Total Potensi: <strong className="text-emerald-400">{formatRupiah(totalPotensi)}</strong>
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors cursor-pointer self-start sm:self-auto"
        >
          {showForm ? "Tutup Form" : "+ Input Prospek Baru"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-slate-950 p-4 rounded-xl border border-slate-800 mb-5 space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">Nama Calon Nasabah *</label>
              <input
                type="text"
                required
                value={formData.nama_nasabah}
                onChange={(e) => setFormData({ ...formData, nama_nasabah: e.target.value })}
                placeholder="PT / Bapak / Ibu..."
                className="w-full rounded bg-slate-900 border border-slate-800 p-2 text-slate-100"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Segmen Usaha</label>
              <select
                value={formData.segmen}
                onChange={(e) => setFormData({ ...formData, segmen: e.target.value as any })}
                className="w-full rounded bg-slate-900 border border-slate-800 p-2 text-slate-100"
              >
                <option value="Mikro">Mikro</option>
                <option value="Retail">Retail</option>
                <option value="Komersial">Komersial</option>
                <option value="Consumer">Consumer</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Potensi Plafond (IDR)</label>
              <input
                type="number"
                value={formData.potensi_plafond}
                onChange={(e) => setFormData({ ...formData, potensi_plafond: Number(e.target.value) })}
                className="w-full rounded bg-slate-900 border border-slate-800 p-2 text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">Tahap Funnel</label>
              <select
                value={formData.status_funnel}
                onChange={(e) => setFormData({ ...formData, status_funnel: e.target.value as any })}
                className="w-full rounded bg-slate-900 border border-slate-800 p-2 text-slate-100"
              >
                <option value="Prospek">1. Prospek / Lead</option>
                <option value="Inisiasi">2. Inisiasi Berkas</option>
                <option value="Analisis">3. Usulan & Analisis</option>
                <option value="Putusan">4. Komite Putusan</option>
                <option value="Pencairan">5. Siap Cair</option>
                <option value="Batal">Batal / Unqualified</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-slate-400 mb-1">Catatan Tindak Lanjut</label>
              <input
                type="text"
                value={formData.catatan}
                onChange={(e) => setFormData({ ...formData, catatan: e.target.value })}
                placeholder="Rencana visit / kelengkapan dokumen..."
                className="w-full rounded bg-slate-900 border border-slate-800 p-2 text-slate-100"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 font-semibold text-white rounded-lg transition-colors cursor-pointer"
          >
            {saving ? "Menyimpan Data..." : "Simpan Prospek Pipeline"}
          </button>
        </form>
      )}

      {/* Table List Pipeline */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950 text-slate-400 uppercase font-mono border-b border-slate-800">
            <tr>
              <th className="px-3 py-2.5">Calon Nasabah</th>
              <th className="px-3 py-2.5">Segmen</th>
              <th className="px-3 py-2.5">Potensi Plafond</th>
              <th className="px-3 py-2.5">Tahap Funnel</th>
              <th className="px-3 py-2.5">Catatan / Progress</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center py-6 text-slate-500">Memuat pipeline unit...</td>
              </tr>
            ) : pipelines.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-6 text-slate-500">Belum ada pipeline terdaftar. Klik "+ Input Prospek Baru" di atas.</td>
              </tr>
            ) : (
              pipelines.map((item) => (
                <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-3 py-2.5 font-semibold text-slate-100">{item.nama_nasabah}</td>
                  <td className="px-3 py-2.5 text-slate-400">{item.segmen}</td>
                  <td className="px-3 py-2.5 font-mono text-emerald-400">{formatRupiah(item.potensi_plafond)}</td>
                  <td className="px-3 py-2.5">
                    <span className={`px-2 py-0.5 rounded border text-[10px] font-mono font-semibold ${getStatusBadge(item.status_funnel)}`}>
                      {item.status_funnel}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-slate-400 truncate max-w-xs">{item.catatan || "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}