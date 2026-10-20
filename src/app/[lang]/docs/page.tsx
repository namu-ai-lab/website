import type { Metadata } from "next";
import { CodeTabs } from "@/components/CodeTabs";
import { accountCopy } from "@/content/account";
import { docsCopy, samples } from "@/content/docs";
import { isLang, lp, type Lang } from "@/i18n/config";
import { alternates } from "@/i18n/seo";
import { apiBase } from "@/lib/env";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params; const l: Lang = isLang(lang) ? lang : "en";
  const [title, description] = docsCopy[l].meta;
  return { title, description, alternates: alternates(l, "/docs") };
}

/* The developer docs: static, one page, every limit taken from the gateway. */
export default async function Docs({ params }: { params: Promise<{ lang: string }> }) {
  const lang = (await params).lang as Lang;
  const d = docsCopy[lang], k = accountCopy[lang].keys;
  const code = samples(apiBase);
  const toc = [["quickstart", d.quickH], ["auth", d.authH], ...d.endpoints.map(e => [e.id, e.title]), ["errors", d.errorsH], ["limits", d.limitsH]];

  return (
    <div className="page-top docs wrap">
      <header className="acct-head">
        <p className="eyebrow">{d.eyebrow}</p>
        <h1 className="h1">{d.h1}</h1>
        <p className="lede">{d.lede}</p>
        <div className="acts"><a className="pill lg dark" href={lp(lang, "/account/keys")}>{d.getKey}</a></div>
      </header>

      <div className="docs-grid">
        <nav className="docs-toc" aria-label={d.toc}>
          <p className="eyebrow">{d.toc}</p>
          <ul>{toc.map(([id, t]) => <li key={id}><a href={`#${id}`}>{t}</a></li>)}</ul>
        </nav>

        <div className="docs-body">
          <section id="quickstart">
            <h2 className="h2">{d.quickH}</h2>
            <ol>{d.quick.map(q => <li key={q}>{q}</li>)}</ol>
            <CodeTabs code={code.speech} copyLabel={k.copy} copiedLabel={k.copied} />
            <p className="meta">{k.base}: <code>{apiBase}</code></p>
          </section>

          <section id="auth">
            <h2 className="h2">{d.authH}</h2>
            <p>{d.auth}</p>
            <p className="docs-warn">{d.authWarn}</p>
          </section>

          {d.endpoints.map(e => (
            <section key={e.id} id={e.id}>
              <p className="eyebrow">{e.model}</p>
              <h2 className="h2">{e.title}</h2>
              <p><code className="docs-route"><b>{e.method}</b> {e.path}</code></p>
              <p>{e.body}</p>
              <h3 className="h3">{d.paramsH}</h3>
              <dl className="docs-params">{e.params.map(([p, v]) => <div key={p}><dt><code>{p}</code></dt><dd>{v}</dd></div>)}</dl>
              <h3 className="h3">{d.returnsH}</h3>
              <p><code>{e.returns}</code></p>
              <CodeTabs code={code[e.id]} copyLabel={k.copy} copiedLabel={k.copied} />
            </section>
          ))}

          <section id="errors">
            <h2 className="h2">{d.errorsH}</h2>
            <p>{d.errorsSub}</p>
            <div className="acct-table-wrap">
              <table className="acct-table">
                <tbody>{d.errors.map(([s, types, why]) => <tr key={s}><td><code>{s}</code></td><td><code>{types}</code></td><td>{why}</td></tr>)}</tbody>
              </table>
            </div>
          </section>

          <section id="limits">
            <h2 className="h2">{d.limitsH}</h2>
            <dl className="docs-params">{d.limits.map(([a, b]) => <div key={a}><dt>{a}</dt><dd>{b}</dd></div>)}</dl>
            <h3 className="h3">{d.livekitH}</h3>
            <p>{d.livekit}</p>
            <p className="meta">{d.status}</p>
          </section>
        </div>
      </div>
    </div>
  );
}
