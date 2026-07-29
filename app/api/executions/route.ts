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

function isValidUUID(str?: string | null): boolean {
  if (!str || typeof str !== "string") return false;
  if (str.startsWith("temp_")) return false;
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// GET: Fetch Data
export async function GET() {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("executions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data: data || [] }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

// POST: Ultra-Safe Insert/Update Engine
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const supabase = getSupabaseClient();

    // Safe Date Formatter (Mencegah PostgreSQL Date Format Error)
    const rawTglCair = body.tgl_cair ? String(body.tgl_cair).trim() : "";
    let cleanTglCair: string | null = null;
    if (rawTglCair && rawTglCair !== "-") {
      // Jika format DD/MM/YYYY ubah ke YYYY-MM-DD
      if (rawTglCair.includes("/")) {
        const parts = rawTglCair.split("/");
        if (parts.length === 3) {
          cleanTglCair = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
        }
      } else {
        cleanTglCair = rawTglCair;
      }
    }

    // Pembersihan Payload Murni
    const payload: Record<string, any> = {
      nama_sentra: body.nama_sentra ? String(body.nama_sentra).trim() : "cikarang",
      nama_muh: body.nama_muh ? String(body.nama_muh).trim() : "andi",
      nama_sm: body.nama_sm ? String(body.nama_sm).trim() : "-",
      nama_debitur: body.nama_debitur ? String(body.nama_debitur).trim() : "-",
      bidang_usaha: body.bidang_usaha ? String(body.bidang_usaha).trim() : "-",
      no_tabungan: body.no_tabungan ? String(body.no_tabungan).trim() : "-",
      no_pinjaman: body.no_pinjaman ? String(body.no_pinjaman).trim() : "-",
      line_proses: body.line_proses ? String(body.line_proses).trim() : "SM",
      plafon: Number(body.plafon) || 0,
      nett_booking: Number(body.nett_booking) || 0,
      periode_bulan: body.periode_bulan ? String(body.periode_bulan).trim() : "7/2026",
      qris: body.qris ? String(body.qris).trim() : "",
      jakone_abank: body.jakone_abank ? String(body.jakone_abank).trim() : "",
      jakone_mobile: body.jakone_mobile ? String(body.jakone_mobile).trim() : "",
      edc: body.edc ? String(body.edc).trim() : "",
      keterangan: body.keterangan ? String(body.keterangan).trim() : "",
    };

    if (cleanTglCair) {
      payload.tgl_cair = cleanTglCair;
    }

    if (isValidUUID(body.unit_id)) {
      payload.unit_id = body.unit_id;
    }

    if (body.no_urut && !isNaN(Number(body.no_urut))) {
      payload.no_urut = Number(body.no_urut);
    }

    let resultData: any = null;

    if (isValidUUID(body.id)) {
      // UPDATE
      const { data, error } = await supabase
        .from("executions")
        .update(payload)
        .eq("id", body.id)
        .select();

      if (error) {
        console.error("Supabase UPDATE Error:", error);
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      resultData = data && data[0] ? data[0] : { id: body.id, ...payload };
    } else {
      // INSERT
      const { data, error } = await supabase
        .from("executions")
        .insert([payload])
        .select();

      if (error) {
        console.error("Supabase INSERT Error:", error);
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      resultData = data && data[0] ? data[0] : payload;
    }

    return NextResponse.json({ data: resultData, success: true }, { status: 200 });
  } catch (err: any) {
    console.error("POST Exception:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Exception" },
      { status: 500 }
    );
  }
}

// DELETE: Hapus Data
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id || !isValidUUID(id)) {
      return NextResponse.json({ error: "Invalid UUID" }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    const { error } = await supabase.from("executions").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Server Error" }, { status: 500 });
  }
}