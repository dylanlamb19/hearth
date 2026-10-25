import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const ALLOWED_NEXT = new Set(["/home", "/welcome", "/reset-password"]);

/** Email confirmation and password-reset links land here with ?code=…; we swap it for a session. */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  // Only these exact destinations; anything else goes home (no open redirect).
  const nextParam = url.searchParams.get("next");
  const next = nextParam && ALLOWED_NEXT.has(nextParam) ? nextParam : "/home";

  const supabase = await getSupabaseServerClient();
  if (code && supabase) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const dest = new URL(next, url.origin);
      // Invite links (0014) survive a device switch: only a well-formed code is passed along.
      const invite = (url.searchParams.get("invite") || "").toLowerCase();
      if (next === "/welcome" && /^[a-z2-7]{16}$/.test(invite)) dest.searchParams.set("invite", invite);
      return NextResponse.redirect(dest);
    }
  }
  return NextResponse.redirect(new URL("/login?error=link", url.origin));
}
