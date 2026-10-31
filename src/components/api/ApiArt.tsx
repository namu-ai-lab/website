import { Icon } from "../Icon";
import type { ApiCopy } from "@/content/api";

/* The /api page's pictures, drawn in the page's own materials rather than painted: the three steps as the screens
   they are (the sign-in, the key dialog, a terminal), and the Lab's three commitments as line drawings. */

export function StepArt({ step, mock }: { step: number; mock: ApiCopy["mock"] }) {
  if (step === 0) return (
    <div className="ax-door">
      <span className="ax-door-btn"><b className="g">G</b>{mock.google}</span>
      <span className="ax-door-btn"><b className="gh" />{mock.github}</span>
      <span className="ax-door-or" />
      <span className="ax-door-field">{mock.email}</span>
    </div>
  );
  if (step === 1) return (
    <div className="ax-keybox">
      <strong>{mock.save}</strong>
      <span className="ax-keyfield"><code>namu_sk_k7Qm••••••••••••••••</code><span className="ax-keycopy"><Icon name="copy" size={14} stroke={1.6} /></span></span>
      <em>{mock.saveNote}</em>
      <span className="ax-keydone">{mock.done}</span>
    </div>
  );
  return (
    <pre className="ax-term"><code>
      <span className="hl-c">$</span> export NAMU_API_KEY=namu_sk_k7Qm…{"\n"}
      <span className="hl-c">$</span> <span className="hl-w">curl</span> …/v1/speech \{"\n"}
      {"    "}-d <span className="hl-s">{"'{\"text\": \"Sannu!\"}'"}</span> -o speech.wav{"\n"}
      <span className="ax-ok"><Icon name="check" size={13} stroke={2} />{mock.ok}</span>
    </code></pre>
  );
}

/* Measured honestly: a hooked letter and the plain one it folds into. Consent before data: a voice, given.
   Your requests stay yours: a log of requests, and no audio kept. */
export function CareArt({ i }: { i: number }) {
  return (
    <svg className="ax-care-art" viewBox="0 0 280 150" fill="none" stroke="currentColor" strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {i === 0 && <>
        <text x="58" y="104" fontSize="92" fill="none" strokeWidth={1.1}>ɗ</text>
        <path d="M128 76h34m-7-6 7 6-7 6" />
        <text x="178" y="104" fontSize="92" fill="none" strokeWidth={1.1} opacity=".45">d</text>
        <circle cx="86" cy="128" r="3.5" className="ax-dot" />
      </>}
      {i === 1 && <>
        <rect x="52" y="30" width="176" height="92" rx="14" opacity=".45" />
        {[18, 34, 52, 26, 60, 40, 22, 48, 30, 16, 38, 24].map((h, k) => <path key={k} d={`M${86 + k * 10} ${76 - h / 2}v${h}`} />)}
        <circle cx="222" cy="36" r="15" className="ax-dot-ring" />
        <path d="m215 36 5 5 9-10" className="ax-dot-ring" />
      </>}
      {i === 2 && <>
        <rect x="34" y="28" width="132" height="96" rx="12" opacity=".45" />
        {[50, 76, 102].map(y => <g key={y}><circle cx="54" cy={y} r="3" /><path d={`M66 ${y}h58M132 ${y}h18`} /></g>)}
        <circle cx="54" cy="50" r="3" className="ax-dot" />
        {[14, 30, 46, 24, 38, 18, 28].map((h, k) => <path key={k} d={`M${196 + k * 9} ${76 - h / 2}v${h}`} opacity=".45" />)}
        <path d="M186 104 260 48" />
      </>}
    </svg>
  );
}
