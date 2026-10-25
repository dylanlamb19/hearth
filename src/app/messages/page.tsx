import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { LettersClient } from "./LettersClient";
import { SampleLetters } from "./SampleLetters";

export const dynamic = "force-dynamic";

/**
 * Letters. Signed out: straight to /login. Real Letters show only when LETTERS_ENABLED=true
 * (after migration 0016 runs); until then, the labeled sample with a disabled reply box.
 */
export default async function MessagesPage() {
  const supabase = await getSupabaseServerClient();
  if (supabase) {
    const { data } = await supabase.auth.getUser();
    if (!data.user) redirect("/login");
    if (process.env.LETTERS_ENABLED === "true") return <LettersClient meId={data.user.id} />;
  }
  return <SampleLetters />;
}
