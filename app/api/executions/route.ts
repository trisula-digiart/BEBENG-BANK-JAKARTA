import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  return createClient(url, key);
}

// GET: Fetch Executions dengan Logika Retensi 1 Bulan Berjalan
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date") || new Date().toISOString().split("T")[0];
    const unitId = searchParams.get("unit_id");

    const supabase = getSupabaseClient();

    // Hitung Rentang Tanggal 1 Bulan Berjalan (Awal Bulan sampai Akhir Bulan)
    const targetDate = new Date(dateParam);
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth(); // 0-indexed

    const startDate = new Date(year, month, 1).toISOString().split("T")[0];
    const endDate = new Date(year, month + 1, 0).toISOString().split("T")[0];
    const periodeBulanStr = `${month + 1}/${year}`; // Format "7/2026"

    let query = supabase
      .from("executions")
      .select("*, units(*)")
      .gte("tgl_cair", startDate)
      .lte("tgl_cair", endDate)
      .order("created_at", { ascending: true });

    if (unitId) {
      query = query.eq("unit_id", unitId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("GET executions DB error:", error);
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    return NextResponse.json({ data: data || [], periode_active: periodeBulanStr }, { status: 200 });
  } catch (err: any) {
    console.error("GET executions exception:", err);
    return NextResponse.json({ data: [] }, { status: 200 });
  }
}

// POST: Save/Insert Data Eksekusi Unit
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const supabase = getSupabaseClient();

    const {
      id,
      unit_id,
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
      qris,
      jakone_abank,
      jakone_mobile,
      edc,
      keterangan,
    } = body;

    const cairDate = tgl_cair || new Date().toISOString().split("T")[0];
    const d = new Date(cairDate);
    const periodeBulan = `${d.getMonth() + 1}/${d.getFullYear()}`;

    const payload = {
      unit_id: unit_id || null,
      nama_sentra: nama_sentra || "Sentra Mikro Jkt Timur",
      nama_muh: nama_muh || "MUH Unit",
      nama_sm: nama_sm || "-",
      nama_debitur: nama_debitur || "-",
      bidang_usaha: bidang_usaha || "-",
      no_tabungan: no_tabungan || "-",
      no_pinjaman: no_pinjaman || "-",
      line_proses: line_proses || "SM",
      plafon: Number(plafon) || 0,
      nett_booking: Number(nett_booking) || 0,
      tgl_cair: cairDate,
      periode_bulan: periodeBulan,
      qris: qris || "",
      jakone_abank: jakone_abank || "",
      jakone_mobile: jakone_mobile || "",
      edc: edc || "",
      keterangan: keterangan || "",
      created_at: new Date().toISOString(),
    };

    let savedData = null;

    if (id && !id.toString().startsWith("temp-")) {
      const { data, error } = await supabase
        .from("executions")
        .update(payload)
        .eq("id", id)
        .select();

      if (error) throw error;
      savedData = data && data[0] ? data[0] : payload;
    } else {
      const { data, error } = await supabase
        .from("executions")
        .insert([payload])
        .select();

      if (error) throw error;
      savedData = data && data[0] ? data[0] : payload;
    }

    return NextResponse.json({ data: savedData, success: true }, { status: 200 });
  } catch (err: any) {
    console.error("POST execution exception:", err);
    return NextResponse.json(
      { error: err?.message || "Gagal menyimpan data eksekusi" },
      { status: 500 }
    );
  }
}