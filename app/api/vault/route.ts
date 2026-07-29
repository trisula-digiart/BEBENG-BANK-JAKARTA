import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  return createClient(url, key);
}

// GET: Fetch All Vault Documents (Universal Consolidate)
export async function GET() {
  try {
    const supabase = getSupabaseClient();
    
    // Coba ambil dari vault_documents terlebih dahulu
    const { data, error } = await supabase
      .from("vault_documents")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      return NextResponse.json({ data }, { status: 200 });
    }

    // Fallback ke tabel documents
    const { data: fallbackData, error: fallbackError } = await supabase
      .from("documents")
      .select("*")
      .order("created_at", { ascending: false });

    if (fallbackError) {
      console.error("Fetch vault documents error:", fallbackError);
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    return NextResponse.json({ data: fallbackData || [] }, { status: 200 });
  } catch (err: any) {
    console.error("GET vault internal error:", err);
    return NextResponse.json({ data: [] }, { status: 200 });
  }
}

// POST: Save/Insert Vault Document
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

    if (id) {
      // UPDATE DOCUMENT
      const { data, error } = await supabase
        .from("vault_documents")
        .update(docPayload)
        .eq("id", id)
        .select();

      if (error) {
        const { data: fbData, error: fbError } = await supabase
          .from("documents")
          .update(docPayload)
          .eq("id", id)
          .select();

        if (fbError) {
          return NextResponse.json({ error: "Gagal memperbarui dokumen di database Supabase." }, { status: 400 });
        }
        savedDoc = fbData && fbData[0] ? fbData[0] : { id, ...docPayload };
      } else {
        savedDoc = data && data[0] ? data[0] : { id, ...docPayload };
      }
    } else {
      // INSERT DOCUMENT BARU
      const { data, error } = await supabase
        .from("vault_documents")
        .insert([docPayload])
        .select();

      if (error) {
        // Fallback coba insert ke tabel documents jika vault_documents belum ada
        const { data: fbData, error: fbError } = await supabase
          .from("documents")
          .insert([docPayload])
          .select();

        if (fbError) {
          console.error("Insert vault DB error detail:", error, fbError);
          return NextResponse.json(
            { error: "Tabel database 'vault_documents' belum dibuat di Supabase. Silakan jalankan SQL Script di SQL Editor." },
            { status: 400 }
          );
        }
        savedDoc = fbData && fbData[0] ? fbData[0] : docPayload;
      } else {
        savedDoc = data && data[0] ? data[0] : docPayload;
      }
    }

    return NextResponse.json({ data: savedDoc, success: true }, { status: 200 });
  } catch (err: any) {
    console.error("POST vault internal exception:", err);
    return NextResponse.json(
      { error: err?.message || "Terjadi kesalahan internal saat menyimpan dokumen." },
      { status: 500 }
    );
  }
}

// DELETE: Hapus Dokumen Vault
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Document ID required" }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    const { error } = await supabase.from("vault_documents").delete().eq("id", id);

    if (error) {
      await supabase.from("documents").delete().eq("id", id);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    console.error("DELETE vault internal error:", err);
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}