import { language } from "@/lib/catalog";
import { versionLangs, type ProjectSummary, type VersionStatus } from "@/lib/project-shape";

/* A project's languages at a glance: one dot each, hollow while empty, filling as the version moves from draft to
   checked. The language and its state are in the dot's title and for screen readers. */
export function LangDots({ summary, status }: { summary: Pick<ProjectSummary, "sourceLang" | "versions">; status: Record<VersionStatus, string> }) {
  return (
    <span className="pj-dots">
      {versionLangs(summary.sourceLang).map(l => {
        const v = summary.versions.find(x => x.lang === l);
        const state = v?.filled ? v.status : "empty";
        const label = state === "empty" ? language(l).endonym : `${language(l).endonym} · ${status[state]}`;
        return <i key={l} className={state} title={label} aria-label={label} role="img" />;
      })}
    </span>
  );
}
