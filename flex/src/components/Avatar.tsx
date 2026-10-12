type AvatarProps = {
  name: string;
  color: string;
  size?: number;
};

/** Circle with the first letter of `name` on `color`. Works in server and client components. */
export default function Avatar({ name, color, size = 40 }: AvatarProps) {
  const letter = (name.trim()[0] ?? "?").toUpperCase();
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 select-none items-center justify-center rounded-full font-bold text-black/85 ring-1 ring-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_2px_8px_rgba(0,0,0,0.5)]"
      style={{
        width: size,
        height: size,
        fontSize: Math.max(10, Math.round(size * 0.44)),
        background: `radial-gradient(circle at 30% 25%, rgba(255,255,255,0.35), transparent 55%), ${color}`,
      }}
    >
      {letter}
    </span>
  );
}
