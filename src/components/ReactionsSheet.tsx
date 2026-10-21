"use client";

import { useEffect, useMemo } from "react";
import { X } from "lucide-react";
import { Person, PostReaction } from "@/data/seed";
import { Avatar } from "./Avatar";
import { ReactionIcon } from "./icons/reactions";
import { REACTION_LABEL, type ReactionKind } from "@/lib/reactionKinds";

type ReactionsSheetProps = {
  open: boolean;
  onClose: () => void;
  reactions: PostReaction[];
  peopleById: (id: string) => Person | undefined;
};

const MAX_VISIBLE = 20;

export function ReactionsSheet({
  open,
  onClose,
  reactions,
  peopleById,
}: ReactionsSheetProps) {
  const visible = useMemo(() => reactions.slice(0, MAX_VISIBLE), [reactions]);

  const groups = useMemo(() => {
    const map = new Map<ReactionKind, PostReaction[]>();
    for (const reaction of visible) {
      const list = map.get(reaction.kind) ?? [];
      list.push(reaction);
      map.set(reaction.kind, list);
    }
    return Array.from(map.entries());
  }, [visible]);

  const multiType = groups.length > 1;
  const personFor = (r: PostReaction): Person | undefined =>
    peopleById(r.personId) ?? (r.name ? { id: r.personId, name: r.name, handle: "", bio: "", mutuals: 0 } : undefined);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/30 p-0 sm:items-center sm:p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reactions-sheet-title"
        className="flex max-h-[80vh] w-full flex-col overflow-hidden rounded-t-3xl border border-ink-100 bg-cream-50 shadow-soft sm:max-w-md sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-ink-100/80 px-5 py-4">
          <h2 id="reactions-sheet-title" className="font-display text-xl text-ink-900">
            Reactions
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded-full p-1.5 text-ink-400 hover:bg-cream-200 hover:text-ink-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-2 py-2">
          {visible.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-ink-400">No reactions yet</p>
          ) : multiType ? (
            groups.map(([kind, list]) => (
              <div key={kind} className="mb-2">
                <p className="flex items-center px-4 py-2 text-xs font-medium uppercase tracking-wide text-ink-400">
                  <ReactionIcon kind={kind} className="mr-1.5 h-4 w-4 text-amber-600" />
                  {REACTION_LABEL[kind]} · {list.length}
                </p>
                <ul>
                  {list.map((reaction) => (
                    <ReactorRow
                      key={`${reaction.kind}-${reaction.personId}`}
                      person={personFor(reaction)}
                      kind={reaction.kind}
                      showEmoji
                    />
                  ))}
                </ul>
              </div>
            ))
          ) : (
            <>
              <p className="px-4 py-2 text-xs font-medium text-ink-400">
                <span className="inline-flex items-center">
                  <ReactionIcon kind={groups[0][0]} className="mr-1.5 h-4 w-4 text-amber-600" />
                  {REACTION_LABEL[groups[0][0]]} · {groups[0][1].length}
                </span>
              </p>
              <ul>
                {groups[0][1].map((reaction) => (
                  <ReactorRow
                    key={`${reaction.kind}-${reaction.personId}`}
                    person={personFor(reaction)}
                    kind={reaction.kind}
                  />
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ReactorRow({
  person,
  kind,
  showEmoji = false,
}: {
  person: Person | undefined;
  kind: ReactionKind;
  showEmoji?: boolean;
}) {
  if (!person) return null;
  return (
    <li className="flex items-center gap-3 rounded-2xl px-3 py-2.5">
      <Avatar name={person.name} online={person.online} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-ink-900">{person.name}</p>
        {person.handle && <p className="truncate text-xs text-ink-400">@{person.handle}</p>}
      </div>
      {showEmoji && (
        <ReactionIcon kind={kind} className="h-5 w-5 text-amber-600" />
      )}
    </li>
  );
}
