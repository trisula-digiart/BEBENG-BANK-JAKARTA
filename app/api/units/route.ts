import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  return createClient(url, key);
}

// GET: Fetch Master Units
export async function GET() {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("units")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fetch units error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] }, { status: 200 });
  } catch (err: any) {
    console.error("GET units internal error:", err);
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}

// POST: Save/Insert New Unit + Auto Create Login User Credentials (BULLETPROOF VERSION)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      id,
      kc_name,
      kcp_name,
      sentra_mikro,
      muh_name,
      muh_status,
      analis_mikro,
      username,
      password,
    } = body;

    const supabase = getSupabaseClient();

    // 1. Persiapkan Payload Unit
    const unitPayload: Record<string, any> = {
      kc_name: kc_name || "Walikota Jakarta Timur",
      kcp_name: kcp_name || "-",
      sentra_mikro: sentra_mikro || "-",
      muh_name: muh_name || "-",
      muh_status: muh_status || "Tetap",
      analis_mikro: analis_mikro || "-",
      updated_at: new Date().toISOString(),
    };

    let savedUnit: any = null;

    if (id) {
      // UPDATE UNIT EXISTING
      const { data, error } = await supabase
        .from("units")
        .update(unitPayload)
        .eq("id", id)
        .select();

      if (error) {
        console.error("Update unit error:", error);
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      savedUnit = data && data[0] ? data[0] : { id, ...unitPayload };
    } else {
      // INSERT UNIT BARU
      const { data, error } = await supabase
        .from("units")
        .insert([unitPayload])
        .select();

      if (error) {
        console.error("Insert unit error:", error);
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      savedUnit = data && data[0] ? data[0] : unitPayload;
    }

    // 2. Registrasi / Update Kredensial Akun Login di app_users
    if (username && password) {
      const cleanUsername = username.toLowerCase().trim();
      const userPayload = {
        username: cleanUsername,
        password: password,
        role: "UNIT",
        unit_id: savedUnit.id || null,
        unit_name: kcp_name || "-",
        sentra_mikro: sentra_mikro || "-",
        updated_at: new Date().toISOString(),
      };

      try {
        // Cek apakah username sudah terdaftar di app_users
        const { data: existingUser } = await supabase
          .from("app_users")
          .select("id")
          .eq("username", cleanUsername)
          .maybeSingle();

        if (existingUser) {
          // Update Password & Link Unit jika user sudah ada
          await supabase
            .from("app_users")
            .update({
              password: password,
              unit_id: savedUnit.id || null,
              unit_name: kcp_name || "-",
              sentra_mikro: sentra_mikro || "-",
            })
            .eq("id", existingUser.id);
        } else {
          // Insert User Baru jika belum ada
          await supabase.from("app_users").insert([{
            ...userPayload,
            created_at: new Date().toISOString(),
          }]);
        }
      } catch (userErr) {
        console.warn("User credentials non-fatal warning:", userErr);
        // Non-blocking: Unit tetap berhasil disimpan meskipun tabel user mengalami warning
      }
    }

    return NextResponse.json({ data: savedUnit, success: true }, { status: 200 });
  } catch (err: any) {
    console.error("POST units internal error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error saat menyimpan unit" },
      { status: 500 }
    );
  }
}

// DELETE: Hapus Unit
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Unit ID required" }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    const { error } = await supabase.from("units").delete().eq("id", id);

    if (error) {
      console.error("Delete unit error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    console.error("DELETE units internal error:", err);
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}