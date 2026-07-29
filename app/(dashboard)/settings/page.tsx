"use client";

import React, { useEffect, useState, useCallback } from "react";
import { PrayerWidget } from "@/components/dashboard/PrayerWidget";

interface UnitData {
  id: string;
  kc_name: string;
  kcp_name: string;
  sentra_mikro: string;
  muh_name: string;
  muh_status: "Tetap" | "Backup";
  analis_mikro: string;
  username?: string;
  password?: string;
}

export default function SettingsPage() {
  const [appName, setAppName] = useState<string>("Bank Daily Report");
  const [units, setUnits] = useState<UnitData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [savingBankName, setSavingBankName] = useState<boolean>(false);
  const [savedNameSuccess, setSavedNameSuccess] = useState<boolean>(false);

  // State Form Kredensial & KCP Head Area
  const [headName, setHeadName] = useState<string>("Manong (Head Area)");
  const [headEmail, setHeadEmail] = useState<string>("manong@k2c.com");
  const [headPassword, setHeadPassword] = useState<string>("12345678");
  const [headKcpUnit, setHeadKcpUnit] = useState<string>("KCP Walikota (Sentra Mikro Jkt Timur)");
  const [savingHead, setSavingHead] = useState<boolean>(false);
  const [savedHeadSuccess, setSavedHeadSuccess] = useState<boolean>(false);

  // Form Modal Edit / Add Unit
  const [showModal, setShowModal] = useState<boolean>(false);
  const [savingUnit, setSavingUnit] = useState<boolean>(false);
  const [formData, setFormData] = useState<Partial<UnitData>>({
    kc_name: "Walikota Jakarta Timur",
    kcp_name: "",
    sentra_mikro: "",
    muh_name: "",
    muh_status: "Tetap",
    analis_mikro: "",
    username: "",
    password: "",
  });

  // Fetch Master Units
  const fetchUnits = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/units");
      const result = await res.json();
      if (res.ok && Array.isArray(result.data)) {
        setUnits(result.data);
      }
    } catch (err) {
      console.error("Failed fetching units:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Load App Bank Name
    const savedName = localStorage.getItem("APP_BANK_NAME");
    if (savedName) setAppName(savedName);

    // Load Head Profile dari LocalStorage / Sesi
    const savedHeadProfile = localStorage.getItem("HEAD_PROFILE");
    if (savedHeadProfile) {
      try {
        const parsed = JSON.parse(savedHeadProfile);
        if (parsed.username) setHeadName(parsed.username);
        if (parsed.email) setHeadEmail(parsed.email);
        if (parsed.password) setHeadPassword(parsed.password);
        if (parsed.kcp_unit) setHeadKcpUnit(parsed.kcp_unit);
      } catch (e) {}
    } else {
      const appUser = localStorage.getItem("app_user");
      if (appUser) {
        try {
          const parsedUser = JSON.parse(appUser);
          if (parsedUser.role === "HEAD_AREA") {
            if (parsedUser.username) setHeadName(parsedUser.username);
            if (parsedUser.email) setHeadEmail(parsedUser.email);
            if (parsedUser.unit_name) setHeadKcpUnit(parsedUser.unit_name);
          }
        } catch (e) {}
      }
    }

    fetchUnits();
  }, [fetchUnits]);

  // Handle Save App Bank Name
  const handleSaveBankName = (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBankName(true);
    localStorage.setItem("APP_BANK_NAME", appName);
    setTimeout(() => {
      setSavingBankName(false);
      setSavedNameSuccess(true);
      setTimeout(() => setSavedNameSuccess(false), 2500);
      window.location.reload();
    }, 500);
  };

  // Handle Save Kredensial & Profil Head Area (Termasuk KCP Unit)
  const handleSaveHeadProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setSavingHead(true);

    const updatedHeadProfile = {
      username: headName,
      email: headEmail.toLowerCase().trim(),
      password: headPassword.trim(),
      unit_name: headKcpUnit,
      sentra_mikro: "Sentra Mikro Jkt Timur",
      role: "HEAD_AREA",
    };

    // Simpan ke storage local profil head
    localStorage.setItem("HEAD_PROFILE", JSON.stringify(updatedHeadProfile));

    // Perbarui sesi aktif saat ini
    const currentSession = localStorage.getItem("app_user");
    if (currentSession) {
      try {
        const parsedSession = JSON.parse(currentSession);
        if (parsedSession.role === "HEAD_AREA") {
          const newSession = {
            ...parsedSession,
            username: headName,
            email: headEmail.toLowerCase().trim(),
            unit_name: headKcpUnit,
          };
          localStorage.setItem("app_user", JSON.stringify(newSession));
        }
      } catch (e) {}
    } else {
      // Buat sesi baru jika belum ada
      const defaultSession = {
        id: "head-custom-id",
        email: headEmail.toLowerCase().trim(),
        username: headName,
        role: "HEAD_AREA",
        unit_name: headKcpUnit,
        sentra_mikro: "Sentra Mikro Jkt Timur",
      };
      localStorage.setItem("app_user", JSON.stringify(defaultSession));
    }

    setTimeout(() => {
      setSavingHead(false);
      setSavedHeadSuccess(true);
      setTimeout(() => setSavedHeadSuccess(false), 2500);
      window.location.reload();
    }, 600);
  };

  // Handle Save / Update Unit + User Account
  const handleSaveUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.kcp_name || !formData.sentra_mikro || !formData.muh_name || !formData.analis_mikro) {
      alert("Semua field unit wajib diisi.");
      return;
    }

    if (!formData.id && (!formData.username || !formData.password)) {
      alert("Username (Email) dan Password wajib diisi untuk pendaftaran unit baru.");
      return;
    }

    setSavingUnit(true);
    try {
      const res = await fetch("/api/units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        await fetchUnits();
        setShowModal(false);
        setFormData({
          kc_name: "Walikota Jakarta Timur",
          kcp_name: "",
          sentra_mikro: "",
          muh_name: "",
          muh_status: "Tetap",
          analis_mikro: "",
          username: "",
          password: "",
        });
        alert("✓ Unit baru & Akun Login Supabase berhasil didaftarkan!");
      } else {
        alert(`Gagal menyimpan data unit: ${result.error || "Pemeriksaan Supabase Database gagal."}`);
      }
    } catch (err: any) {
      alert(`Terjadi kesalahan jaringan: ${err?.message || "Internal Error"}`);
    } finally {
      setSavingUnit(false);
    }
  };

  // Handle Delete Unit
  const handleDeleteUnit = async (id: string, name: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus unit ${name}?`)) return;

    try {
      const res = await fetch(`/api/units?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        await fetchUnits();
      } else {
        alert("Gagal menghapus unit.");
      }
    } catch (err) {
      alert("Terjadi kesalahan jaringan.");
    }
  };

  const handleEditUnit = (unit: UnitData) => {
    setFormData(unit);
    setShowModal(true);
  };

  return (
    <div className="w-full space-y-6 pb-8">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2 text-xs font-mono text-amber-400 mb-1">
          <span>SYSTEM CONFIGURATION</span> • <span>GLOBAL SETTINGS</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-100">
          Pengaturan Sistem & Manajemen Unit
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Kelola nama bank/instansi header, profil & kredensial login Head Area, pendaftaran unit kerja baru, serta pantauan waktu operasional.
        </p>
      </div>

      {/* Top Grid: Bank Name Form, Head Profile Form, & Prayer Clock Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CARD 1: Form Ubah Nama Bank */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl backdrop-blur flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2 mb-1">
              <span>🏛️</span> Ubah Nama Bank / Instansi
            </h2>
            <p className="text-[11px] text-slate-400 mb-4">
              Nama ini akan ditampilkan pada bagian kiri atas header navigasi portal secara terpusat.
            </p>

            <form onSubmit={handleSaveBankName} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nama Bank / Judul Portal *</label>
                <input
                  type="text"
                  required
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  placeholder="Contoh: Bank DKI Daily Report / Bank Daily Report"
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-slate-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                {savedNameSuccess && (
                  <span className="text-emerald-400 font-medium text-xs">✓ Nama Bank Berhasil Diperbarui</span>
                )}
                <button
                  type="submit"
                  disabled={savingBankName}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg shadow-md transition-all cursor-pointer ml-auto"
                >
                  {savingBankName ? "Menyimpan..." : "Simpan Nama Bank"}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* CARD 2: Form Ubah Profil, KCP, & Login Head Area */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl backdrop-blur flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2 mb-1">
              <span>👨‍💼</span> Ubah Profil, KCP & Login Head
            </h2>
            <p className="text-[11px] text-slate-400 mb-2.5">
              Ubah nama, info KCP/Unit Area, serta email dan password login Head.
            </p>

            <form onSubmit={handleSaveHeadProfile} className="space-y-2 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-0.5">Nama Tampilan Head *</label>
                <input
                  type="text"
                  required
                  value={headName}
                  onChange={(e) => setHeadName(e.target.value)}
                  placeholder="Contoh: ACHMAD AKBAR (Head Area)"
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 p-1.5 text-slate-100 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-0.5">Info KCP / Unit Area Head *</label>
                <input
                  type="text"
                  required
                  value={headKcpUnit}
                  onChange={(e) => setHeadKcpUnit(e.target.value)}
                  placeholder="KCP Walikota (Sentra Mikro Jkt Timur)"
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 p-1.5 text-slate-100 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-0.5">Email Perbankan Login Head *</label>
                <input
                  type="email"
                  required
                  value={headEmail}
                  onChange={(e) => setHeadEmail(e.target.value)}
                  placeholder="bebeng@k2c.com"
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 p-1.5 text-slate-100 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-0.5">Password Baru Login *</label>
                <input
                  type="text"
                  required
                  value={headPassword}
                  onChange={(e) => setHeadPassword(e.target.value)}
                  placeholder="1234"
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 p-1.5 text-slate-100 focus:border-indigo-500 focus:outline-none font-mono"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                {savedHeadSuccess && (
                  <span className="text-emerald-400 font-medium text-[11px]">✓ Profil Head Diperbarui</span>
                )}
                <button
                  type="submit"
                  disabled={savingHead}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg shadow-md transition-all cursor-pointer ml-auto text-xs"
                >
                  {savingHead ? "Menyimpan..." : "Simpan Profil Head"}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* CARD 3: Widget Jam & Jadwal Sholat */}
        <PrayerWidget />
      </div>

      {/* Section Manajemen Data Unit */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-3 mb-4 gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <span>🏢</span> Manajemen Data Unit Kerja & Akun Access Login
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Tambah unit baru, set akun email & password login, atau kelola unit kerja terdaftar.
            </p>
          </div>
          <button
            onClick={() => {
              setFormData({
                kc_name: "Walikota Jakarta Timur",
                kcp_name: "",
                sentra_mikro: "",
                muh_name: "",
                muh_status: "Tetap",
                analis_mikro: "",
                username: "",
                password: "",
              });
              setShowModal(true);
            }}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg shadow-md cursor-pointer self-start sm:self-auto flex items-center gap-1.5"
          >
            <span>+</span> Tambah Data Unit Baru
          </button>
        </div>

        {/* Modal Form Unit */}
        {showModal && (
          <form onSubmit={handleSaveUnit} className="bg-slate-950 p-4 rounded-xl border border-slate-800 mb-5 space-y-3 text-xs shadow-2xl">
            <h3 className="font-bold text-slate-200 text-xs border-b border-slate-800 pb-2 flex items-center justify-between">
              <span>{formData.id ? "✏️ Edit Data Unit" : "➕ Pendaftaran Unit Kerja Baru & Akun Login"}</span>
              <button type="button" onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </h3>

            {/* BARIS 1: CREDENTIALS AKUN LOGIN (WAKTU UNIT BARU) */}
            {!formData.id && (
              <div className="p-3 bg-indigo-950/40 border border-indigo-800/60 rounded-lg space-y-2">
                <span className="text-[11px] font-bold text-indigo-300 block uppercase">🔐 Kredensial Login Akun Unit Baru:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 mb-1">Username (Email Unit) *</label>
                    <input
                      type="email"
                      required={!formData.id}
                      value={formData.username || ""}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      placeholder="contoh: unit.cikarang@bank.com"
                      className="w-full rounded bg-slate-900 border border-slate-800 p-2 text-slate-100 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1">Password Akses *</label>
                    <input
                      type="text"
                      required={!formData.id}
                      value={formData.password || ""}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Masukkan kata sandi bebas..."
                      className="w-full rounded bg-slate-900 border border-slate-800 p-2 text-slate-100 focus:border-indigo-500 focus:outline-none font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* BARIS 2: DETAIL UNIT KERJA */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Cabang Unit (KCP / Unit) *</label>
                <input
                  type="text"
                  required
                  value={formData.kcp_name}
                  onChange={(e) => setFormData({ ...formData, kcp_name: e.target.value })}
                  placeholder="KCP Walikota / Cikarang..."
                  className="w-full rounded bg-slate-900 border border-slate-800 p-2 text-slate-100"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Sentra Mikro *</label>
                <input
                  type="text"
                  required
                  value={formData.sentra_mikro}
                  onChange={(e) => setFormData({ ...formData, sentra_mikro: e.target.value })}
                  placeholder="Sentra Mikro Jkt Timur..."
                  className="w-full rounded bg-slate-900 border border-slate-800 p-2 text-slate-100"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Nama UNIT *</label>
                <input
                  type="text"
                  required
                  value={formData.muh_name}
                  onChange={(e) => setFormData({ ...formData, muh_name: e.target.value })}
                  placeholder="Nama Budi Santoso..."
                  className="w-full rounded bg-slate-900 border border-slate-800 p-2 text-slate-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Status UNIT</label>
                <select
                  value={formData.muh_status}
                  onChange={(e) => setFormData({ ...formData, muh_status: e.target.value as any })}
                  className="w-full rounded bg-slate-900 border border-slate-800 p-2 text-slate-100"
                >
                  <option value="Tetap">Tetap</option>
                  <option value="Backup">Backup</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Nama Analis Mikro *</label>
                <input
                  type="text"
                  required
                  value={formData.analis_mikro}
                  onChange={(e) => setFormData({ ...formData, analis_mikro: e.target.value })}
                  placeholder="Ahmad Dahlan..."
                  className="w-full rounded bg-slate-900 border border-slate-800 p-2 text-slate-100"
                />
              </div>
              <div className="flex items-end gap-2">
                <button
                  type="submit"
                  disabled={savingUnit}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-500 font-bold text-white rounded transition-colors cursor-pointer"
                >
                  {savingUnit ? "Menyimpan..." : "Simpan & Daftarkan Unit"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded transition-colors cursor-pointer"
                >
                  Batal
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Tabel Master Unit */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase font-mono border-b border-slate-800">
              <tr>
                <th className="px-3 py-2.5">No</th>
                <th className="px-3 py-2.5">Cabang Unit (KCP)</th>
                <th className="px-3 py-2.5">Sentra Mikro</th>
                <th className="px-3 py-2.5">UNIT</th>
                <th className="px-3 py-2.5">Status UNIT</th>
                <th className="px-3 py-2.5">Analis Mikro</th>
                <th className="px-3 py-2.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-6 text-slate-500">Memuat data unit kerja...</td>
                </tr>
              ) : units.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-6 text-slate-500">Belum ada unit terdaftar.</td>
                </tr>
              ) : (
                units.map((u, idx) => (
                  <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-3 py-2.5 font-mono text-slate-500">{idx + 1}</td>
                    <td className="px-3 py-2.5 font-bold text-slate-100">{u.kcp_name}</td>
                    <td className="px-3 py-2.5 text-slate-400">{u.sentra_mikro}</td>
                    <td className="px-3 py-2.5 font-medium text-slate-200">{u.muh_name}</td>
                    <td className="px-3 py-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${u.muh_status === "Tetap" ? "bg-blue-950 text-blue-400 border border-blue-800" : "bg-amber-950 text-amber-400 border border-amber-800"}`}>
                        {u.muh_status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-slate-300">{u.analis_mikro}</td>
                    <td className="px-3 py-2.5 text-right space-x-1">
                      <button
                        onClick={() => handleEditUnit(u)}
                        className="px-2 py-1 text-[11px] bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 rounded cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteUnit(u.id, u.kcp_name)}
                        className="px-2 py-1 text-[11px] bg-rose-950 border border-rose-800 hover:bg-rose-900 text-rose-300 rounded cursor-pointer"
                      >
                        Hapus
                      </button>
                    </td>
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