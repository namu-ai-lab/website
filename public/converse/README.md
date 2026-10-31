# Aïr's recorded lines

What Aïr says in the home page's live call that is not generated during the call: its welcome, the short phrases
that fill the wait while it thinks, and what it says when something goes wrong. One folder per voice (`nadia`, the
female voice; the male voice, `salim`, was withdrawn on 2026-10-31 with no consent record for its speaker, and its
folder removed), spoken by Tafiya through the Namu API on 2026-10-20 and chosen the same way as the demo recordings
(see `public/demo/README.md`). `src/lib/call.ts` decides when each plays.

| File | Hausa | English | When |
|---|---|---|---|
| `hello` | Sannu da zuwa! Ni ce Nadia, daga Namu. Muna gina fasahar murya don harsunan Afirka. Ku yi mini magana da Hausa, zan saurare ku. | Welcome! I'm Nadia, from Namu. We build voice technology for African languages. Speak to me in Hausa; I'm listening. | as the call opens, while the models wake |
| `ack1` | To, na ji. | OK, I heard you. | after a statement |
| `ack2` | Eh, na fahimta. | Yes, I understand. | after a statement |
| `ack3` | Haka ne. | That's right. | after a statement |
| `question` | Tambaya mai kyau. | Good question. | after a question |
| `think1` | Bari in duba. | Let me see. | 4.5 s into the wait |
| `think2` | Bari in yi tunani kaɗan. | Let me think a moment. | 4.5 s into the wait |
| `think3` | Dakata kaɗan. | Wait a moment. | 9 s into the wait |
| `almost` | Kusan na gama. | I'm almost done. | 14 s into the wait |
| `unheard` | Ban ji ku sosai ba. Ku sake faɗa? | I didn't hear you well. Could you say it again? | nothing was heard |
| `limit` | Mun kai iyakar gwaji a yanzu. Mu sake magana anjima. | We've reached the trial's limit for now. Let's talk again later. | the demo's limit |
| `error` | Wani abu ya faru. Mu sake gwadawa. | Something went wrong. Let's try again. | a failed turn |

No phrase plays after a greeting (Aïr's answer to one comes quickly), none plays once the reply has started, and
never more than four in one wait. The Hausa has not yet been reviewed by a native speaker.
