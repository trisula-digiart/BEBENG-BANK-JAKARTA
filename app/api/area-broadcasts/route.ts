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

    // Ambil daftar pengumuman/broadcast dari Area Head
    const { data: broadcasts, error: bError } = await supabase
      .from("area_broadcasts")
      .select("*")
      .order("created_at", { ascending: false });

    if (bError) {
      return NextResponse.json({ error: bError.message }, { status: 500 });
    }

    // Jika unit_id dikirim, ambil status yang sudah dibaca
    let readBroadcastIds: string[] = [];
    if (unit_id) {
      const { data: reads } = await supabase
        .from("area_broadcast_reads")
        .select("broadcast_id")
        .eq("unit_id", unit_id);

      if (reads) {
        readBroadcastIds = reads.map((r) => r.broadcast_id);
      }
    }

    const mappedData = (broadcasts || []).map((b) => ({
      ...b,
      is_read: readBroadcastIds.includes(b.id),
    }));

    return NextResponse.json({ data: mappedData });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}

// Handler Tandai Sudah Dibaca (Mark as Read)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { broadcast_id, unit_id } = body;

    if (!broadcast_id || !unit_id) {
      return NextResponse.json({ error: "broadcast_id dan unit_id wajib ada" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("area_broadcast_reads")
      .upsert({ broadcast_id, unit_id, read_at: new Date().toISOString() }, { onConflict: "broadcast_id, unit_id" })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data, message: "Pesan ditandai telah dibaca" });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}