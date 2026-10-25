import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getPaymentsAdapter, isAdultByBirthYear, supporterEnabled } from "@/lib/supporter/server";
import { isFrame, isPlan, isTint, type PublicPerks, type SupporterMe } from "@/lib/supporter/perks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const notFound = () => new NextResponse("Not found", { status: 404 });
const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

async function session() {
  const supabase = await getSupabaseServerClient();
  const admin = getSupabaseAdminClient();
  if (!supabase || !admin) return null;
  const { data } = await supabase.auth.getUser();
  return { supabase, admin, user: data.user ?? null };
}

/**
 * GET ?uid=<id> -> that person's cosmetic perks (or null). GET (no uid) -> the caller's own
 * Supporter state for Settings. 404 when SUPPORTER_ENABLED is off.
 */
export async function GET(request: NextRequest) {
  if (!supporterEnabled()) return notFound();
  const s = await session();
  if (!s) return NextResponse.json({ perks: null });
  const uid = request.nextUrl.searchParams.get("uid");

  if (uid) {
    if (!/^[0-9a-f-]{36}$/i.test(uid)) return NextResponse.json({ perks: null });
    const { data } = await s.supabase.rpc("supporter_perks", { uid });
    const row = Array.isArray(data) ? data[0] : null;
    const perks: PublicPerks | null = row
      ? { frame: isFrame(row.frame) ? row.frame : null, tint: isTint(row.tint) ? row.tint : "amber", showDot: row.show_dot !== false }
      : null;
    return NextResponse.json({ perks });
  }

  if (!s.user) return fail(401, "Please sign in again.");
  const [{ data: row }, { data: profile }, { data: active }] = await Promise.all([
    s.supabase.from("supporters").select("*").eq("user_id", s.user.id).maybeSingle(),
    s.admin.from("profiles").select("birth_year").eq("id", s.user.id).maybeSingle(),
    s.supabase.rpc("is_supporter", { uid: s.user.id }),
  ]);
  const me: SupporterMe = {
    status: row?.status ?? "inactive",
    plan: isPlan(row?.plan) ? row.plan : null,
    currentPeriodEnd: row?.current_period_end ?? null,
    cancelAtPeriodEnd: row?.cancel_at_period_end === true,
    graceUntil: row?.grace_until ?? null,
    isSupporter: active === true,
    isAdult: isAdultByBirthYear(profile?.birth_year),
    paymentsReady: getPaymentsAdapter().ready,
    perks: { frame: isFrame(row?.frame) ? row.frame : null, tint: isTint(row?.tint) ? row.tint : "amber", showDot: row?.show_dot !== false },
  };
  return NextResponse.json({ me });
}

/** POST { action: "checkout" | "cancel" | "resume" | "portal" | "prefs", ... } */
export async function POST(request: NextRequest) {
  if (!supporterEnabled()) return notFound();
  const s = await session();
  if (!s) return fail(503, "Supporter isn’t switched on yet.");
  if (!s.user) return fail(401, "Please sign in again.");
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return fail(400, "Something went wrong. Try again?");
  const adapter = getPaymentsAdapter();
  const origin = request.nextUrl.origin;
  const userId = s.user.id;
  const { data: row } = await s.admin.from("supporters").select("*").eq("user_id", userId).maybeSingle();
  const notReady = () => fail(503, "Payments aren’t switched on yet. Nothing was charged.");

  switch (body.action) {
    case "checkout": {
      if (!isPlan(body.plan)) return fail(400, "Pick monthly or yearly.");
      if (body.consentAutoRenew !== true) return fail(400, "Please tick that you understand it renews automatically.");
      if (body.confirmAdult !== true) return fail(400, "Please confirm you’re 18 or older.");
      const { data: profile } = await s.admin.from("profiles").select("birth_year").eq("id", userId).maybeSingle();
      if (!isAdultByBirthYear(profile?.birth_year)) return fail(403, "Supporter is for adults 18+.");
      const { data: active } = await s.admin.rpc("is_supporter", { uid: userId });
      if (active === true) return fail(409, "You’re already a Supporter. Thank you.");
      const r = await adapter.createCheckout({ userId, email: s.user.email ?? null, plan: body.plan, customerId: row?.stripe_customer_id ?? null, origin });
      return r.ok ? NextResponse.json({ url: r.value.url }) : notReady();
    }
    case "cancel":
    case "resume": {
      if (!row?.stripe_subscription_id) return fail(404, "There’s no Supporter plan to change.");
      const r = body.action === "cancel" ? await adapter.cancelAtPeriodEnd(row.stripe_subscription_id) : await adapter.resume(row.stripe_subscription_id);
      if (!r.ok) return notReady();
      await s.admin.from("supporters").update({ cancel_at_period_end: body.action === "cancel", updated_at: new Date().toISOString() }).eq("user_id", userId);
      return NextResponse.json({ ok: true });
    }
    case "portal": {
      if (!row?.stripe_customer_id) return fail(404, "There’s no card on file.");
      const r = await adapter.createPortal(row.stripe_customer_id, origin);
      return r.ok ? NextResponse.json({ url: r.value.url }) : notReady();
    }
    case "prefs": {
      if (!row) return fail(404, "Perks are a Supporter thank-you.");
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if ("frame" in body) patch.frame = body.frame === null ? null : isFrame(body.frame) ? body.frame : undefined;
      if ("tint" in body) patch.tint = isTint(body.tint) ? body.tint : undefined;
      if ("showDot" in body) patch.show_dot = typeof body.showDot === "boolean" ? body.showDot : undefined;
      if (Object.values(patch).some((v) => v === undefined)) return fail(400, "That option isn’t available.");
      const { error } = await s.admin.from("supporters").update(patch).eq("user_id", userId);
      return error ? fail(500, "Couldn’t save that. Try again?") : NextResponse.json({ ok: true });
    }
    default:
      return fail(400, "Something went wrong. Try again?");
  }
}
