"use client";

import { useJustBlocked } from "@/lib/blockedNow";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "./Avatar";
import { Button } from "./Button";
import { ReportMenu } from "./ReportMenu";
import { useAuth } from "./AuthProvider";
import { addComment, deleteComment, listComments, toggleCommentLove, type Comment } from "@/lib/social";
import { getReportedIds } from "@/lib/reported";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

const REPLIES_SHOWN = 2;
const PENDING = "pending-";

/**
 * Comments under a Moment (Glow's threaded replies): a cream-50 panel, one level of replies
 * indented 40px with a thin cream-200 line to the parent. Under each comment: time · Love · Reply.
 * Reply opens an inline box under the comment ("Reply to Maya…"); Enter sends, optimistic with
 * a faint "Sending…". Removing a comment that has replies leaves "This comment was removed.".
 */
export function CommentsSection({
  momentId,
  momentAuthorId,
  onCount,
}: {
  momentId: string;
  momentAuthorId: string;
  onCount?: (n: number) => void;
}) {
  const { user } = useAuth();
  const justBlocked = useJustBlocked();
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [draft, setDraft] = useState("");
  // Inline reply box: which top-level comment it sits under, and whose name is in the placeholder.
  const [replyBox, setReplyBox] = useState<{ parentId: string; name: string; openerId: string } | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const replyInput = useRef<HTMLTextAreaElement | null>(null);
  // Reply buttons by comment id, so Esc/Cancel can hand focus back to the one that opened the box.
  const replyButtons = useRef(new Map<string, HTMLButtonElement>());

  function closeReply() {
    const opener = replyBox?.openerId;
    setReplyBox(null);
    if (opener) requestAnimationFrame(() => replyButtons.current.get(opener)?.focus());
  }

  useEffect(() => {
    let cancelled = false;
    listComments(momentId)
      .then((list) => {
        if (cancelled) return;
        const reported = new Set(getReportedIds());
        setComments(list.filter((c) => !reported.has(c.id)));
      })
      .catch(() => !cancelled && setError("Couldn’t load comments."));
    return () => {
      cancelled = true;
    };
  }, [momentId]);

  useEffect(() => {
    if (comments) onCount?.(comments.filter((c) => !c.deleted && !c.id.startsWith(PENDING)).length);
  }, [comments, onCount]);

  useEffect(() => {
    if (replyBox) replyInput.current?.focus();
  }, [replyBox]);

  /** Optimistic post: shows right away with "Sending…", replaced by the saved comment. */
  async function post(text: string, parentId: string | null): Promise<boolean> {
    if (!user || !text.trim()) return false;
    setError(null);
    const tempId = `${PENDING}${Date.now()}`;
    const temp: Comment = {
      id: tempId,
      momentId,
      parentId,
      authorId: user.id,
      authorName: user.name,
      body: text.trim(),
      deleted: false,
      createdAt: new Date().toISOString(),
      loveCount: 0,
      lovedByMe: false,
    };
    setComments((prev) => [...(prev ?? []), temp]);
    if (parentId) setExpanded((prev) => ({ ...prev, [parentId]: prev[parentId] ?? false }));
    try {
      const saved = await addComment(momentId, text, { id: user.id, name: user.name }, parentId);
      setComments((prev) => (prev ?? []).map((c) => (c.id === tempId ? saved : c)));
      return true;
    } catch (e) {
      setComments((prev) => (prev ?? []).filter((c) => c.id !== tempId));
      setError((e as Error).message);
      return false;
    }
  }

  async function submitTop() {
    const text = draft;
    if (!text.trim()) return;
    setDraft("");
    if (!(await post(text, null))) setDraft(text);
  }

  async function submitReply() {
    if (!replyBox) return;
    const text = replyDraft;
    if (!text.trim()) return;
    const box = replyBox;
    setReplyDraft("");
    setReplyBox(null);
    if (!(await post(text, box.parentId))) {
      setReplyBox(box);
      setReplyDraft(text);
    }
  }

  /** Reply to a comment or to a reply: replies stay one level, under the top-level comment. */
  function openReply(c: Comment) {
    const parentId = c.parentId ?? c.id;
    setReplyBox({ parentId, name: c.authorName || "Hearth member", openerId: c.id });
    setReplyDraft("");
  }

  async function love(c: Comment) {
    const flip = (x: Comment): Comment =>
      x.id === c.id ? { ...x, lovedByMe: !c.lovedByMe, loveCount: Math.max(0, c.loveCount + (c.lovedByMe ? -1 : 1)) } : x;
    setComments((prev) => (prev ?? []).map(flip));
    try {
      const now = await toggleCommentLove(c);
      if (now === c.lovedByMe) setComments((prev) => (prev ?? []).map((x) => (x.id === c.id ? c : x)));
    } catch (e) {
      setComments((prev) => (prev ?? []).map((x) => (x.id === c.id ? c : x)));
      setError((e as Error).message);
    }
  }

  /** Placeholder if it has visible replies, otherwise gone. */
  function applyRemoval(list: Comment[], c: Comment): Comment[] {
    const hasReplies = list.some((r) => r.parentId === c.id && !r.deleted);
    if (!hasReplies) return list.filter((x) => x.id !== c.id);
    return list.map((x) =>
      x.id === c.id ? { ...x, deleted: true, body: null, authorId: null, authorName: null, loveCount: 0, lovedByMe: false } : x,
    );
  }

  async function remove(c: Comment) {
    setComments((prev) => applyRemoval(prev ?? [], c));
    try {
      await deleteComment(c);
    } catch (e) {
      // Put back only this comment, where it was.
      setComments((prev) => {
        const list = (prev ?? []).filter((x) => x.id !== c.id);
        list.push(c);
        return list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      });
      setError((e as Error).message);
    }
  }

  function hide(id: string) {
    setComments((prev) => {
      const list = prev ?? [];
      const c = list.find((x) => x.id === id);
      return c ? applyRemoval(list, c) : list;
    });
  }

  const all = (comments ?? []).filter((c) => !c.authorId || !justBlocked.gone.has(c.authorId));
  const tops = all.filter((c) => !c.parentId);
  const repliesOf = (id: string) => all.filter((c) => c.parentId === id);

  function row(c: Comment, isReply: boolean) {
    if (c.deleted) {
      return <p className="py-1 text-sm italic text-ink-400">This comment was removed.</p>;
    }
    const pending = c.id.startsWith(PENDING);
    const isMine = Boolean(user && c.authorId === user.id);
    const canDelete = Boolean(user && (isMine || momentAuthorId === user.id));
    return (
      <div
        className={cn(
          "flex items-start gap-2 transition-opacity duration-300",
          pending && "opacity-60",
          c.authorId && justBlocked.fading.has(c.authorId) && "opacity-0",
        )}
      >
        <Avatar name={c.authorName || "Hearth member"} size={isReply ? "xs" : "sm"} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ink-900">{c.authorName}</p>
          <p className="whitespace-pre-wrap break-words text-sm text-ink-700">{c.body}</p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-500">
            {pending ? (
              <span>Sending…</span>
            ) : (
              <>
                <span>{timeAgo(c.createdAt)}</span>
                {user && (
                  <>
                    <span aria-hidden>·</span>
                    <button
                      type="button"
                      onClick={() => void love(c)}
                      aria-pressed={c.lovedByMe}
                      className={cn("hover:text-ink-800", c.lovedByMe && "font-medium text-ember-glow")}
                    >
                      Love{c.loveCount > 0 ? ` ${c.loveCount}` : ""}
                    </button>
                    <span aria-hidden>·</span>
                    <button
                      type="button"
                      ref={(el) => {
                        if (el) replyButtons.current.set(c.id, el);
                        else replyButtons.current.delete(c.id);
                      }}
                      onClick={() => openReply(c)}
                      className="hover:text-ink-800"
                    >
                      Reply
                    </button>
                  </>
                )}
                {!user && c.loveCount > 0 && (
                  <>
                    <span aria-hidden>·</span>
                    <span>Love {c.loveCount}</span>
                  </>
                )}
              </>
            )}
          </p>
        </div>
        {!pending &&
          (isMine ? (
            <button
              type="button"
              onClick={() => void remove(c)}
              className="rounded-full px-2 py-1 text-xs text-ink-400 hover:bg-cream-100 hover:text-ink-700"
            >
              Delete
            </button>
          ) : (
            <ReportMenu
              subject={`${c.authorName}’s comment`}
              subjectId={c.authorId ?? undefined}
              itemId={c.id}
              parentMomentId={momentId}
              onReported={hide}
              onDelete={canDelete ? () => void remove(c) : undefined}
            />
          ))}
      </div>
    );
  }

  function replyComposer(parentId: string) {
    if (!user || replyBox?.parentId !== parentId) return null;
    return (
      <form
        className="mt-2 flex items-start gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void submitReply();
        }}
      >
        <Avatar name={user.name} size="xs" />
        <textarea
          ref={replyInput}
          value={replyDraft}
          rows={1}
          maxLength={1000}
          onChange={(e) => setReplyDraft(e.target.value)}
          onKeyDown={(e) => {
            // IME composition (Japanese, Chinese, …): Enter confirms the character, not the reply.
            if (e.nativeEvent.isComposing || e.keyCode === 229) return;
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void submitReply();
            } else if (e.key === "Escape") {
              closeReply();
            }
          }}
          placeholder={`Reply to ${replyBox.name}…`}
          aria-label={`Reply to ${replyBox.name}`}
          className="min-w-0 flex-1 resize-none rounded-2xl border-0 bg-white px-3 py-1.5 text-sm ring-1 ring-cream-200 placeholder:text-ink-400 focus:ring-2 focus:ring-ember-300"
        />
        <button
          type="button"
          onClick={closeReply}
          className="px-1 py-1.5 text-xs text-ink-400 hover:text-ink-700"
        >
          Cancel
        </button>
      </form>
    );
  }

  return (
    <div className="mt-3 rounded-2xl bg-cream-50 p-3">
      {comments === null && !error && <p className="text-xs text-ink-400">Loading comments…</p>}
      <ul className="space-y-3">
        {tops.map((c) => {
          const replies = repliesOf(c.id);
          // Newest 2 by default (still shown oldest-first); the rest behind a text link.
          const hiddenCount = expanded[c.id] ? 0 : Math.max(0, replies.length - REPLIES_SHOWN);
          const shown = replies.slice(hiddenCount);
          const composer = replyComposer(c.id);
          return (
            <li key={c.id}>
              {row(c, false)}
              {(shown.length > 0 || hiddenCount > 0 || composer) && (
                <div className="ml-10 mt-2 border-l border-cream-200 pl-3">
                  {hiddenCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setExpanded((prev) => ({ ...prev, [c.id]: true }))}
                      className="mb-2 text-xs text-ink-500 underline-offset-2 hover:text-ink-800 hover:underline"
                    >
                      View {hiddenCount} more {hiddenCount === 1 ? "reply" : "replies"}
                    </button>
                  )}
                  <ul className="space-y-2">
                    {shown.map((r) => (
                      <li key={r.id}>{row(r, true)}</li>
                    ))}
                  </ul>
                  {composer}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {error && <p className="mt-2 text-xs text-ember-700">{error}</p>}
      {user && (
        <form
          className="mt-3 flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void submitTop();
          }}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={1000}
            placeholder="Write a comment"
            aria-label="Write a comment"
            className="min-w-0 flex-1 rounded-full border-0 bg-white px-4 py-2 text-sm ring-1 ring-cream-200 placeholder:text-ink-400 focus:ring-2 focus:ring-ember-300"
          />
          <Button type="submit" className="!px-4 !py-2 text-xs" disabled={!draft.trim()}>
            Post
          </Button>
        </form>
      )}
    </div>
  );
}
