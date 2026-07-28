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
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data: data || [] }, { status: 200 });
  } catch (err: any) {
    console.error("GET units internal error:", err);
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}

// POST: Save/Insert New Unit + Auto Create Login User Credentials
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

    // 1. Sanitasi Payload Unit (Mencegah nilai NULL pada kolom NOT NULL PostgreSQL)
    const unitPayload = {
      kc_name: String(kc_name || "Walikota Jakarta Timur").trim(),
      kcp_name: String(kcp_name || "-").trim(),
      sentra_mikro: String(sentra_mikro || "-").trim(),
      muh_name: String(muh_name || "-").trim(),
      muh_status: String(muh_status || "Tetap").trim(),
      analis_mikro: String(analis_mikro || "-").trim(),
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
        console.error("Update unit DB error:", error);
        return NextResponse.json({ error: `Gagal Update DB: ${error.message}` }, { status: 400 });
      }
      savedUnit = data && data[0] ? data[0] : { id, ...unitPayload };
    } else {
      // INSERT UNIT BARU
      const { data, error } = await supabase
        .from("units")
        .insert([unitPayload])
        .select();

      if (error) {
        console.error("Insert unit DB error:", error);
        return NextResponse.json({ error: `Gagal Insert DB Units: ${error.message}` }, { status: 400 });
      }
      savedUnit = data && data[0] ? data[0] : unitPayload;
    }

    // 2. Registrasi / Upsert Credentials Akun Login di app_users
    if (username && password) {
      const cleanUsername = String(username).toLowerCase().trim();
      const cleanPassword = String(password).trim();

      try {
        const { data: existingUser } = await supabase
          .from("app_users")
          .select("id")
          .eq("username", cleanUsername)
          .maybeSingle();

        if (existingUser) {
          await supabase
            .from("app_users")
            .update({
              password: cleanPassword,
              unit_id: savedUnit.id || null,
              unit_name: unitPayload.kcp_name,
              sentra_mikro: unitPayload.sentra_mikro,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingUser.id);
        } else {
          await supabase.from("app_users").insert([
            {
              username: cleanUsername,
              password: cleanPassword,
              role: "UNIT",
              unit_id: savedUnit.id || null,
              unit_name: unitPayload.kcp_name,
              sentra_mikro: unitPayload.sentra_mikro,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ]);
        }
      } catch (userErr) {
        console.warn("User credentials creation warning:", userErr);
      }
    }

    return NextResponse.json({ data: savedUnit, success: true }, { status: 200 });
  } catch (err: any) {
    console.error("POST units internal exception:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Exception saat menyimpan unit" },
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