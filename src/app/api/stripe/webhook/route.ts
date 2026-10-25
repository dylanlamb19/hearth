import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { applyStripeEvent, supporterEnabled, verifyStripeSignature } from "@/lib/supporter/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stripe webhook. 404 when SUPPORTER_ENABLED is off. Every request must carry a valid
 * Stripe-Signature for STRIPE_WEBHOOK_SECRET (no secret = everything rejected). Handles
 * checkout.session.completed, customer.subscription.created/updated/deleted, invoice.payment_failed.
 */
export async function POST(request: NextRequest) {
  if (!supporterEnabled()) return new NextResponse("Not found", { status: 404 });
  const secret = process.env.STRIPE_WEBHOOK_SECRET || "";
  const raw = await request.text();
  if (raw.length > 256 * 1024) return new NextResponse("Too large", { status: 413 });
  if (!verifyStripeSignature(raw, request.headers.get("stripe-signature"), secret)) {
    return new NextResponse("Bad signature", { status: 400 });
  }
  let event: { id?: unknown; type?: unknown; data?: { object?: Record<string, unknown> } };
  try {
    event = JSON.parse(raw);
  } catch {
    return new NextResponse("Bad payload", { status: 400 });
  }
  if (typeof event.id !== "string" || typeof event.type !== "string") return new NextResponse("Bad payload", { status: 400 });
  const admin = getSupabaseAdminClient();
  if (!admin) return new NextResponse("Not configured", { status: 503 });
  const ok = await applyStripeEvent(admin, { id: event.id, type: event.type, data: event.data });
  return ok ? NextResponse.json({ received: true }) : new NextResponse("Retry", { status: 500 });
}
