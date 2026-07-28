"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export interface HeaderNavProps {
  userRole?: "HEAD_AREA" | "UNIT" | "MUH" | string;
  userName?: string;
  unitName?: string;
}

interface UserProfile {
  username: string;
  role: "HEAD_AREA" | "UNIT" | "MUH" | string;
  unit_name?: string;
  sentra_mikro?: string;
}

export function HeaderNav({
  userRole: initialRole,
  userName: initialName,
  unitName: initialUnit,
}: HeaderNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [bankName, setBankName] = useState<string>("BANK EMOK");
  const [user, setUser] = useState<UserProfile | null>(null);

  // State Indikator Koneksi Database
  const [dbStatus, setDbStatus] = useState<"loading" | "online" | "offline">("loading");
  const [dbErrorMessage, setDbErrorMessage] = useState<string>("");

  // Auto-Ping Health Check Database Supabase
  const checkDbConnection = useCallback(async () => {
    try {
      const res = await fetch("/api/health-check", { cache: "no-store" });
      const data = await res.json();

      if (res.ok && data.connected) {
        setDbStatus("online");
        setDbErrorMessage("");
      } else {
        setDbStatus("offline");
        setDbErrorMessage(data.error || "Gagal terhubung ke database Supabase.");
      }
    } catch (err) {
      setDbStatus("offline");
      setDbErrorMessage("Network Error: Serverless Function / Database tidak merespon.");
    }
  }, []);

  useEffect(() => {
    // Cek koneksi pertama kali
    checkDbConnection();

    // Auto Polling setiap 20 detik
    const interval = setInterval(() => {
      checkDbConnection();
    }, 20000);

    return () => clearInterval(interval);
  }, [checkDbConnection]);

  useEffect(() => {
    // Sync session user dari LocalStorage
    const savedUser = localStorage.getItem("app_user");
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error("Failed to parse user session");
      }
    } else {
      setUser({
        username: initialName || "Head Office",
        role: initialRole || "HEAD_AREA",
        unit_name: initialUnit || "Head Office Area",
      });
    }

    // Fetch Global Settings / Bank Name
    fetch("/api/reports")
      .then((res) => res.json())
      .then((data) => {
        if (data.bank_name) setBankName(data.bank_name);
      })
      .catch(() => {});
  }, [initialRole, initialName, initialUnit]);

  const handleLogout = () => {
    localStorage.removeItem("app_user");
    router.push("/login");
  };

  const activeRole = user?.role || initialRole || "HEAD_AREA";
  const activeUsername = user?.username || initialName || "Head Area";
  const activeUnitName = user?.unit_name || initialUnit || "Head Office Area";
  const isHeadArea = activeRole === "HEAD_AREA";

  return (
    <>
      {/* FLOATING WARNING ALERT BANNER JIKA DB OFFLINE */}
      {dbStatus === "offline" && (
        <div className="w-full bg-gradient-to-r from-rose-950 via-red-900 to-rose-950 border-b border-rose-600/80 px-4 py-2.5 text-center text-white text-xs font-bold shadow-2xl flex items-center justify-center gap-3 sticky top-0 z-50 animate-pulse">
          <span className="text-base">⚠️</span>
          <span>
            <strong>DATABASE SUPABASE BELUM TERKONEKSI!</strong> Data gagal disimpan / dimuat. {dbErrorMessage}
          </span>
          <button
            onClick={checkDbConnection}
            className="ml-2 px-2.5 py-1 bg-white text-rose-950 hover:bg-rose-100 font-extrabold rounded-md text-[10px] uppercase shadow-md transition-all cursor-pointer"
          >
            🔄 Cek Ulang
          </button>
        </div>
      )}

      <header className="w-full bg-slate-950/90 border-b border-slate-800 text-slate-100 sticky top-0 z-40 shadow-2xl backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-6">
            <Link href={isHeadArea ? "/head-area" : "/unit-execution"} className="flex items-center gap-3.5 group">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-600 flex items-center justify-center font-black text-white text-base shadow-lg shadow-indigo-600/40 group-hover:scale-105 group-hover:shadow-indigo-500/60 transition-all border border-indigo-400/30">
                BK
              </div>
              <div className="flex flex-col">
                <span className="font-black tracking-widest text-xl sm:text-2xl bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-indigo-300 drop-shadow-md group-hover:to-rose-400 transition-all uppercase">
                  {bankName}
                </span>
                <span className="text-[10px] font-mono tracking-wider text-slate-400 uppercase -mt-0.5">
                  Enterprise Reporting Portal
                </span>
              </div>
            </Link>

            {/* Dynamic Nav Items Based On Role */}
            <nav className="hidden md:flex items-center gap-2 text-xs font-semibold ml-4">
              {isHeadArea ? (
                <>
                  <Link
                    href="/head-area"
                    className={`px-3.5 py-2 rounded-xl transition-all ${
                      pathname === "/head-area"
                        ? "bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-600/30 border border-indigo-400/40"
                        : "text-slate-400 hover:text-slate-100 hover:bg-slate-900"
                    }`}
                  >
                    KONSOLIDASI UNIT
                  </Link>

                  <Link
                    href="/head-execution"
                    className={`px-3.5 py-2 rounded-xl transition-all ${
                      pathname === "/head-execution"
                        ? "bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-600/30 border border-indigo-400/40"
                        : "text-slate-400 hover:text-slate-100 hover:bg-slate-900"
                    }`}
                  >
                    REKAP DATA EKSEKUSI
                  </Link>

                  <Link
                    href="/settings"
                    className={`px-3.5 py-2 rounded-xl transition-all ${
                      pathname === "/settings"
                        ? "bg-amber-600 text-white font-bold shadow-lg shadow-amber-600/30 border border-amber-400/40"
                        : "text-slate-400 hover:text-slate-100 hover:bg-slate-900"
                    }`}
                  >
                    ⚙️ PENGATURAN
                  </Link>

                  <Link
                    href="/vault"
                    className={`px-3.5 py-2 rounded-xl transition-all ${
                      pathname === "/vault"
                        ? "bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-600/30 border border-indigo-400/40"
                        : "text-slate-400 hover:text-slate-100 hover:bg-slate-900"
                    }`}
                  >
                    💼 BRANGKAS DOKUMEN
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/unit-execution"
                    className={`px-3.5 py-2 rounded-xl transition-all ${
                      pathname === "/unit-execution"
                        ? "bg-rose-600 text-white font-bold shadow-lg shadow-rose-600/30 border border-rose-400/40"
                        : "text-slate-400 hover:text-slate-100 hover:bg-slate-900"
                    }`}
                  >
                    DATA EKSEKUSI
                  </Link>

                  <Link
                    href="/unit-control"
                    className={`px-3.5 py-2 rounded-xl transition-all ${
                      pathname === "/unit-control"
                        ? "bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-600/30 border border-indigo-400/40"
                        : "text-slate-400 hover:text-slate-100 hover:bg-slate-900"
                    }`}
                  >
                    MODUL KEPALA UNIT
                  </Link>
                </>
              )}
            </nav>
          </div>

          {/* User Badge, Database Connection Status & Logout */}
          <div className="flex items-center gap-3">
            {/* INDIKATOR STATUS KONEKSI DATABASE REALTIME */}
            <div
              title={
                dbStatus === "online"
                  ? "Database Supabase Terhubung"
                  : dbStatus === "offline"
                  ? dbErrorMessage
                  : "Mengecek Koneksi DB..."
              }
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono border transition-all cursor-pointer ${
                dbStatus === "online"
                  ? "bg-emerald-950/80 text-emerald-400 border-emerald-800"
                  : dbStatus === "offline"
                  ? "bg-rose-950/80 text-rose-400 border-rose-800 animate-pulse"
                  : "bg-slate-900 text-slate-400 border-slate-800"
              }`}
              onClick={checkDbConnection}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  dbStatus === "online"
                    ? "bg-emerald-400 shadow-[0_0_8px_#34d399]"
                    : dbStatus === "offline"
                    ? "bg-rose-500 shadow-[0_0_8px_#f43f5e] animate-ping"
                    : "bg-slate-500 animate-pulse"
                }`}
              ></span>
              <span>
                {dbStatus === "online"
                  ? "DB ONLINE"
                  : dbStatus === "offline"
                  ? "DB OFFLINE"
                  : "CHECKING DB..."}
              </span>
            </div>

            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-slate-200">
                {activeUsername}{" "}
                <span className="text-slate-400 font-normal">({activeRole})</span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                {user?.sentra_mikro ? `${activeUnitName} (${user.sentra_mikro})` : activeUnitName}
              </div>
            </div>

            <span
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono uppercase border ${
                isHeadArea
                  ? "bg-indigo-950/80 text-indigo-400 border-indigo-800"
                  : "bg-emerald-950/80 text-emerald-400 border-emerald-800"
              }`}
            >
              {activeRole}
            </span>

            <button
              onClick={handleLogout}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-sm"
            >
              Keluar
            </button>
          </div>
        </div>
      </header>
    </>
  );
}