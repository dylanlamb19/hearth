"use client";

import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Avatar } from "@/components/Avatar";
import { EmptyState } from "@/components/EmptyState";
import { conversations, personById } from "@/data/seed";

export default function MessagesPage() {
  const [active, setActive] = useState<string | undefined>(conversations[0]?.id);
  // A thread started from Marketplace with a seller who has no conversation yet.
  const [draftPeerId, setDraftPeerId] = useState<string | null>(null);
  const [reply, setReply] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const withId = params.get("with");
    const about = params.get("about");
    if (!withId || !personById(withId)) return;
    const existing = conversations.find((c) => c.peerId === withId);
    if (existing) {
      setActive(existing.id);
      setDraftPeerId(null);
    } else {
      setActive(undefined);
      setDraftPeerId(withId);
    }
    if (about) setReply(`About: ${about} `);
  }, []);

  const current = draftPeerId ? undefined : conversations.find((c) => c.id === active);
  const peer = draftPeerId ? personById(draftPeerId) : current ? personById(current.peerId) : null;

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="font-display text-3xl text-ink-900">Messages</h1>
        <p className="mt-1 text-sm text-ink-500">One conversation at a time. No rooms.</p>
      </div>

      {conversations.length === 0 ? (
        <EmptyState
          icon={<MessageCircle className="h-10 w-10" />}
          title="No conversations yet"
          description="Browse people on Hearth and say hi."
          actionLabel="Browse people"
          actionHref="/people"
        />
      ) : (
        <div className="grid min-h-[28rem] overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-card lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="border-b border-ink-100 lg:border-b-0 lg:border-r">
            {draftPeerId && peer && (
              <div className="flex w-full items-center gap-3 bg-cream-100 px-4 py-3 text-left">
                <Avatar name={peer.name} online={peer.online} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink-900">{peer.name}</p>
                  <p className="truncate text-xs text-ink-500">New conversation</p>
                </div>
              </div>
            )}
            {conversations.map((c) => {
              const p = personById(c.peerId);
              if (!p) return null;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setActive(c.id);
                    setDraftPeerId(null);
                  }}
                  className={"flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-cream-50 " + (!draftPeerId && active === c.id ? "bg-cream-100" : "")}
                >
                  <Avatar name={p.name} online={p.online} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium text-ink-900">{p.name}</p>
                      <span className="text-[11px] text-ink-400">{c.updatedAt}</span>
                    </div>
                    <p className="truncate text-xs text-ink-500">{c.preview}</p>
                  </div>
                  {c.unread > 0 && <span className="h-2 w-2 rounded-full bg-ember-500" />}
                </button>
              );
            })}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-3 border-b border-ink-100 px-4 py-3">
              {peer && <Avatar name={peer.name} size="sm" online={peer.online} />}
              <div>
                <p className="font-medium text-ink-900">{peer?.name}</p>
                <p className="text-xs text-ink-400">One-to-one · private</p>
              </div>
            </div>
            {current ? (
              <div className="flex-1 space-y-3 p-4">
                <div className="max-w-[80%] rounded-2xl rounded-tl-md bg-cream-100 px-4 py-3 text-sm text-ink-800">
                  {current.preview}
                </div>
                <div className="ml-auto max-w-[80%] rounded-2xl rounded-tr-md bg-hearth px-4 py-3 text-sm text-white">
                  Sounds good — see you soon.
                </div>
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-ink-400">
                {peer ? `Say hi to ${peer.name.split(" ")[0]} — no rush.` : "Pick a conversation."}
              </div>
            )}
            <form className="border-t border-ink-100 p-3" onSubmit={(e) => e.preventDefault()}>
              <input
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Write a quiet reply…"
                className="w-full rounded-full border-ink-200 bg-cream-50 px-4 py-3 text-sm focus:border-ember-400 focus:ring-ember-300"
              />
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
