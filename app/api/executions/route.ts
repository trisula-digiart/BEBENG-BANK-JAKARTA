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

// Helper validasi UUID
function isValidUUID(str?: string | null): boolean {
  if (!str) return false;
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// GET: Fetch All Executions untuk Head Area & Unit
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

// POST: Save/Upsert Row Eksekusi Debitur dari Unit
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

    // Sanitasi & Persiapan Payload DB
    const cleanUnitId = isValidUUID(unit_id) ? unit_id : null;
    const cleanId = isValidUUID(id) ? id : undefined;

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

    if (cleanUnitId) {
      payload.unit_id = cleanUnitId;
    }

    if (no_urut) {
      payload.no_urut = Number(no_urut);
    }

    let savedData: any = null;

    if (cleanId) {
      // Update data existing
      const { data, error } = await supabase
        .from("executions")
        .update(payload)
        .eq("id", cleanId)
        .select();

      if (error) {
        console.error("Update execution error:", error);
        return NextResponse.json(
          { error: `Update DB Error: ${error.message}` },
          { status: 400 }
        );
      }
      savedData = data && data[0] ? data[0] : { id: cleanId, ...payload };
    } else {
      // Insert data baru
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
      { error: err?.message || "Internal Exception saat menyimpan data eksekusi" },
      { status: 500 }
    );
  }
}

// DELETE: Hapus Row Eksekusi
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