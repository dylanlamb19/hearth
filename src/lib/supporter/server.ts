// Server-only module (route handlers). Never import from client components.
import { createHmac, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { GRACE_DAYS, isPlan, type SupporterPlan } from "./perks";

/** Server-only flag. Off (unset or anything but "true"/"1") = no UI and every Supporter route 404s. */
export function supporterEnabled(): boolean {
  const v = (process.env.SUPPORTER_ENABLED || "").trim().toLowerCase();
  return v === "true" || v === "1";
}

/**
 * Payments adapter. v1 ships only the stub, which never makes a network call and never charges.
 * A Stripe adapter (Checkout + Billing Portal + subscriptions.update) implements the same shape later.
 */
export type CheckoutInput = { userId: string; email: string | null; plan: SupporterPlan; customerId: string | null; origin: string };
export type AdapterResult<T> = { ok: true; value: T } | { ok: false; reason: "not_configured" | "failed" };

export interface PaymentsAdapter {
  readonly ready: boolean;
  createCheckout(input: CheckoutInput): Promise<AdapterResult<{ url: string }>>;
  createPortal(customerId: string, origin: string): Promise<AdapterResult<{ url: string }>>;
  /** Cancel at period end (perks last until then). */
  cancelAtPeriodEnd(subscriptionId: string): Promise<AdapterResult<null>>;
  /** Undo a pending cancel. */
  resume(subscriptionId: string): Promise<AdapterResult<null>>;
  /** Immediate cancel, used when an account is deleted so nobody keeps getting billed. */
  cancelNow(subscriptionId: string): Promise<AdapterResult<null>>;
}

const notConfigured = async () => ({ ok: false as const, reason: "not_configured" as const });

/** Stub: no keys, no network, no charges. Everything reports "not_configured". */
export const stubAdapter: PaymentsAdapter = {
  ready: false,
  createCheckout: notConfigured,
  createPortal: notConfigured,
  cancelAtPeriodEnd: notConfigured,
  resume: notConfigured,
  cancelNow: notConfigured,
};

export function getPaymentsAdapter(): PaymentsAdapter {
  // TODO(stripe): when STRIPE_SECRET_KEY + price ids are set, return a Stripe adapter here.
  return stubAdapter;
}

/**
 * Verifies a Stripe-Signature header ("t=<unix>,v1=<hex>[,v1=...]") with HMAC-SHA256 over
 * "<t>.<raw body>", the same scheme stripe.webhooks.constructEvent uses. Local crypto only.
 * Rejects anything older than toleranceSec to stop replays.
 */
export function verifyStripeSignature(rawBody: string, header: string | null, secret: string, toleranceSec = 300, nowSec = Math.floor(Date.now() / 1000)): boolean {
  if (!header || !secret) return false;
  let t: number | null = null;
  const sigs: string[] = [];
  for (const part of header.split(",")) {
    const [k, v] = part.split("=", 2);
    if (k === "t" && v && /^\d+$/.test(v)) t = Number(v);
    else if (k === "v1" && v && /^[0-9a-f]{64}$/.test(v)) sigs.push(v);
  }
  if (t === null || sigs.length === 0 || Math.abs(nowSec - t) > toleranceSec) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex"), "hex");
  return sigs.some((s) => {
    const got = Buffer.from(s, "hex");
    return got.length === expected.length && timingSafeEqual(got, expected);
  });
}

type StripeObj = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" && v ? v : null);
const unixToIso = (v: unknown) => (typeof v === "number" ? new Date(v * 1000).toISOString() : null);

async function rowByCustomer(admin: SupabaseClient, customerId: string | null) {
  if (!customerId) return null;
  const { data } = await admin.from("supporters").select("user_id, grace_until").eq("stripe_customer_id", customerId).maybeSingle();
  return data as { user_id: string; grace_until: string | null } | null;
}

/**
 * Applies one verified Stripe event to public.supporters. Idempotent by event id.
 * Returns false only for a database failure (so Stripe retries).
 */
export async function applyStripeEvent(admin: SupabaseClient, event: { id: string; type: string; data?: { object?: StripeObj } }): Promise<boolean> {
  const { error: dupe } = await admin.from("stripe_events").insert({ id: event.id, type: event.type });
  if (dupe) return dupe.code === "23505"; // already processed = fine; anything else = retry
  const o = event.data?.object ?? {};
  const now = new Date();
  const write = async (userId: string, patch: Record<string, unknown>) => {
    const { error } = await admin.from("supporters").upsert({ user_id: userId, ...patch, updated_at: now.toISOString() });
    // Un-record the event so Stripe's retry gets processed instead of skipped as a duplicate.
    if (error) await admin.from("stripe_events").delete().eq("id", event.id);
    return !error;
  };

  switch (event.type) {
    case "checkout.session.completed": {
      const userId = str(o.client_reference_id);
      const meta = (o.metadata ?? {}) as StripeObj;
      if (!userId || o.mode !== "subscription") return true;
      return write(userId, {
        status: "active",
        plan: isPlan(meta.plan) ? meta.plan : null,
        stripe_customer_id: str(o.customer),
        stripe_subscription_id: str(o.subscription),
        grace_until: null,
        cancel_at_period_end: false,
      });
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      // Fallback for events that beat checkout.session.completed: the Stripe adapter must set
      // subscription_data.metadata.user_id at checkout.
      const metaUser = str(((o.metadata ?? {}) as StripeObj).user_id);
      const row = (await rowByCustomer(admin, str(o.customer))) ?? (metaUser ? { user_id: metaUser, grace_until: null } : null);
      if (!row) return true;
      const s = str(o.status);
      const deleted = event.type === "customer.subscription.deleted" || s === "canceled" || s === "unpaid" || s === "incomplete_expired";
      if (deleted) return write(row.user_id, { status: "canceled", grace_until: null, cancel_at_period_end: false });
      if (s === "past_due") {
        return write(row.user_id, { status: "past_due", grace_until: row.grace_until ?? new Date(now.getTime() + GRACE_DAYS * 864e5).toISOString() });
      }
      return write(row.user_id, {
        status: s === "active" || s === "trialing" ? "active" : "inactive",
        stripe_customer_id: str(o.customer),
        stripe_subscription_id: str(o.id),
        current_period_end: unixToIso(o.current_period_end),
        cancel_at_period_end: o.cancel_at_period_end === true,
        grace_until: null,
      });
    }
    case "invoice.payment_failed": {
      const row = await rowByCustomer(admin, str(o.customer));
      if (!row) return true;
      // Grace starts at the FIRST failure and is never extended by retries.
      return write(row.user_id, { status: "past_due", grace_until: row.grace_until ?? new Date(now.getTime() + GRACE_DAYS * 864e5).toISOString() });
    }
    default:
      return true;
  }
}

/** Definitely 18+ from a birth year alone (the borderline year counts as under 18). */
export function isAdultByBirthYear(birthYear: number | null | undefined, now = new Date()): boolean {
  return typeof birthYear === "number" && birthYear <= now.getFullYear() - 19;
}
