"use client";

import Link from "next/link";
import { useRef, useState, useTransition, type FormEvent } from "react";
import Avatar from "@/components/Avatar";
import Icon from "@/components/Icon";
import { MAX_POST_LENGTH } from "@/lib/format";
import { createPostAction } from "@/lib/social-actions";
import { resizeImage, type ResizedImage } from "./resizeImage";

type Props = {
  name: string;
  color: string;
  mediaId: number | null;
  placeholder?: string;
};

export default function Composer({ name, color, mediaId, placeholder = "What are you flexing today?" }: Props) {
  const [body, setBody] = useState("");
  const [image, setImage] = useState<ResizedImage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const trimmed = body.trim();
  const remaining = MAX_POST_LENGTH - body.length;
  const canPost = (trimmed.length > 0 || image) && !isPending;

  async function pickImage(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      if (image) URL.revokeObjectURL(image.url);
      setImage(await resizeImage(file, 1440));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't use that image.");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function clearImage() {
    if (image) URL.revokeObjectURL(image.url);
    setImage(null);
  }

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canPost) return;
    const fd = new FormData();
    fd.set("body", body);
    if (image) {
      fd.set("image", image.blob, "photo.jpg");
      fd.set("width", String(image.width));
      fd.set("height", String(image.height));
    }
    startTransition(async () => {
      const res = await createPostAction(fd);
      if (res.ok) {
        setBody("");
        clearImage();
        setError(null);
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex gap-3">
        <Avatar name={name} color={color} mediaId={mediaId} size={44} />
        <div className="min-w-0 flex-1">
          <label htmlFor="composer" className="sr-only">
            New post
          </label>
          <textarea
            id="composer"
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, MAX_POST_LENGTH))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) e.currentTarget.form?.requestSubmit();
            }}
            maxLength={MAX_POST_LENGTH}
            rows={body.length > 80 || image ? 3 : 2}
            placeholder={placeholder}
            className="w-full resize-none bg-transparent pt-2 text-[16px] text-foreground placeholder:text-muted/70 focus:outline-none"
          />

          {image && (
            <div className="relative mt-2 overflow-hidden rounded-xl border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.url} alt="Selected photo" className="max-h-80 w-full object-cover" />
              <button
                type="button"
                onClick={clearImage}
                aria-label="Remove photo"
                className="absolute right-2 top-2 rounded-full bg-black/70 p-1.5 text-white backdrop-blur hover:bg-black"
              >
                <Icon name="close" className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="mt-2 flex items-center gap-2 border-t border-border pt-3">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="sr-only"
              id="composer-image"
              onChange={(e) => pickImage(e.target.files?.[0])}
            />
            <label
              htmlFor="composer-image"
              title="Add photo"
              className="cursor-pointer rounded-full p-2 text-gold transition hover:bg-gold/10"
            >
              <Icon name="image" />
              <span className="sr-only">Add photo</span>
            </label>
            <Link
              href="/store"
              className="whitespace-nowrap rounded-full border border-gold/40 px-3 py-1.5 text-xs font-bold text-gold transition hover:bg-gold/10"
            >
              💸 Flex money
            </Link>
            <span
              className={`ml-auto text-xs tabular-nums ${
                remaining <= 0 ? "text-danger" : remaining <= 20 ? "text-gold" : "text-muted"
              } ${body.length < MAX_POST_LENGTH - 60 ? "invisible" : ""}`}
            >
              {remaining}
            </span>
            <button
              type="submit"
              disabled={!canPost}
              className="rounded-full bg-gradient-to-r from-gold to-gold-bright px-5 py-2 text-sm font-bold text-background transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isPending ? "Posting…" : "Post"}
            </button>
          </div>
          {error && (
            <p role="alert" className="mt-2 text-sm text-danger">
              {error}
            </p>
          )}
        </div>
      </div>
    </form>
  );
}
