import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  return createClient(url, key);
}

// GET: Fetch All Vault Documents Persisten
export async function GET() {
  try {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from("vault_documents")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      return NextResponse.json({ data }, { status: 200 });
    }

    const { data: fallbackData, error: fallbackError } = await supabase
      .from("documents")
      .select("*")
      .order("created_at", { ascending: false });

    if (!fallbackError && fallbackData) {
      return NextResponse.json({ data: fallbackData }, { status: 200 });
    }

    return NextResponse.json({ data: [] }, { status: 200 });
  } catch (err: any) {
    console.error("GET vault error:", err);
    return NextResponse.json({ data: [] }, { status: 200 });
  }
}

// POST: Save Vault Document
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, title, category, file_type, file_size, content, file_url } = body;

    const supabase = getSupabaseClient();

    const docPayload = {
      title: String(title || "Dokumen Kerja Baru").trim(),
      category: String(category || "Dokumen Kerja").trim(),
      file_type: String(file_type || "xlsx").toLowerCase().trim(),
      file_size: String(file_size || "1.1 MB").trim(),
      content: String(content || "Isi berkas dokumen").trim(),
      file_url: file_url || null,
      created_at: new Date().toISOString(),
    };

    let savedDoc: any = null;

    const { data, error } = await supabase
      .from("vault_documents")
      .insert([docPayload])
      .select();

    if (error) {
      const { data: fbData, error: fbError } = await supabase
        .from("documents")
        .insert([docPayload])
        .select();

      if (fbError) {
        console.error("Vault insert error:", fbError);
        return NextResponse.json({ error: fbError.message }, { status: 400 });
      }
      savedDoc = fbData && fbData[0] ? fbData[0] : docPayload;
    } else {
      savedDoc = data && data[0] ? data[0] : docPayload;
    }

    return NextResponse.json({ data: savedDoc, success: true }, { status: 200 });
  } catch (err: any) {
    console.error("POST vault exception:", err);
    return NextResponse.json({ error: err?.message || "Internal Error" }, { status: 500 });
  }
}

// DELETE: Delete Document
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      const supabase = getSupabaseClient();
      await supabase.from("vault_documents").delete().eq("id", id);
      await supabase.from("documents").delete().eq("id", id);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ success: true }, { status: 200 });
  }
}