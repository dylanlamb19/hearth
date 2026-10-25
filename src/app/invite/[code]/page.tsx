import type { Metadata } from "next";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { resolveInvite } from "@/lib/invite";
import { InviteLanding } from "./InviteLanding";

type Params = { params: Promise<{ code: string }> };

const DESCRIPTION = "A quieter place for the people you’d invite over.";

async function lookup(code: string) {
  const sb = await getSupabaseServerClient();
  return resolveInvite(sb, (code || "").trim());
}

/** Public link preview: display name only. Expired or unknown codes get a generic card. */
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { code } = await params;
  const inv = await lookup(code);
  const title = inv.status === "ok" ? `${inv.displayName} saved you a seat on Hearth` : "You’re invited to Hearth";
  return {
    title,
    description: DESCRIPTION,
    robots: { index: false, follow: false },
    openGraph: { title, description: DESCRIPTION, type: "website" },
    twitter: { card: "summary_large_image", title, description: DESCRIPTION },
  };
}

export default async function InvitePage({ params }: Params) {
  const { code } = await params;
  const inv = await lookup(code);
  return <InviteLanding code={code} displayName={inv.status === "ok" ? inv.displayName : null} />;
}
