import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const unit_id = searchParams.get("unit_id");
    const date = searchParams.get("date") || new Date().toISOString().slice(0, 10);

    if (!unit_id) {
      return NextResponse.json({ error: "unit_id parameter is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("unit_daily_operations")
      .select("*")
      .eq("unit_id", unit_id)
      .eq("report_date", date)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data || null });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { unit_id, report_date, ringkasan_kegiatan, kendala_lapangan, tindak_lanjut } = body;

    if (!unit_id || !report_date || !ringkasan_kegiatan) {
      return NextResponse.json({ error: "Ringkasan kegiatan & tanggal wajib diisi" }, { status: 400 });
    }

    const payload = {
      unit_id,
      report_date,
      ringkasan_kegiatan,
      kendala_lapangan: kendala_lapangan || "",
      tindak_lanjut: tindak_lanjut || "",
      created_by: user.id,
    };

    const { data, error } = await supabase
      .from("unit_daily_operations")
      .upsert(payload, { onConflict: "unit_id, report_date" })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data, message: "Laporan operasional harian berhasil disimpan" });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}