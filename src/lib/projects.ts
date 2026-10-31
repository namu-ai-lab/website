import "server-only";
import { sql } from "@/lib/db";
import { isLangCode, isOutputId, type LangCode } from "@/lib/catalog";
import { isKind, isStatus, isUuid, type Project, type ProjectKind, type ProjectSummary, type Version, type VersionStatus } from "@/lib/project-shape";
import type { OutputId } from "@/lib/catalog";

/* Create's projects in Postgres (db/migrations/0006_platform.sql): one row per project, one per version. Every query
   filters on the owner's user_id; a version is written only under a project the user owns. Text only: audio is made
   again from the text when it is needed. */

type Row = { id: string; title: string; kind: string; source_lang: string; source_text: string; made_for: string; created_at: Date; updated_at: Date };
type VRow = { project_id: string; lang: string; text: string; voice: string | null; status: string; updated_at: Date };

const project = (r: Row, vs: VRow[]): Project => ({
  id: r.id, title: r.title, kind: isKind(r.kind) ? r.kind : "message",
  sourceLang: isLangCode(r.source_lang) ? r.source_lang : "fr", sourceText: r.source_text,
  madeFor: isOutputId(r.made_for) ? r.made_for : "whatsapp",
  createdAt: r.created_at.toISOString(), updatedAt: r.updated_at.toISOString(),
  versions: vs.filter(v => isLangCode(v.lang)).map(version),
});
const version = (v: VRow): Version => ({
  lang: v.lang as LangCode, text: v.text, voice: v.voice, status: isStatus(v.status) ? v.status : "draft", updatedAt: v.updated_at.toISOString(),
});

const COLS = "id::text, title, kind, source_lang, source_text, made_for, created_at, updated_at";

export async function listProjects(userId: string, limit = 100): Promise<ProjectSummary[]> {
  const rows = await sql<Row>(`select ${COLS} from public.projects where user_id = $1 order by updated_at desc limit $2`, [userId, limit]);
  if (!rows.length) return [];
  const vs = await sql<{ project_id: string; lang: string; status: string; filled: boolean }>(
    `select v.project_id::text, v.lang, v.status, length(trim(v.text)) > 0 as filled from public.project_versions v
     where v.project_id = any($1::uuid[])`, [rows.map(r => r.id)]);
  return rows.map(r => ({
    id: r.id, title: r.title, kind: isKind(r.kind) ? r.kind : "message", sourceLang: isLangCode(r.source_lang) ? r.source_lang : "fr",
    updatedAt: r.updated_at.toISOString(),
    versions: vs.filter(v => v.project_id === r.id && isLangCode(v.lang)).map(v => ({ lang: v.lang as LangCode, status: isStatus(v.status) ? v.status : "draft", filled: v.filled })),
  }));
}

export async function getProject(userId: string, id: string): Promise<Project | null> {
  if (!isUuid(id)) return null;
  const [r] = await sql<Row>(`select ${COLS} from public.projects where id = $1 and user_id = $2`, [id, userId]);
  if (!r) return null;
  const vs = await sql<VRow>("select project_id::text, lang, text, voice, status, updated_at from public.project_versions where project_id = $1", [id]);
  return project(r, vs);
}

/** How many projects one account may keep. */
export const MAX_PROJECTS = 500;

export async function createProject(userId: string, p: { title: string; kind: ProjectKind; sourceLang: LangCode; sourceText: string; madeFor: OutputId }): Promise<Project> {
  const [{ n }] = await sql<{ n: number }>("select count(*)::int as n from public.projects where user_id = $1", [userId]);
  if (n >= MAX_PROJECTS) throw new RangeError("too_many_projects");
  const [r] = await sql<Row>(`insert into public.projects (user_id, title, kind, source_lang, source_text, made_for)
    values ($1, $2, $3, $4, $5, $6) returning ${COLS}`, [userId, p.title, p.kind, p.sourceLang, p.sourceText, p.madeFor]);
  return project(r, []);
}

export async function updateProject(userId: string, id: string, p: { title?: string; sourceLang?: LangCode; sourceText?: string; madeFor?: OutputId; kind?: ProjectKind }): Promise<Project | null> {
  const [r] = await sql<Row>(`update public.projects set
      title = coalesce($3, title), source_lang = coalesce($4, source_lang), source_text = coalesce($5, source_text),
      made_for = coalesce($6, made_for), kind = coalesce($7, kind), updated_at = now()
    where id = $1 and user_id = $2 returning ${COLS}`,
    [id, userId, p.title ?? null, p.sourceLang ?? null, p.sourceText ?? null, p.madeFor ?? null, p.kind ?? null]);
  if (!r) return null;
  const vs = await sql<VRow>("select project_id::text, lang, text, voice, status, updated_at from public.project_versions where project_id = $1", [id]);
  return project(r, vs);
}

export async function deleteProject(userId: string, id: string): Promise<boolean> {
  const rows = await sql<{ id: string }>("delete from public.projects where id = $1 and user_id = $2 returning id::text", [id, userId]);
  return rows.length > 0;
}

/** Writes one version, creating it on first use; the project's own time moves with it. Null when the project is not
    the user's. */
export async function saveVersion(userId: string, id: string, lang: LangCode, v: { text?: string; voice?: string | null; status?: VersionStatus }): Promise<Version | null> {
  const [row] = await sql<VRow>(`
    with owned as (update public.projects set updated_at = now() where id = $1 and user_id = $2 returning id)
    insert into public.project_versions (project_id, lang, text, voice, status)
    select id, $3, coalesce($4, ''), $5, coalesce($6, 'draft') from owned
    on conflict (project_id, lang) do update set
      text = coalesce($4, project_versions.text),
      voice = case when $7 then $5 else project_versions.voice end,
      status = coalesce($6, project_versions.status),
      updated_at = now()
    returning project_id::text, lang, text, voice, status, updated_at`,
    [id, userId, lang, v.text ?? null, v.voice ?? null, v.status ?? null, v.voice !== undefined]);
  return row ? version(row) : null;
}
