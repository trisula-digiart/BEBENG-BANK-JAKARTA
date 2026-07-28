import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";

export default async function RootPage() {
  const supabase = await createServerClient();

  // Validasi Authenticated User
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  // Ambil Role Profile User
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // Redirect berdasarkan Role
  if (profile?.role === "HEAD_AREA") {
    redirect("/head-area");
  } else {
    redirect("/unit-execution");
  }
}