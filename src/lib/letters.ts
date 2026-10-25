"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export type LetterThread = {
  id: string;
  peer_id: string;
  peer_name: string | null;
  peer_handle: string | null;
  peer_photo: string | null;
  is_request: boolean;
  started_by_me: boolean;
  last_body: string | null;
  last_at: string;
  muted: boolean;
};

export type Letter = { id: string; sender_id: string; mine: boolean; body: string; created_at: string };

const GENERIC = "That Letter couldn’t be sent.";

function sb() {
  const client = getSupabaseBrowserClient();
  if (!client) throw new Error(GENERIC);
  return client;
}

/** Maps RPC errors to friendly text. HLTR1 stays generic on purpose (never reveals a block). */
function friendly(error: { code?: string; message: string }): Error {
  if (error.code === "HLTR2") return new Error("You’re sending a lot right now. Take a breath and try again soon.");
  if (error.code === "22023") return new Error("Letters can be up to 2,000 characters.");
  return new Error(GENERIC);
}

export async function listThreads(): Promise<LetterThread[]> {
  const { data, error } = await sb().rpc("list_conversations");
  if (error) throw new Error("Couldn’t load your Letters.");
  return (data ?? []) as LetterThread[];
}

export async function listLetters(conversationId: string): Promise<Letter[]> {
  const { data, error } = await sb().rpc("list_letters", { conv: conversationId });
  if (error) throw new Error("Couldn’t load this conversation.");
  return ((data ?? []) as Letter[]).slice().reverse();
}

export async function startLetter(personId: string): Promise<string> {
  const { data, error } = await sb().rpc("start_letter", { target: personId });
  if (error) throw friendly(error);
  return data as string;
}

export async function sendLetter(conversationId: string, body: string): Promise<void> {
  const { error } = await sb().rpc("send_letter", { conv: conversationId, body });
  if (error) throw friendly(error);
}

export async function unsendLetter(messageId: string): Promise<void> {
  const { error } = await sb().rpc("unsend_letter", { message: messageId });
  if (error) throw new Error("Couldn’t unsend that.");
}

export async function hideThread(conversationId: string): Promise<void> {
  const { error } = await sb().rpc("hide_conversation", { conv: conversationId });
  if (error) throw new Error("Couldn’t delete that conversation.");
}

export async function muteThread(conversationId: string, on: boolean): Promise<void> {
  const { error } = await sb().rpc("mute_conversation", { conv: conversationId, on_off: on });
  if (error) throw new Error("Couldn’t change that.");
}

export async function reportLetter(input: { conversationId: string; messageId?: string; reason: string; note?: string }) {
  const { error } = await sb().rpc("report_letter", {
    conv: input.conversationId,
    message: input.messageId ?? null,
    reason: input.reason,
    note: input.note || null,
  });
  if (error?.code === "HRPT2") throw new Error("That’s a lot of reports for one day. Try again tomorrow.");
}

/** First-time safety banner: payment apps, gift cards, phone numbers. */
const RISKY = [
  /\b(venmo|cash ?app|zelle|paypal|western union|moneygram|crypto|bitcoin|usdt|wire transfer)\b/i,
  /\bgift ?cards?\b/i,
  /(\+?\d[\d\s().-]{6,}\d)/,
];
export function looksRisky(text: string): boolean {
  return RISKY.some((r) => r.test(text));
}
