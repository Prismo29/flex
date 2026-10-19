"use client";

import Link from "next/link";
import { Fragment } from "react";

const TOKEN_RE = /(@[A-Za-z0-9_]{3,20}\b|https?:\/\/[^\s<]+[^\s<.,:;"')\]!?])/g;

/** Post/comment text with @mentions and URLs turned into links. */
export default function RichText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(TOKEN_RE);
  return (
    <p className={`break-words whitespace-pre-wrap ${className ?? ""}`}>
      {parts.map((part, i) => {
        if (i % 2 === 0) return <Fragment key={i}>{part}</Fragment>;
        if (part.startsWith("@")) {
          return (
            <Link
              key={i}
              href={`/u/${part.slice(1)}`}
              className="font-semibold text-gold-bright hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {part}
            </Link>
          );
        }
        return (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer nofollow ugc"
            className="text-gold-bright hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {part.replace(/^https?:\/\//, "")}
          </a>
        );
      })}
    </p>
  );
}
