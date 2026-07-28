import { createBrowserClient as createClient } from "@supabase/ssr";

export function createBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  if (!supabaseUrl || !supabaseAnonKey) {
    if (typeof window !== "undefined") {
      console.warn(
        "Warning: Supabase Environment Variables (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY) tidak terdeteksi. Pastikan file .env.local telah dibuat dan restart dev server."
      );
    }
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}