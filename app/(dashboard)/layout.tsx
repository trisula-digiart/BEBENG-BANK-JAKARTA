import React from "react";
import { HeaderNav } from "@/components/dashboard/HeaderNav";
import { createServerClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerClient();

  // Ambil data user yang sedang login via getUser()
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userRole: "HEAD_AREA" | "MUH" | "UNIT" = "UNIT";
  let userName = "User Perbankan";
  let unitName = "";

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select(`
        full_name,
        role,
        units:unit_id (
          kcp_name,
          sentra_mikro
        )
      `)
      .eq("id", user.id)
      .single();

    if (profile) {
      userRole = profile.role as any;
      userName = profile.full_name;
      if (profile.units) {
        const u = profile.units as any;
        unitName = `${u.kcp_name} (${u.sentra_mikro})`;
      }
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased">
      {/* Header Sticky Navigation dengan Full Width Padding */}
      <HeaderNav
        userRole={userRole}
        userName={userName}
        unitName={unitName}
      />

      {/* Main Content Area - Full-Width Responsive (Max 1920px untuk Presisi Ultra-Wide) */}
      <main className="flex-1 w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>

      {/* Global Footer Minimalis */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 text-center text-xs text-slate-600">
        Bank Daily Reporting Portal • Enterprise Monitoring & Operational System
      </footer>
    </div>
  );
}