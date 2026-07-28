import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from("units")
      .select("*")
      .order("kcp_name", { ascending: true });

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
    const { id, kc_name, kcp_name, sentra_mikro, muh_name, muh_status, analis_mikro } = body;

    if (!kcp_name || !sentra_mikro || !muh_name || !analis_mikro) {
      return NextResponse.json({ error: "Semua field unit wajib diisi" }, { status: 400 });
    }

    const payload = {
      ...(id ? { id } : {}),
      kc_name: kc_name || "Walikota Jakarta Timur",
      kcp_name,
      sentra_mikro,
      muh_name,
      muh_status: muh_status || "Tetap",
      analis_mikro,
    };

    const { data, error } = await supabase
      .from("units")
      .upsert(payload)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data, message: "Unit berhasil disimpan" });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID unit wajib disertakan" }, { status: 400 });
    }

    const { error } = await supabase.from("units").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: "Unit berhasil dihapus" });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}