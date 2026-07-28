import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // Cek apakah Environment Variables sudah terpasang
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        {
          connected: false,
          error: "Supabase Environment Variables (NEXT_PUBLIC_SUPABASE_URL / ANON_KEY) missing.",
        },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Ping test query ringan ke Supabase
    const { error } = await supabase.from("units").select("id").limit(1);

    if (error && error.code !== "PGRST116") {
      // PGRST116 = Data kosong/tidak ditemukan, tetap dianggap terhubung
      return NextResponse.json(
        {
          connected: false,
          error: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        connected: true,
        message: "Supabase Database Connected & Operational.",
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        connected: false,
        error: err?.message || "Internal Server Error during DB health check.",
      },
      { status: 500 }
    );
  }
}