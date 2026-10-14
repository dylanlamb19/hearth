"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "./Button";
import { useAuth } from "./AuthProvider";
import { ProfileIdentityFields, identityValidation, type IdentityValues } from "./ProfileIdentityFields";

/** Edit profile — the same photo/handle/bio form as welcome, in a cream sheet. */
export function EditProfileSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, updateUser } = useAuth();
  const [values, setValues] = useState<IdentityValues>({ name: "", handle: "", photoUrl: "", bio: "" });

  useEffect(() => {
    if (!open || !user) return;
    setValues({ name: user.name, handle: user.handle, photoUrl: user.photoUrl ?? "", bio: user.bio ?? "" });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, user, onClose]);

  if (!open || !user) return null;
  const { effectiveHandle, handleInvalid } = identityValidation(values.handle, user.id);

  function save() {
    if (handleInvalid) return;
    updateUser({
      name: values.name.trim() || user!.name,
      handle: effectiveHandle,
      photoUrl: values.photoUrl.trim() || undefined,
      bio: values.bio.trim() || undefined,
    });
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/30 sm:items-center sm:p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-profile-title"
        className="max-h-[90dvh] w-full overflow-y-auto rounded-t-3xl border border-ink-100 bg-cream-50 px-5 py-5 shadow-soft sm:max-w-md sm:rounded-3xl sm:px-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="edit-profile-title" className="font-display text-xl text-ink-900">
            Edit profile
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
        <ProfileIdentityFields
          selfId={user.id}
          values={values}
          onChange={setValues}
          idPrefix="edit-profile"
        />
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={handleInvalid} onClick={save}>
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
