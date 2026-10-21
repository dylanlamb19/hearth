"use client";

import { useEffect, useState } from "react";
import { Avatar } from "./Avatar";
import { Button } from "./Button";
import { ReportMenu } from "./ReportMenu";
import { useAuth } from "./AuthProvider";
import { addComment, deleteComment, listComments, type Comment } from "@/lib/social";
import { getReportedIds } from "@/lib/reported";
import { timeAgo } from "@/lib/format";

/**
 * Comments under a Moment: one level of replies, Report/Delete from each comment.
 * Removing a comment that has replies leaves "This comment was removed." in its place.
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
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (comments) onCount?.(comments.filter((c) => !c.deleted).length);
  }, [comments, onCount]);

  async function submit() {
    if (!user || !draft.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const c = await addComment(momentId, draft, { id: user.id, name: user.name }, replyTo?.id ?? null);
      setComments((prev) => [...(prev ?? []), c]);
      setDraft("");
      setReplyTo(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  /** Placeholder if it has visible replies, otherwise gone. */
  function applyRemoval(list: Comment[], c: Comment): Comment[] {
    const hasReplies = list.some((r) => r.parentId === c.id && !r.deleted);
    if (!hasReplies) return list.filter((x) => x.id !== c.id);
    return list.map((x) => (x.id === c.id ? { ...x, deleted: true, body: null, authorId: null, authorName: null } : x));
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

  const all = comments ?? [];
  const tops = all.filter((c) => !c.parentId);
  const repliesOf = (id: string) => all.filter((c) => c.parentId === id);

  function row(c: Comment, isReply: boolean) {
    if (c.deleted) {
      return (
        <p className="rounded-2xl bg-cream-50 px-3 py-2 text-sm italic text-ink-400">This comment was removed.</p>
      );
    }
    const isMine = Boolean(user && c.authorId === user.id);
    const canDelete = Boolean(user && (isMine || momentAuthorId === user.id));
    return (
      <div className="flex items-start gap-2">
        <Avatar name={c.authorName || "Hearth member"} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="rounded-2xl bg-cream-50 px-3 py-2">
            <p className="text-xs text-ink-500">
              <span className="font-medium text-ink-800">{c.authorName}</span> · {timeAgo(c.createdAt)}
            </p>
            <p className="whitespace-pre-wrap break-words text-sm text-ink-700">{c.body}</p>
          </div>
          {!isReply && user && (
            <button
              type="button"
              onClick={() => setReplyTo(c)}
              className="ml-3 mt-1 text-xs text-ink-400 hover:text-ink-700"
            >
              Reply
            </button>
          )}
        </div>
        {isMine ? (
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
        )}
      </div>
    );
  }

  return (
    <div className="mt-3 border-t border-ink-100 pt-3">
      {comments === null && !error && <p className="text-xs text-ink-400">Loading comments…</p>}
      <ul className="space-y-3">
        {tops.map((c) => (
          <li key={c.id}>
            {row(c, false)}
            {repliesOf(c.id).length > 0 && (
              <ul className="ml-10 mt-2 space-y-2">
                {repliesOf(c.id).map((r) => (
                  <li key={r.id}>{row(r, true)}</li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
      {error && <p className="mt-2 text-xs text-ember-700">{error}</p>}
      {user && (
        <form
          className="mt-3"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          {replyTo && (
            <p className="mb-1 text-xs text-ink-500">
              Replying to {replyTo.authorName}{" "}
              <button type="button" onClick={() => setReplyTo(null)} className="underline underline-offset-2">
                Cancel
              </button>
            </p>
          )}
          <div className="flex items-center gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={1000}
              placeholder={replyTo ? "Write a reply" : "Write a comment"}
              aria-label={replyTo ? "Write a reply" : "Write a comment"}
              className="min-w-0 flex-1 rounded-full border-0 bg-cream-50 px-4 py-2 text-sm ring-1 ring-ink-100 placeholder:text-ink-400 focus:ring-2 focus:ring-ember-300"
            />
            <Button type="submit" className="!px-4 !py-2 text-xs" disabled={!draft.trim() || busy}>
              Post
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
