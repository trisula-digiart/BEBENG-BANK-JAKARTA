import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  // Menggunakan Service Role Key jika ada untuk bypass RLS Supabase secara total
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";
  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

// GET: Ambil SELURUH Data Eksekusi dari Supabase Cloud (No Cache)
export async function GET() {
  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from("executions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("GET executions Supabase Error:", error);
      return NextResponse.json(
        { data: [], error: error.message },
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
    console.error("GET executions Exception:", err);
    return NextResponse.json({ data: [] }, { status: 200 });
  }
}

// POST: Simpan Persisten ke Database Supabase Cloud (Direct Insert & Update)
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

    // Payload Minimalis & Aman dari Constraint Type Error
    const cleanPayload: any = {
      no_urut: Number(no_urut) || 1,
      nama_sentra: String(nama_sentra || "cikarang").trim().toLowerCase(),
      nama_muh: String(nama_muh || "andi").trim().toLowerCase(),
      nama_sm: String(nama_sm || "-").trim(),
      nama_debitur: String(nama_debitur || "-").trim(),
      bidang_usaha: String(bidang_usaha || "-").trim(),
      no_tabungan: String(no_tabungan || "-").trim(),
      no_pinjaman: String(no_pinjaman || "-").trim(),
      line_proses: String(line_proses || "SM").trim(),
      plafon: isNaN(Number(plafon)) ? 0 : Number(plafon),
      nett_booking: isNaN(Number(nett_booking)) ? 0 : Number(nett_booking),
      tgl_cair: String(tgl_cair || "29/07/2026").trim(),
      qris: String(qris || "").trim(),
      jakone_abank: String(jakone_abank || "").trim(),
      jakone_mobile: String(jakone_mobile || "").trim(),
      edc: String(edc || "").trim(),
      keterangan: String(keterangan || "COLLECT DATA").trim(),
    };

    // Sertakan unit_id hanya jika valid UUID
    const isUnitUUID =
      unit_id &&
      typeof unit_id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(unit_id);
    if (isUnitUUID) {
      cleanPayload.unit_id = unit_id;
    }

    let savedResult: any = null;

    // Pengecekan UUID Record ID jika UPDATE
    const isRecordUUID =
      id &&
      typeof id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

    if (isRecordUUID) {
      const { data: updateData, error: updateError } = await supabase
        .from("executions")
        .update(cleanPayload)
        .eq("id", id)
        .select();

      if (!updateError && updateData && updateData.length > 0) {
        savedResult = updateData[0];
      }
    }

    // Jika belum ter-update (record baru), lakukan INSERT
    if (!savedResult) {
      const { data: insertData, error: insertError } = await supabase
        .from("executions")
        .insert([{ ...cleanPayload, created_at: new Date().toISOString() }])
        .select();

      if (insertError) {
        console.error("Insert Primary Error Supabase:", insertError);

        // Fallback retry tanpa unit_id
        delete cleanPayload.unit_id;
        const { data: retryData, error: retryError } = await supabase
          .from("executions")
          .insert([cleanPayload])
          .select();

        if (!retryError && retryData && retryData[0]) {
          savedResult = retryData[0];
        } else {
          console.error("Retry Insert Error:", retryError);
          return NextResponse.json(
            { data: { id: `temp-${Date.now()}`, ...cleanPayload }, success: false, error: retryError?.message },
            { status: 200 }
          );
        }
      } else {
        savedResult = insertData && insertData[0] ? insertData[0] : cleanPayload;
      }
    }

    return NextResponse.json({ data: savedResult, success: true }, { status: 200 });
  } catch (err: any) {
    console.error("POST execution exception handled:", err);
    return NextResponse.json({ success: false, error: err?.message }, { status: 200 });
  }
}