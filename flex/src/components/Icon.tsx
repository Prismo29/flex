export type IconName =
  | "home"
  | "search"
  | "trophy"
  | "store"
  | "bell"
  | "user"
  | "coin"
  | "comment"
  | "share"
  | "image"
  | "trash"
  | "dots"
  | "close"
  | "logout"
  | "back"
  | "plus";

/** Stroke icons (24×24). Works in server and client components. */
export default function Icon({
  name,
  className = "h-5 w-5",
  filled = false,
}: {
  name: IconName;
  className?: string;
  filled?: boolean;
}) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (name) {
    case "home":
      return (
        <svg {...common}>
          <path d="M3.5 10.5 12 3.5l8.5 7V19a1.5 1.5 0 0 1-1.5 1.5h-4.5V15h-5v5.5H5A1.5 1.5 0 0 1 3.5 19v-8.5Z" fill={filled ? "currentColor" : "none"} />
        </svg>
      );
    case "search":
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="6.5" />
          <path d="m20 20-4.2-4.2" />
        </svg>
      );
    case "trophy":
      return (
        <svg {...common}>
          <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z" fill={filled ? "currentColor" : "none"} />
          <path d="M17 6h2.5a1.5 1.5 0 0 1 1.5 1.5V8a4 4 0 0 1-4 4M7 6H4.5A1.5 1.5 0 0 0 3 7.5V8a4 4 0 0 0 4 4" />
        </svg>
      );
    case "store":
      return (
        <svg {...common}>
          <path d="M5 8h14l-1.2 11.1a2 2 0 0 1-2 1.9H8.2a2 2 0 0 1-2-1.9L5 8Z" />
          <path d="M9 10V7a3 3 0 0 1 6 0v3" />
        </svg>
      );
    case "bell":
      return (
        <svg {...common}>
          <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16Z" fill={filled ? "currentColor" : "none"} />
          <path d="M10 20.5a2.2 2.2 0 0 0 4 0" />
        </svg>
      );
    case "user":
      return (
        <svg {...common}>
          <circle cx="12" cy="8.5" r="4" fill={filled ? "currentColor" : "none"} />
          <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
        </svg>
      );
    case "coin":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" fill={filled ? "currentColor" : "none"} />
          <path
            d="M14.5 9.2c-.5-.8-1.4-1.2-2.5-1.2-1.5 0-2.5.8-2.5 1.9 0 2.6 5 1.3 5 4 0 1.1-1 2-2.5 2-1.2 0-2.1-.5-2.6-1.3M12 6.5V8m0 8v1.5"
            stroke={filled ? "var(--background)" : "currentColor"}
          />
        </svg>
      );
    case "comment":
      return (
        <svg {...common}>
          <path d="M20.5 12a8 8 0 0 1-11.7 7.1L4 20.5l1.4-4.3A8 8 0 1 1 20.5 12Z" />
        </svg>
      );
    case "share":
      return (
        <svg {...common}>
          <path d="M12 3.5v12M7.5 8 12 3.5 16.5 8M5 13v5.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V13" />
        </svg>
      );
    case "image":
      return (
        <svg {...common}>
          <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
          <circle cx="9" cy="10" r="1.6" />
          <path d="m20.5 16-5-5-8.5 8.5" />
        </svg>
      );
    case "trash":
      return (
        <svg {...common}>
          <path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 12.5a1.5 1.5 0 0 0 1.5 1.5h6a1.5 1.5 0 0 0 1.5-1.5L17.5 7" />
        </svg>
      );
    case "dots":
      return (
        <svg {...common}>
          <circle cx="5.5" cy="12" r="1" fill="currentColor" />
          <circle cx="12" cy="12" r="1" fill="currentColor" />
          <circle cx="18.5" cy="12" r="1" fill="currentColor" />
        </svg>
      );
    case "close":
      return (
        <svg {...common}>
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      );
    case "logout":
      return (
        <svg {...common}>
          <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H4" />
        </svg>
      );
    case "back":
      return (
        <svg {...common}>
          <path d="M19 12H5M11 18l-6-6 6-6" />
        </svg>
      );
    case "plus":
      return (
        <svg {...common}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
  }
}
