import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const supabase = await createServerClient();
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

    if (!date) {
      return NextResponse.json({ success: true, is_locked: false });
    }

    // 1. Cek Lock Status dari sm_daily_reports (Tabel Resmi Proyek)
    const { data: smLock } = await supabase
      .from("sm_daily_reports")
      .select("is_locked")
      .eq("report_date", date)
      .eq("is_locked", true)
      .limit(1);

    if (smLock && smLock.length > 0) {
      return NextResponse.json({ success: true, is_locked: true });
    }

    // 2. Safely Query daily_lock_status (dengan Silent Catch jika tabel tidak ada di Supabase)
    try {
      const { data } = await supabase
        .from("daily_lock_status")
        .select("is_locked")
        .eq("lock_date", date)
        .single();

      if (data) {
        return NextResponse.json({ success: true, is_locked: Boolean(data.is_locked) });
      }
    } catch (e) {
      // Ignore missing table exception
    }

    return NextResponse.json({ success: true, is_locked: false });
  } catch (error: any) {
    return NextResponse.json({ success: true, is_locked: false });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();
    const body = await request.json();
    const { date, is_locked } = body;

    if (!date) {
      return NextResponse.json(
        { success: false, error: "Tanggal lock_date wajib diisi." },
        { status: 400 }
      );
    }

    // Update Lock Status di sm_daily_reports
    await supabase
      .from("sm_daily_reports")
      .update({ is_locked: Boolean(is_locked) })
      .eq("report_date", date);

    // Update jika daily_lock_status ada
    try {
      await supabase
        .from("daily_lock_status")
        .upsert(
          {
            lock_date: date,
            is_locked: Boolean(is_locked),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "lock_date" }
        );
    } catch (e) {
      // Ignore missing table exception
    }

    return NextResponse.json({ success: true, is_locked: Boolean(is_locked) });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}