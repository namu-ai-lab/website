"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "../Icon";
import { LocalTime } from "../console/LocalTime";
import { createProject } from "./client";
import { LangDots } from "./LangDots";
import { platformCopy } from "@/content/platform";
import { projectsCopy } from "@/content/projects";
import { lp, type Lang } from "@/i18n/config";
import { WRITTEN, language } from "@/lib/catalog";
import type { ProjectSummary } from "@/lib/project-shape";

/* New project: an empty one, written in French, opened at once. */
export function NewProjectButton({ lang }: { lang: Lang }) {
  const t = projectsCopy[lang], p = platformCopy[lang];
  const router = useRouter();
  const [busy, setBusy] = useState(false), [err, setErr] = useState<string | null>(null);
  const make = async () => {
    setBusy(true); setErr(null);
    try { const pr = await createProject({ sourceLang: WRITTEN, sourceText: "", title: t.list.untitled }); router.push(lp(lang, `/create/projects/${pr.id}`)); }
    catch (e) { setErr(e instanceof Error ? e.message : p.errors.generic); setBusy(false); }
  };
  return (
    <>
      <button type="button" className="cx-btn primary" onClick={() => void make()} disabled={busy}><Icon name="plus" size={16} stroke={1.7} />{t.list.newProject}</button>
      {err && <span className="cx-error" role="alert">{err}</span>}
    </>
  );
}

/* Create > Projects: every project, newest first, each with its languages as dots. */
export function ProjectList({ lang, projects }: { lang: Lang; projects: ProjectSummary[] }) {
  const t = projectsCopy[lang];
  if (!projects.length) return <div className="pf-empty"><span className="pj-empty-orb" aria-hidden="true" /><p>{t.list.none}</p><NewProjectButton lang={lang} /></div>;
  return (
    <ul className="pj-rows big">
      {projects.map(r => (
        <li key={r.id}>
          <a href={lp(lang, `/create/projects/${r.id}`)}>
            <span className="pj-row-title">{r.title}</span>
            <span className="pj-row-src">{language(r.sourceLang).endonym}</span>
            <LangDots summary={r} status={t.editor.status} />
            <span className="pj-row-time"><LocalTime iso={r.updatedAt} lang={lang} rel style="dayShort" /></span>
          </a>
        </li>
      ))}
    </ul>
  );
}
