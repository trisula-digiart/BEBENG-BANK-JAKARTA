import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";
  return createClient(url, key);
}

// Helper validasi UUID murni
function isValidUUID(str?: string | null): boolean {
  if (!str) return false;
  if (typeof str !== "string") return false;
  if (str.startsWith("temp_")) return false;
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// GET: Fetch Semua Data Eksekusi
export async function GET() {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("executions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fetch executions DB error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data: data || [] }, { status: 200 });
  } catch (err: any) {
    console.error("GET executions internal error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

// POST: Save/Upsert Data Eksekusi dari Unit
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      id,
      unit_id,
      no_urut,
      nama_sentra,
      nama_muh,
      nama_sm,
      nama_debitur,
      bidang_usaha,
      no_tabungan,
      no_pinjaman,
      line_proses,
      plafon,
      nett_booking,
      tgl_cair,
      periode_bulan,
      qris,
      jakone_abank,
      jakone_mobile,
      edc,
      keterangan,
    } = body;

    const supabase = getSupabaseClient();

    // 1. Sanitasi Payload agar aman dari Error 400 PostgreSQL Constraint
    const payload: Record<string, any> = {
      nama_sentra: String(nama_sentra || "cikarang").trim(),
      nama_muh: String(nama_muh || "andi").trim(),
      nama_sm: String(nama_sm || "").trim(),
      nama_debitur: String(nama_debitur || "").trim(),
      bidang_usaha: String(bidang_usaha || "-").trim(),
      no_tabungan: String(no_tabungan || "-").trim(),
      no_pinjaman: String(no_pinjaman || "-").trim(),
      line_proses: String(line_proses || "SM").trim(),
      plafon: Number(plafon) || 0,
      nett_booking: Number(nett_booking) || 0,
      tgl_cair: String(tgl_cair || "").trim(),
      periode_bulan: String(periode_bulan || "").trim(),
      qris: String(qris || "").trim(),
      jakone_abank: String(jakone_abank || "").trim(),
      jakone_mobile: String(jakone_mobile || "").trim(),
      edc: String(edc || "").trim(),
      keterangan: String(keterangan || "").trim(),
    };

    // Hanya masukkan unit_id jika UUID valid, abaikan jika string biasa/temp
    if (isValidUUID(unit_id)) {
      payload.unit_id = unit_id;
    }

    if (no_urut && !isNaN(Number(no_urut))) {
      payload.no_urut = Number(no_urut);
    }

    let savedData: any = null;

    // 2. Eksekusi DB: Update jika UUID ID valid, Insert jika ID temp / baru
    if (isValidUUID(id)) {
      const { data, error } = await supabase
        .from("executions")
        .update(payload)
        .eq("id", id)
        .select();

      if (error) {
        console.error("Update execution error:", error);
        return NextResponse.json(
          { error: `Update DB Error: ${error.message}` },
          { status: 400 }
        );
      }
      savedData = data && data[0] ? data[0] : { id, ...payload };
    } else {
      const { data, error } = await supabase
        .from("executions")
        .insert([payload])
        .select();

      if (error) {
        console.error("Insert execution error:", error);
        return NextResponse.json(
          { error: `Insert DB Error: ${error.message}` },
          { status: 400 }
        );
      }
      savedData = data && data[0] ? data[0] : payload;
    }

    return NextResponse.json(
      { data: savedData, success: true },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("POST execution exception:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Exception saat menyimpan data" },
      { status: 500 }
    );
  }
}

// DELETE: Hapus Data Eksekusi
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id || !isValidUUID(id)) {
      return NextResponse.json(
        { error: "Valid Execution UUID required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();
    const { error } = await supabase.from("executions").delete().eq("id", id);

    if (error) {
      console.error("Delete execution error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    console.error("DELETE execution internal error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}