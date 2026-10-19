"use client";

import { useState, useTransition, type FormEvent } from "react";
import Avatar from "@/components/Avatar";
import { resizeImage, type ResizedImage } from "@/components/social/resizeImage";
import { updateProfileAction } from "@/lib/social-actions";

const AVATAR_COLORS = ["#d4af37", "#f5d77a", "#cd7f32", "#c0c0c0", "#9fd8e8", "#7df9ff", "#b57edc", "#ef5350", "#4caf50", "#ff8a3d"];

type Props = {
  displayName: string;
  bio: string;
  color: string;
  mediaId: number | null;
  onDone: () => void;
};

export default function EditProfile({ displayName, bio, color, mediaId, onDone }: Props) {
  const [photo, setPhoto] = useState<ResizedImage | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [pickedColor, setPickedColor] = useState(color);
  const [name, setName] = useState(displayName);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const colors = AVATAR_COLORS.includes(color.toLowerCase()) ? AVATAR_COLORS : [color, ...AVATAR_COLORS];

  async function pick(file: File | undefined) {
    if (!file) return;
    try {
      setPhoto(await resizeImage(file, 400, true));
      setRemovePhoto(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't use that image.");
    }
  }

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.delete("avatar_file");
    if (photo) fd.set("avatar", photo.blob, "avatar.jpg");
    if (removePhoto) fd.set("remove_avatar", "1");
    startTransition(async () => {
      const res = await updateProfileAction(fd);
      if (res.ok) onDone();
      else setError(res.error);
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center gap-4">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo.url} alt="" className="h-20 w-20 rounded-full object-cover" />
        ) : (
          <Avatar name={name || "?"} color={pickedColor} mediaId={removePhoto ? null : mediaId} size={80} />
        )}
        <div className="flex flex-wrap gap-2">
          <input
            type="file"
            name="avatar_file"
            accept="image/*"
            className="sr-only"
            id="avatar-file"
            onChange={(e) => pick(e.target.files?.[0])}
          />
          <label
            htmlFor="avatar-file"
            className="cursor-pointer rounded-full border border-border px-4 py-2 text-sm font-semibold hover:border-gold/60"
          >
            Upload photo
          </label>
          {(photo || (mediaId != null && !removePhoto)) && (
            <button
              type="button"
              onClick={() => {
                setPhoto(null);
                setRemovePhoto(true);
              }}
              className="rounded-full px-3 py-2 text-sm text-muted hover:text-danger"
            >
              Remove
            </button>
          )}
        </div>
      </div>

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted">Display name</span>
        <input
          name="display_name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          required
          className="mt-1 w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-base outline-none focus:border-gold"
        />
      </label>
      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted">Bio</span>
        <textarea
          name="bio"
          defaultValue={bio}
          maxLength={160}
          rows={3}
          placeholder="Tell them why you're richer than them."
          className="mt-1 w-full resize-none rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-base outline-none focus:border-gold"
        />
      </label>
      <fieldset>
        <legend className="text-xs font-semibold uppercase tracking-wider text-muted">Profile color</legend>
        <div className="mt-2 flex flex-wrap gap-2.5">
          {colors.map((c) => (
            <label key={c} className="cursor-pointer">
              <input
                type="radio"
                name="avatar_color"
                value={c}
                checked={c.toLowerCase() === pickedColor.toLowerCase()}
                onChange={() => setPickedColor(c)}
                className="peer sr-only"
              />
              <span
                className="block h-9 w-9 rounded-full ring-2 ring-transparent ring-offset-2 ring-offset-surface transition peer-checked:ring-gold-bright peer-focus-visible:ring-foreground"
                style={{ background: c }}
                aria-label={c}
              />
            </label>
          ))}
        </div>
      </fieldset>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onDone}
          className="flex-1 rounded-full border border-border py-2.5 text-sm font-semibold hover:border-foreground/40"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded-full bg-gold py-2.5 text-sm font-bold text-black transition hover:bg-gold-bright disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
