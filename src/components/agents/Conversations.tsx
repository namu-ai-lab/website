import { Icon } from "../Icon";
import { LocalTime } from "../console/LocalTime";
import { agentsCopy } from "@/content/agents";
import { lp, type Lang } from "@/i18n/config";
import type { Conversation } from "@/lib/agent-shape";

/* Conversations as rows, newest first: the agent, who called (a WhatsApp contact) or what they said first, the
   channel, the number of turns and when; each opens the conversation turn by turn. `showAgent` is off inside one
   agent's page, where the agent is known. */
/** what the caller said first */
const said = (c: Conversation) => c.turns.find(x => x.role === "caller")?.text ?? "…";

export function ConversationList({ list, lang, showAgent = true }: { list: Conversation[]; lang: Lang; showAgent?: boolean }) {
  const t = agentsCopy[lang];
  if (!list.length) return <div className="ag-empty"><p>{t.convs.emptyH}</p></div>;
  return (
    <ul className="ag-rows">
      {list.map(c => (
        <li key={c.id}>
          <a className="ag-row ag-conv-row" href={`${lp(lang, "/agents/conversations")}?c=${c.id}`}>
            <span className="ag-ch" aria-hidden="true"><Icon name={c.channel === "whatsapp" ? "phone-voice" : "microphone"} size={17} stroke={1.5} /></span>
            <span className="ag-row-main">
              <strong>{showAgent ? c.agent_name : said(c)}</strong>
              {showAgent ? <em>{c.contact ?? said(c)}</em> : c.contact && <em>{c.contact}</em>}
            </span>
            <span className="ag-row-meta hide-sm">{t.convs.channels[c.channel]}</span>
            <span className="ag-row-meta hide-sm">{t.convs.turns(c.turns.length)}</span>
            <span className="hide-sm">{c.flagged && <span className="ag-tag"><Icon name="warn" size={13} stroke={1.6} />{t.convs.flagged}</span>}</span>
            <span className="ag-row-meta"><LocalTime iso={c.updated_at} lang={lang} style="dayMonth" rel /></span>
          </a>
        </li>
      ))}
    </ul>
  );
}
