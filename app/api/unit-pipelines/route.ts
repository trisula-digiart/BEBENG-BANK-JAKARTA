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

    if (!unit_id) {
      return NextResponse.json({ error: "unit_id parameter is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("unit_pipelines")
      .select("*")
      .eq("unit_id", unit_id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
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
    const { id, unit_id, nama_nasabah, segmen, potensi_plafond, status_funnel, catatan } = body;

    if (!unit_id || !nama_nasabah) {
      return NextResponse.json({ error: "Nama nasabah & Unit ID wajib diisi" }, { status: 400 });
    }

    const payload = {
      ...(id ? { id } : {}),
      unit_id,
      nama_nasabah,
      segmen: segmen || "Mikro",
      potensi_plafond: Number(potensi_plafond) || 0,
      status_funnel: status_funnel || "Prospek",
      catatan: catatan || "",
      created_by: user.id,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("unit_pipelines")
      .upsert(payload)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data, message: "Pipeline saved successfully" });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}