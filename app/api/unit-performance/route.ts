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
    const period = searchParams.get("period") || new Date().toISOString().slice(0, 7); // Format: YYYY-MM

    if (!unit_id) {
      return NextResponse.json({ error: "unit_id parameter is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("unit_performance")
      .select("*")
      .eq("unit_id", unit_id)
      .eq("period_month", period)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Jika belum ada record untuk bulan ini, kembalikan data default 0
    const defaultData = data || {
      unit_id,
      period_month: period,
      target_kredit: 10000000000, // Default 10 Miliar
      realisasi_kredit: 0,
      target_funding: 5000000000,  // Default 5 Miliar
      realisasi_funding: 0,
      npl_percentage: 1.25,
    };

    return NextResponse.json({ data: defaultData });
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
    const { unit_id, period_month, target_kredit, realisasi_kredit, target_funding, realisasi_funding, npl_percentage } = body;

    if (!unit_id || !period_month) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("unit_performance")
      .upsert(
        {
          unit_id,
          period_month,
          target_kredit: Number(target_kredit) || 0,
          realisasi_kredit: Number(realisasi_kredit) || 0,
          target_funding: Number(target_funding) || 0,
          realisasi_funding: Number(realisasi_funding) || 0,
          npl_percentage: Number(npl_percentage) || 0,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "unit_id, period_month" }
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data, message: "Performance updated successfully" });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}