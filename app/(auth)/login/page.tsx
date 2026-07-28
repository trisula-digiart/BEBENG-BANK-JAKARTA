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
      // LANGKAH 1: CEK LOGIN LANGSUNG KE TABEL public.app_users (AKUN MANAJEMEN UNIT)
      // =========================================================================
      const { data: customUser, error: customError } = await supabase
        .from("app_users")
        .select("*")
        .eq("username", cleanEmail)
        .eq("password", cleanPassword)
        .maybeSingle();

      if (customUser) {
        // LOGIN BERHASIL VIA APP_USERS!
        const userSession = {
          id: customUser.id,
          email: customUser.username,
          username: customUser.username?.split("@")[0] || "Unit User",
          role: customUser.role || "UNIT",
          unit_name: customUser.unit_name || "Unit Kerja",
          sentra_mikro: customUser.sentra_mikro || "Sentra Mikro",
        };

        localStorage.setItem("app_user", JSON.stringify(userSession));

        // Redirect Berdasarkan Role
        if (customUser.role === "HEAD_AREA") {
          router.push("/head-area");
        } else {
          router.push("/unit-execution");
        }
        router.refresh();
        return;
      }

      // =========================================================================
      // LANGKAH 2: FALLBACK CEK KE SUPABASE AUTH NATIVE (UNTUK AKUN BAWAAN OLD)
      // =========================================================================
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPassword,
        });

      if (!authError && authData?.user) {
        // Fetch Profile dari Tabel profiles jika ada
        const { data: profile } = await supabase
          .from("profiles")
          .select("*, units(*)")
          .eq("id", authData.user.id)
          .maybeSingle();

        const userRole = profile?.role || (cleanEmail.includes("head") || cleanEmail.includes("manong") ? "HEAD_AREA" : "UNIT");

        const userSession = {
          id: authData.user.id,
          email: authData.user.email,
          username: profile?.username || profile?.full_name || authData.user.email?.split("@")[0] || "User",
          role: userRole,
          unit_name: profile?.units?.kcp_name || profile?.unit_name || "KCP Walikota",
          sentra_mikro: profile?.units?.sentra_mikro || "Sentra Mikro Jkt Timur",
        };

        localStorage.setItem("app_user", JSON.stringify(userSession));

        if (userRole === "HEAD_AREA") {
          router.push("/head-area");
        } else {
          router.push("/unit-execution");
        }
        router.refresh();
        return;
      }

      // Jika keduanya gagal
      throw new Error("Email/Username atau Password yang Anda masukkan salah.");
    } catch (err: any) {
      console.error("Login Handler Exception:", err);
      setErrorMsg(err?.message || "Kredensial login tidak ditemukan. Periksa email dan password.");
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
          Protected by Enterprise Supabase Row Level Security
        </div>
      </div>
    </div>
  );
}