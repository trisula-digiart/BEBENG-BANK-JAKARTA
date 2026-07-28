import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const supabase = await createServerClient();
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const unitId = searchParams.get("unit_id");

    let query = supabase.from("unit_execution_reports").select("*, units(*)");

    if (date && date !== "undefined" && date !== "null") {
      query = query.eq("report_date", date);
    }

    // SANITASI KETAT PARAMETER UNIT_ID (Hanya filter jika UUID valid, bukan "undefined" / "null")
    if (unitId && unitId !== "undefined" && unitId !== "null" && unitId.trim() !== "") {
      query = query.eq("unit_id", unitId);
    }

    const { data, error } = await query.order("no_urut", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error: any) {
    console.error("GET Execution Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();
    const body = await request.json();

    const {
      id,
      no_urut,
      unit_id,
      report_date,
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

    // Validasi unit_id wajib UUID valid
    if (!unit_id || unit_id === "undefined" || unit_id === "null") {
      return NextResponse.json({ success: false, error: "unit_id UUID valid wajib diisi." }, { status: 400 });
    }

    if (!report_date) {
      return NextResponse.json({ success: false, error: "report_date wajib diisi." }, { status: 400 });
    }

    // Hitung no_urut otomatis jika tidak dikirim
    let calculatedNoUrut = Number(no_urut) || 0;
    if (!calculatedNoUrut || calculatedNoUrut <= 0) {
      const { data: maxRows } = await supabase
        .from("unit_execution_reports")
        .select("no_urut")
        .eq("unit_id", unit_id)
        .eq("report_date", report_date)
        .order("no_urut", { ascending: false })
        .limit(1);

      const maxNo = maxRows && maxRows.length > 0 ? maxRows[0].no_urut : 0;
      calculatedNoUrut = (Number(maxNo) || 0) + 1;
    }

    // Sanitasi Tanggal Cair
    const sanitizedTglCair = tgl_cair && tgl_cair.trim() !== "" ? tgl_cair : null;

    const payload = {
      unit_id,
      report_date,
      no_urut: calculatedNoUrut,
      nama_sm: nama_sm || "-",
      nama_debitur: nama_debitur || "-",
      bidang_usaha: bidang_usaha || "-",
      no_tabungan: no_tabungan || "-",
      no_pinjaman: no_pinjaman || "-",
      line_proses: line_proses || "BOOKING",
      plafon: Number(plafon) || 0,
      nett_booking: Number(nett_booking) || 0,
      tgl_cair: sanitizedTglCair,
      periode_bulan: periode_bulan || "-",
      qris: qris || "",
      jakone_abank: jakone_abank || "",
      jakone_mobile: jakone_mobile || "",
      edc: edc || "",
      keterangan: keterangan || "-",
      updated_at: new Date().toISOString(),
    };

    let resultData;

    // Cek ID UUID asli Supabase
    const isValidUUID = id && typeof id === "string" && !id.startsWith("temp_") && id.length > 20;

    if (isValidUUID) {
      const { data, error } = await supabase
        .from("unit_execution_reports")
        .update(payload)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      resultData = data;
    } else {
      const { data, error } = await supabase
        .from("unit_execution_reports")
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      resultData = data;
    }

    return NextResponse.json({ success: true, data: resultData });
  } catch (error: any) {
    console.error("POST Execution Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createServerClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "ID wajib disertakan." }, { status: 400 });
    }

    const { error } = await supabase.from("unit_execution_reports").delete().eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE Execution Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}