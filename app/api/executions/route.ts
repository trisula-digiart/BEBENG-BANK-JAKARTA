import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  return createClient(url, key);
}

// GET: Ambil SELURUH Data Eksekusi Langsung dari Supabase Cloud (Tanpa Cache)
export async function GET() {
  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from("executions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("GET executions Supabase error:", error);
      return NextResponse.json(
        { data: [] },
        {
          status: 200,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
          },
        }
      );
    }

    return NextResponse.json(
      { data: data || [] },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
        },
      }
    );
  } catch (err: any) {
    console.error("GET executions exception:", err);
    return NextResponse.json({ data: [] }, { status: 200 });
  }
}

// POST: Simpan Persisten ke Database Supabase Cloud (Safe Insert)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const supabase = getSupabaseClient();

    const {
      id,
      no_urut,
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

    // Bersihkan payload
    const payload: any = {
      no_urut: Number(no_urut) || 1,
      nama_sentra: String(nama_sentra || "bekasi").trim(),
      nama_muh: String(nama_muh || "susanti").trim(),
      nama_sm: String(nama_sm || "-").trim(),
      nama_debitur: String(nama_debitur || "-").trim(),
      bidang_usaha: String(bidang_usaha || "-").trim(),
      no_tabungan: String(no_tabungan || "-").trim(),
      no_pinjaman: String(no_pinjaman || "-").trim(),
      line_proses: String(line_proses || "SM").trim(),
      plafon: isNaN(Number(plafon)) ? 0 : Number(plafon),
      nett_booking: isNaN(Number(nett_booking)) ? 0 : Number(nett_booking),
      tgl_cair: String(tgl_cair || "29/07/2026"),
      periode_bulan: "7/2026",
      qris: String(qris || "").trim(),
      jakone_abank: String(jakone_abank || "").trim(),
      jakone_mobile: String(jakone_mobile || "").trim(),
      edc: String(edc || "").trim(),
      keterangan: String(keterangan || "COLLECT DATA").trim(),
      created_at: new Date().toISOString(),
    };

    // Validasi UUID unit_id agar tidak bentrok dengan Foreign Key Supabase
    const isUnitUUID = unit_id && typeof unit_id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(unit_id);
    if (isUnitUUID) {
      payload.unit_id = unit_id;
    }

    let savedData: any = null;

    // Validasi UUID Record ID
    const isRecordUUID = id && typeof id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

    if (isRecordUUID) {
      const { data, error } = await supabase
        .from("executions")
        .update(payload)
        .eq("id", id)
        .select();

      if (!error && data && data.length > 0) {
        savedData = data[0];
      }
    }

    if (!savedData) {
      const { data, error } = await supabase
        .from("executions")
        .insert([payload])
        .select();

      if (error) {
        console.error("Insert error Supabase (Retrying without unit_id):", error);
        delete payload.unit_id;
        const { data: retryData, error: retryErr } = await supabase
          .from("executions")
          .insert([payload])
          .select();

        if (!retryErr && retryData && retryData[0]) {
          savedData = retryData[0];
        } else {
          console.error("Retry insert failed:", retryErr);
          return NextResponse.json({ data: { id: `temp-${Date.now()}`, ...payload }, success: false }, { status: 200 });
        }
      } else {
        savedData = data && data[0] ? data[0] : payload;
      }
    }

    return NextResponse.json({ data: savedData, success: true }, { status: 200 });
  } catch (err: any) {
    console.error("POST execution exception:", err);
    return NextResponse.json({ success: false }, { status: 200 });
  }
}