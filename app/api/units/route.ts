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

    // 1. Upsert / Insert ke Tabel Master Units
    const unitPayload = {
      kc_name: kc_name || "Walikota Jakarta Timur",
      kcp_name,
      sentra_mikro,
      muh_name,
      muh_status: muh_status || "Tetap",
      analis_mikro,
      updated_at: new Date().toISOString(),
    };

    let unitResult;
    if (id) {
      unitResult = await supabase
        .from("units")
        .update(unitPayload)
        .eq("id", id)
        .select()
        .single();
    } else {
      unitResult = await supabase
        .from("units")
        .insert([unitPayload])
        .select()
        .single();
    }

    if (unitResult.error) {
      console.error("Save unit error:", unitResult.error);
      return NextResponse.json({ error: unitResult.error.message }, { status: 500 });
    }

    const savedUnit = unitResult.data;

    // 2. Jika Unit Baru & Ada Credentials -> Simpan ke app_users
    if (!id && username && password) {
      const userPayload = {
        username: username.toLowerCase().trim(),
        password: password,
        role: "UNIT",
        unit_id: savedUnit.id,
        unit_name: kcp_name,
        sentra_mikro: sentra_mikro,
        created_at: new Date().toISOString(),
      };

      const userInsert = await supabase.from("app_users").insert([userPayload]);
      if (userInsert.error) {
        console.warn("App user creation warning:", userInsert.error);
        // Tetap kembalikan unit berhasil meski user sudah ada/warning
      }
    }

    return NextResponse.json({ data: savedUnit }, { status: 200 });
  } catch (err: any) {
    console.error("POST units internal error:", err);
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
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
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    console.error("DELETE units internal error:", err);
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}