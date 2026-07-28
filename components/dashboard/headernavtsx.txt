"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

interface UserProfile {
  username: string;
  role: "HEAD_AREA" | "UNIT";
  unit_name?: string;
  sentra_mikro?: string;
}

export function HeaderNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [bankName, setBankName] = useState<string>("BANK EMOK");
  const [user, setUser] = useState<UserProfile | null>(null);

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
      // Default fallback jika belum login
      setUser({
        username: "Head Office",
        role: "HEAD_AREA",
      });
    }

    // Fetch Global Settings / Bank Name
    fetch("/api/reports")
      .then((res) => res.json())
      .then((data) => {
        if (data.bank_name) setBankName(data.bank_name);
      })
      .catch(() => {});
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("app_user");
    router.push("/login");
  };

  const isHeadArea = !user || user.role === "HEAD_AREA";

  return (
    <header className="w-full bg-slate-950/90 border-b border-slate-800 text-slate-100 sticky top-0 z-40 shadow-2xl backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand Logo & Title Gahar / Estetis */}
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
                {/* 1. KONSOLIDASI UNIT */}
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

                {/* 2. REKAP DATA EKSEKUSI */}
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

                {/* 3. PENGATURAN */}
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

                {/* 4. BRANGKAS DOKUMEN */}
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
                {/* 1. DATA EKSEKUSI UNIT */}
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

                {/* 2. MODUL KEPALA UNIT */}
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

        {/* User Badge & Switcher / Logout */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-slate-200">
              {user?.username || "Head Area"}{" "}
              <span className="text-slate-400 font-normal">({user?.role || "HEAD_AREA"})</span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              {user?.unit_name ? `${user.unit_name} (${user.sentra_mikro})` : "Head Office Area"}
            </div>
          </div>

          <span
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono uppercase border ${
              isHeadArea
                ? "bg-indigo-950/80 text-indigo-400 border-indigo-800"
                : "bg-emerald-950/80 text-emerald-400 border-emerald-800"
            }`}
          >
            {user?.role || "HEAD_AREA"}
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
  );
}