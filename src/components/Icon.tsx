import { ICONS, type IconName, type IconPart } from "@/lib/icons";

/** One glyph from the Lab set: 24 grid, 1.25 stroke, round caps. Decorative unless `label` is given. */
export function Icon({ name, size = 20, label, stroke = 1.25, className }: { name: IconName; size?: number; label?: string; stroke?: number; className?: string }) {
  const parts: readonly IconPart[] = ICONS[name];
  let i = 0;
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke}
      strokeLinecap="round" strokeLinejoin="round" role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      {parts.map((p, k) =>
        typeof p === "string"
          ? <path key={k} d={p} pathLength={1} style={{ ["--i" as string]: i++ }} />
          : <path key={k} d={p.d} stroke="none" fill={p.fill === "dot" ? "var(--sahel)" : "currentColor"} />,
      )}
    </svg>
  );
}
