"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Ban, BellOff, Flag, MailOpen, MessageCircle, MoreHorizontal, ShieldAlert, Trash2, Undo2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Avatar } from "@/components/Avatar";
import { EmptyState } from "@/components/EmptyState";
import { blockPerson } from "@/lib/blocks";
import {
  hideThread,
  listLetters,
  listThreads,
  looksRisky,
  muteThread,
  reportLetter,
  sendLetter,
  startLetter,
  unsendLetter,
  type Letter,
  type LetterThread,
} from "@/lib/letters";

const REASONS = ["Harassment", "Spam", "Scam or money request", "Nudity or sexual content", "Hate", "Someone under 13", "Other"];
const UUID = /^[0-9a-f-]{36}$/i;
const icon = { strokeWidth: 1.75, "aria-hidden": true } as const;
const when = (iso: string) => new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

type ReportTarget = { messageId?: string } | null;

export function LettersClient({ meId }: { meId: string }) {
  const params = useSearchParams();
  const [threads, setThreads] = useState<LetterThread[]>([]);
  const [tray, setTray] = useState<"letters" | "requests">("letters");
  const [active, setActive] = useState<string | null>(null);
  const [letters, setLetters] = useState<Letter[]>([]);
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);
  const [report, setReport] = useState<ReportTarget>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [bannerSeen, setBannerSeen] = useState(true);
  const started = useRef(false);

  const refreshThreads = useCallback(async () => {
    try {
      setThreads(await listThreads());
    } catch (e) {
      setNotice((e as Error).message);
    }
  }, []);

  const refreshLetters = useCallback(async (id: string) => {
    try {
      setLetters(await listLetters(id));
    } catch (e) {
      setNotice((e as Error).message);
    }
  }, []);

  // ?to=<person id> opens (or starts) a Letter with that person.
  useEffect(() => {
    const to = params.get("to");
    if (started.current || !to || !UUID.test(to) || to === meId) return;
    started.current = true;
    startLetter(to)
      .then((id) => {
        setActive(id);
        return refreshThreads();
      })
      .catch((e: Error) => setNotice(e.message));
  }, [params, meId, refreshThreads]);

  useEffect(() => {
    void refreshThreads();
    const t = setInterval(() => void refreshThreads(), 15000);
    return () => clearInterval(t);
  }, [refreshThreads]);

  useEffect(() => {
    if (!active) return;
    setMenu(false);
    void refreshLetters(active);
    try {
      setBannerSeen(localStorage.getItem(`hearth_letter_banner:${active}`) === "1");
    } catch {
      setBannerSeen(false);
    }
    const t = setInterval(() => void refreshLetters(active), 8000);
    return () => clearInterval(t);
  }, [active, refreshLetters]);

  const shown = threads.filter((t) => (tray === "requests" ? t.is_request && !t.started_by_me : !t.is_request || t.started_by_me));
  const requestCount = threads.filter((t) => t.is_request && !t.started_by_me).length;
  const current = threads.find((t) => t.id === active) ?? null;
  const peerName = current?.peer_name || current?.peer_handle || "Someone on Hearth";
  const risky = !bannerSeen && letters.some((l) => !l.mine && looksRisky(l.body));

  function dismissBanner() {
    setBannerSeen(true);
    try {
      if (active) localStorage.setItem(`hearth_letter_banner:${active}`, "1");
    } catch {
      /* ignore */
    }
  }

  async function onSend(e: React.FormEvent) {
    e.preventDefault();
    if (!active || !draft.trim()) return;
    setNotice(null);
    try {
      await sendLetter(active, draft);
      setDraft("");
      await Promise.all([refreshLetters(active), refreshThreads()]);
    } catch (err) {
      setNotice((err as Error).message);
    }
  }

  async function run(action: () => Promise<void>, after?: string) {
    setMenu(false);
    try {
      await action();
      if (after) setNotice(after);
    } catch (err) {
      setNotice((err as Error).message);
    }
  }

  async function onBlock() {
    if (!current || !window.confirm(`Block ${peerName}? You won’t see each other’s Letters, posts or profile.`)) return;
    await run(async () => {
      await blockPerson(current.peer_id, current.peer_name ?? undefined);
      setActive(null);
      await refreshThreads();
    }, `${peerName} is blocked.`);
  }

  async function onDelete() {
    if (!current || !window.confirm("Delete this conversation for you? The other person still has their copy.")) return;
    await run(async () => {
      await hideThread(current.id);
      setActive(null);
      await refreshThreads();
    }, "Conversation deleted for you.");
  }

  async function onSubmitReport() {
    if (!active || !reason || !report) return;
    const target = report;
    setReport(null);
    await run(() => reportLetter({ conversationId: active, messageId: target.messageId, reason, note }), "Thanks. We’ll take a look.");
    setReason(null);
    setNote("");
  }

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="font-display text-3xl text-ink-900">Letters</h1>
        <p className="mt-1 text-sm text-ink-500">Private, one-to-one, with your friends.</p>
        {notice && (
          <p role="status" className="mt-3 rounded-2xl bg-cream-100 px-4 py-2 text-sm text-ink-700">
            {notice}
          </p>
        )}
      </div>

      <div className="grid min-h-[28rem] overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-card lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="border-b border-ink-100 lg:border-b-0 lg:border-r">
          <div className="flex gap-1 border-b border-ink-100 p-2" role="tablist">
            {(["letters", "requests"] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tray === t}
                onClick={() => setTray(t)}
                className={"flex-1 rounded-full px-3 py-1.5 text-xs font-medium " + (tray === t ? "bg-ink-900 text-cream-50" : "text-ink-600 hover:bg-cream-100")}
              >
                {t === "letters" ? "Letters" : `Requests${requestCount ? ` (${requestCount})` : ""}`}
              </button>
            ))}
          </div>
          {shown.length === 0 ? (
            <p className="px-4 py-6 text-sm text-ink-500">
              {tray === "letters" ? "No Letters yet. Open a friend’s profile to write one." : "No requests. Only friends of friends can send one, and only if you allow it in Settings."}
            </p>
          ) : (
            shown.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActive(t.id)}
                className={"flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-cream-50 " + (active === t.id ? "bg-cream-100" : "")}
              >
                <Avatar name={t.peer_name || t.peer_handle || "?"} src={t.peer_photo} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-ink-900">{t.peer_name || t.peer_handle}</p>
                    {t.muted && <BellOff className="h-3.5 w-3.5 text-ink-400" {...icon} />}
                    <span className="ml-auto text-[11px] text-ink-400">{when(t.last_at)}</span>
                  </div>
                  <p className="truncate text-xs text-ink-500">{t.last_body ?? "Say hi"}</p>
                </div>
              </button>
            ))
          )}
        </div>

        {!current ? (
          <EmptyState
            icon={<MessageCircle className="h-10 w-10" {...icon} />}
            title="Pick a conversation"
            description="Letters are only between you and one friend."
            actionLabel="Browse people"
            actionHref="/people"
          />
        ) : (
          <div className="flex flex-col">
            <div className="relative flex items-center gap-3 border-b border-ink-100 px-4 py-3">
              <Avatar name={peerName} src={current.peer_photo} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-ink-900">{peerName}</p>
                <p className="text-xs text-ink-400">{current.is_request ? "Letter request" : "One-to-one · private"}</p>
              </div>
              <button type="button" aria-label="Conversation options" onClick={() => setMenu((m) => !m)} className="rounded-full p-2 text-ink-500 hover:bg-cream-100">
                <MoreHorizontal className="h-5 w-5" {...icon} />
              </button>
              {menu && (
                <div role="menu" className="absolute right-3 top-12 z-10 w-56 rounded-2xl border border-ink-100 bg-white p-1 text-sm shadow-card">
                  <MenuItem onClick={() => { setMenu(false); setReport({}); }} icon={<Flag className="h-4 w-4" {...icon} />}>Report conversation</MenuItem>
                  <MenuItem onClick={() => void onBlock()} icon={<Ban className="h-4 w-4" {...icon} />}>Block {peerName}</MenuItem>
                  <MenuItem onClick={() => void run(async () => { await muteThread(current.id, !current.muted); await refreshThreads(); })} icon={<BellOff className="h-4 w-4" {...icon} />}>
                    {current.muted ? "Unmute" : "Mute"}
                  </MenuItem>
                  <MenuItem onClick={() => void onDelete()} icon={<Trash2 className="h-4 w-4" {...icon} />}>Delete for me</MenuItem>
                </div>
              )}
            </div>

            {risky && (
              <div role="note" className="mx-4 mt-3 flex items-start gap-2.5 rounded-2xl border border-ember-200 bg-cream-50 px-4 py-3 text-sm text-ink-700">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-ember-600" {...icon} />
                <p className="flex-1">
                  This Letter mentions money, gift cards or a phone number. Hearth will never ask you to pay, and people you only know online may not be who they say.
                </p>
                <button type="button" onClick={dismissBanner} className="text-xs font-medium text-ember-700">
                  Got it
                </button>
              </div>
            )}

            <ol className="flex-1 space-y-3 overflow-y-auto p-4">
              {letters.map((l) => (
                <li key={l.id} className={"group flex items-end gap-2 " + (l.mine ? "flex-row-reverse" : "")}>
                  <div
                    className={
                      "max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-sm " +
                      (l.mine ? "rounded-tr-md bg-hearth text-white" : "rounded-tl-md bg-cream-100 text-ink-800")
                    }
                  >
                    {l.body}
                    <span className={"mt-1 block text-[10px] " + (l.mine ? "text-cream-100" : "text-ink-400")}>{when(l.created_at)}</span>
                  </div>
                  <div className="flex gap-1 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                    {l.mine ? (
                      <button
                        type="button"
                        aria-label="Unsend"
                        title="Unsend for both of you"
                        onClick={() => void run(async () => { await unsendLetter(l.id); await refreshLetters(current.id); })}
                        className="rounded-full p-1.5 text-ink-400 hover:bg-cream-100"
                      >
                        <Undo2 className="h-4 w-4" {...icon} />
                      </button>
                    ) : (
                      <button type="button" aria-label="Report this Letter" onClick={() => setReport({ messageId: l.id })} className="rounded-full p-1.5 text-ink-400 hover:bg-cream-100">
                        <Flag className="h-4 w-4" {...icon} />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ol>

            {current.is_request && !current.started_by_me && (
              <div className="flex items-center gap-2 border-t border-ink-100 px-4 py-2 text-xs text-ink-600">
                <MailOpen className="h-4 w-4" {...icon} />
                <span className="flex-1">Reply to accept. They can’t see that you’ve read this.</span>
                <button type="button" onClick={() => void onDelete()} className="font-medium text-ember-700">
                  Decline
                </button>
              </div>
            )}

            <form className="flex gap-2 border-t border-ink-100 p-3" onSubmit={(e) => void onSend(e)}>
              <label className="sr-only" htmlFor="letter-draft">
                Write a Letter
              </label>
              <textarea
                id="letter-draft"
                rows={1}
                maxLength={2000}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={`Write to ${peerName}`}
                className="min-h-[44px] flex-1 resize-none rounded-2xl border-ink-200 bg-cream-50 px-4 py-3 text-sm text-ink-900 placeholder:text-ink-400"
              />
              <button type="submit" disabled={!draft.trim()} className="rounded-full bg-ink-900 px-4 text-sm font-medium text-cream-50 disabled:opacity-40">
                Send
              </button>
            </form>
          </div>
        )}
      </div>

      {report && (
        <div role="dialog" aria-modal="true" aria-label="Report" className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/40 p-4 sm:items-center">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-card">
            <h2 className="font-display text-xl text-ink-900">{report.messageId ? "Report this Letter" : "Report conversation"}</h2>
            <p className="mt-1 text-xs text-ink-500">We keep a copy of the text for review, even if it’s unsent. They won’t know who reported.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className={"rounded-full border px-3 py-1.5 text-xs " + (reason === r ? "border-ink-900 bg-ink-900 text-cream-50" : "border-ink-200 text-ink-700")}
                >
                  {r}
                </button>
              ))}
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={1000}
              placeholder="Anything else (optional)"
              className="mt-3 w-full rounded-2xl border-ink-200 bg-cream-50 px-3 py-2 text-sm"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setReport(null)} className="rounded-full px-4 py-2 text-sm text-ink-600">
                Cancel
              </button>
              <button type="button" disabled={!reason} onClick={() => void onSubmitReport()} className="rounded-full bg-ink-900 px-4 py-2 text-sm font-medium text-cream-50 disabled:opacity-40">
                Send report
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function MenuItem({ onClick, icon, children }: { onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button type="button" role="menuitem" onClick={onClick} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-ink-800 hover:bg-cream-100">
      {icon}
      {children}
    </button>
  );
}
