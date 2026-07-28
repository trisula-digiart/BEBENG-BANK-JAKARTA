"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const cleanEmail = email.toLowerCase().trim();
    const cleanPassword = password.trim();

    try {
      const supabase = createBrowserClient();

      // =========================================================================
      // 1. DIRECT QUERY KE TABEL public.app_users (TANPA MENYENTUH GOTRUE AUTH API)
      // =========================================================================
      const { data: appUser, error: appUserError } = await supabase
        .from("app_users")
        .select("*")
        .eq("username", cleanEmail)
        .eq("password", cleanPassword)
        .maybeSingle();

      if (appUserError) {
        console.error("Query app_users error:", appUserError);
      }

      if (appUser) {
        // SET USER SESSION KE LOCALSTORAGE
        const userSession = {
          id: appUser.id,
          email: appUser.username,
          username: appUser.username?.split("@")[0] || "Unit User",
          role: appUser.role || "UNIT",
          unit_name: appUser.unit_name || "Unit Kerja",
          sentra_mikro: appUser.sentra_mikro || "Sentra Mikro",
        };

        localStorage.setItem("app_user", JSON.stringify(userSession));

        // REDIRECT BERDASARKAN ROLE
        if (appUser.role === "HEAD_AREA") {
          router.push("/head-area");
        } else {
          router.push("/unit-execution");
        }
        router.refresh();
        return;
      }

      // =========================================================================
      // 2. FALLBACK CEK KE TABEL PROFILES / DUMMY CREDENTIALS
      // =========================================================================
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", cleanEmail)
        .maybeSingle();

      if (profile) {
        const userSession = {
          id: profile.id,
          email: cleanEmail,
          username: profile.username || cleanEmail.split("@")[0],
          role: profile.role || "HEAD_AREA",
          unit_name: profile.unit_name || "KCP Walikota",
          sentra_mikro: profile.sentra_mikro || "Sentra Mikro Jkt Timur",
        };

        localStorage.setItem("app_user", JSON.stringify(userSession));

        if (profile.role === "HEAD_AREA") {
          router.push("/head-area");
        } else {
          router.push("/unit-execution");
        }
        router.refresh();
        return;
      }

      // Jika tidak ditemukan di tabel mana pun
      throw new Error("Email/Username atau Password tidak cocok. Silakan periksa kembali.");
    } catch (err: any) {
      console.error("Login Exception Caught:", err);
      setErrorMsg(err?.message || "Gagal masuk ke sistem. Periksa kredensial Anda.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-950 p-4 text-slate-100">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl backdrop-blur">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white font-bold text-xl shadow-lg shadow-blue-600/30">
            BK
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-50">
            Bank Daily Reporting
          </h2>
          <p className="text-xs text-slate-400">
            Internal Portal Reporting Unit & Monitoring Area
          </p>
        </div>

        {/* Error Alert Box */}
        {errorMsg && (
          <div className="rounded-lg border border-rose-800/60 bg-rose-950/50 p-3.5 text-xs font-medium text-rose-300 leading-relaxed shadow-sm">
            <div className="flex items-start gap-2">
              <span className="text-rose-400 text-sm">⚠️</span>
              <div className="flex-1">{errorMsg}</div>
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">
              Email Perbankan
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@bank.co.id"
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-blue-500 disabled:opacity-50 cursor-pointer mt-2"
          >
            {loading ? "Memproses Masuk..." : "Masuk ke System"}
          </button>
        </form>

        <div className="text-center text-[11px] text-slate-500 pt-2 border-t border-slate-800/60">
          Protected by K2C KOMPUTINDO : The Intelligence of Logic
        </div>
      </div>
    </div>
  );
}