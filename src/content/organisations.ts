/* The Organisations page (/organisations): for NGOs, international organisations, governments, companies and
   universities that want to work with the Lab. Its spine is the founder's own partnership form (Tally 2jEx8e): the
   organisation types and the six ways to work together are the form's, so what a visitor picks here is what they
   are asked there, and the choice is passed to it.
   Claims gate: no partners, pilots, customers or deployments are named or implied; everything is how the Lab would
   work, in the present tense only where it is already true (open sign-up, the free beta allowance, the Lab's
   scoring). Positioning: the languages of the Sahel; Hausa is where the models are today, the Zarma programme is
   starting. FR-REVIEW: drafted French, to be reviewed by a native speaker. */
import type { Lang } from "@/i18n/config";

const n = " ";   // narrow no-break space before French high punctuation
const fr = (s: string) => s.replace(/ ([:;!?»])/g, `${n}$1`).replace(/« /g, `«${n}`);

export type OrgType = { id: string; icon: string; t: string; who: string; d: string };
export type OrgPath = { id: string; icon: string; t: string; want: string; d: string; points: string[]; link: { label: string; href: string } };

export type OrgCopy = {
  meta: [string, string];
  eyebrow: string; h1: string; lede: string; partner: string; hear: string;
  whoH: string; whoSub: string; types: OrgType[]; solo: { t: string; d: string; cta: string };
  wayH: string; waySub: string; iAm: string; iWant: string; forYou: (who: string, want: string) => string; start: string; startNote: string;
  paths: OrgPath[];
  howH: string; howSub: string; steps: { t: string; d: string }[];
  whyH: string; why: { t: string; d: string; href: string; cta: string }[];
  faqH: string; faq: [string, string][];
  endH: string; endSub: string; write: string;
};

const en: OrgCopy = {
  meta: ["Organisations", "Work with Namu AI Lab: deploy, test and improve speech technology for the languages of the Sahel in your programmes, research or products."],
  eyebrow: "Organisations",
  h1: "Reach people in the language they speak",
  lede: "Health, farming, education and public services work best when people can listen and answer in their own language. The Lab works with organisations to test, deploy and improve speech technology for the languages of the Sahel.",
  partner: "Partner with us", hear: "Hear the models",
  whoH: "Who we work with",
  whoSub: "The organisations closest to the people our languages are spoken by.",
  types: [
    { id: "ngo", icon: "care", t: "NGOs and nonprofits", who: "NGOs and nonprofits", d: "Programmes in health, farming, education and protection that need to reach people by voice." },
    { id: "international", icon: "language", t: "International organisations", who: "international organisations", d: "Information and services that must arrive in the languages people actually speak." },
    { id: "government", icon: "civic", t: "Governments and public institutions", who: "governments and public institutions", d: "Public services, information lines and records that work for every citizen." },
    { id: "company", icon: "chart", t: "Companies and startups", who: "companies and startups", d: "Products and customer service in the languages of your market." },
    { id: "university", icon: "learn", t: "Universities and research institutions", who: "universities and research institutions", d: "Shared research, evaluation and data on the languages of the Sahel." },
  ],
  solo: { t: "Building on your own?", d: "Developers and independent researchers can start straight away: sign up, create a key and call the models.", cta: "Go to the API platform" },
  wayH: "Find your way in",
  waySub: "Tell us who you are and what you would like to do. We will show you how working together would look, and pass your answer on when you write to us.",
  iAm: "We are", iWant: "We would like to",
  forYou: (who, want) => `For ${who} that want to ${want}`,
  start: "Start with this", startNote: "Opens our partnership form, with your choice filled in.",
  paths: [
    { id: "deploy", icon: "phone-voice", t: "Deploy voice AI in our programmes or services", want: "deploy voice AI in their programmes or services",
      d: "We start from your programme: who you serve, which languages and dialects they speak, and how they would reach it, by phone, app, radio or through your field staff.",
      points: ["We test the models on recordings from your own setting before anything is built", "A small pilot with your team, and people who have agreed to take part", "Results measured with you, and a decision together to grow it or stop"],
      link: { label: "Hear the models", href: "/#try" } },
    { id: "api", icon: "code", t: "Use Namu’s models or API", want: "use Namu’s models or API",
      d: "Anyone can sign up and get API keys at once. Every account gets 30 minutes of audio a month while the API is in beta.",
      points: ["Speech to text, text to speech, speech translation and conversation, through one API", "Docs with every call in cURL, Python and JavaScript", "More audio, or keys for a whole team: write to us"],
      link: { label: "Explore the API", href: "/api" } },
    { id: "research", icon: "paper", t: "Collaborate on research", want: "collaborate on research",
      d: "Evaluate speech technology on your data with the Lab’s methods, design studies together, and publish what you find.",
      points: ["Every score reported twice, strict and folded for spelling", "Test sets frozen before training, with who is in them written down", "Results published with the conditions they were measured under"],
      link: { label: "Read the research", href: "/research" } },
    { id: "data", icon: "dataset", t: "Develop language data together", want: "develop language data with the Lab",
      d: "Help build Rumbu, the Lab’s consented speech commons for the languages of the Sahel, starting in Niger.",
      points: ["Speakers told in their own language how their voice will be used", "Speakers paid for their time, and free to withdraw", "Partners host recording sessions, connect communities or share archives under clear licences"],
      link: { label: "About Rumbu", href: "/programmes/rumbu" } },
    { id: "product", icon: "model", t: "Build a technology or product partnership", want: "build a technology or product partnership",
      d: "Bring the Lab’s models into your platform, whether that is telephony, messaging, education or health software, and shape what comes next.",
      points: ["Early access as the models improve", "A say in which languages and features come first", "One API to build on, and the Lab’s team to talk to"],
      link: { label: "See the platform", href: "/api" } },
    { id: "funding", icon: "grow", t: "Fund or sponsor the work", want: "fund or sponsor the Lab’s work",
      d: "Support a research programme, the data commons, or the work on a language.",
      points: ["Five research programmes to choose from, from conversation to measurement", "Work published in the open, with its conditions", "Speech data gathered with consent and fair pay"],
      link: { label: "See the programmes", href: "/research" } },
  ],
  howH: "How a partnership runs",
  howSub: "Nothing reaches many people before it has been tested with you.",
  steps: [
    { t: "Talk", d: "Your programme, the people it serves, their languages and the channel they use." },
    { t: "Test", d: "The models on recordings from your setting, measured with you." },
    { t: "Pilot", d: "A small deployment with your team and people who have agreed to take part." },
    { t: "Decide", d: "Look at the results together, then grow it, change it or stop." },
  ],
  whyH: "Why work with the Lab",
  why: [
    { t: "Languages first", d: "We start from the languages and dialects people speak, Hausa today, with our Zarma programme starting.", href: "/research", cta: "Our programmes" },
    { t: "Measured honestly", d: "Every result comes with the conditions it was measured under, and every score is reported strict and folded.", href: "/research/why-we-report-every-hausa-score-twice", cta: "How we score speech" },
    { t: "Consent and care", d: "The Lab’s own recordings come from speakers who know how their voice will be used, are paid, and can withdraw.", href: "/data", cta: "Our approach to data" },
  ],
  faqH: "Questions",
  faq: [
    ["Which languages do you work in?", "Hausa today, with French for translation. The Lab’s Zarma programme is starting, and we work on the languages of the Sahel one at a time. Tell us which languages your programme needs."],
    ["Which countries do you work in?", "We start in Niger and work across the region where Hausa and Zarma are spoken. Tell us where your programme runs."],
    ["What does it cost?", "The API is free during its beta, up to 30 minutes of audio a month per account. Pilots, research and data partnerships are agreed with each organisation."],
    ["Do we need technical staff?", "No. We can help you design the pilot and build the first version with you. If you have developers, they can start on the API straight away."],
    ["How do we start?", "Fill in the partnership form. We read every message and answer from contact@namuai.org."],
  ],
  endH: "Tell us about your programme",
  endSub: "Who you serve, the languages they speak, and what you would like to do. We will take it from there.",
  write: "Write to us",
};

const frCopy: OrgCopy = {
  meta: ["Organisations", fr("Travaillez avec Namu AI Lab : déployez, testez et améliorez les technologies de la parole pour les langues du Sahel dans vos programmes, vos recherches ou vos produits.")],
  eyebrow: "Organisations",
  h1: "Parlez aux gens dans leur langue",
  lede: "La santé, l’agriculture, l’éducation et les services publics fonctionnent mieux quand chacun peut écouter et répondre dans sa propre langue. Le Lab travaille avec les organisations pour tester, déployer et améliorer les technologies de la parole pour les langues du Sahel.",
  partner: "Devenez partenaire", hear: "Écouter les modèles",
  whoH: "Avec qui nous travaillons",
  whoSub: "Les organisations les plus proches des personnes qui parlent nos langues.",
  types: [
    { id: "ngo", icon: "care", t: "ONG et associations", who: "ONG et associations", d: "Des programmes de santé, d’agriculture, d’éducation et de protection qui doivent toucher les gens par la voix." },
    { id: "international", icon: "language", t: "Organisations internationales", who: "organisations internationales", d: "Des informations et des services qui doivent arriver dans les langues que les gens parlent vraiment." },
    { id: "government", icon: "civic", t: "États et institutions publiques", who: "États et institutions publiques", d: "Des services publics, des lignes d’information et des registres qui fonctionnent pour chaque citoyen." },
    { id: "company", icon: "chart", t: "Entreprises et startups", who: "entreprises et startups", d: "Des produits et un service client dans les langues de votre marché." },
    { id: "university", icon: "learn", t: "Universités et instituts de recherche", who: "universités et instituts de recherche", d: "Des recherches, des évaluations et des données partagées sur les langues du Sahel." },
  ],
  solo: { t: "Vous construisez seul ?".replace(" ?", `${n}?`), d: "Les développeurs et les chercheurs indépendants peuvent commencer tout de suite : s’inscrire, créer une clé et appeler les modèles.".replace(" :", `${n}:`), cta: "Aller sur la plateforme API" },
  wayH: "Trouvez votre point d’entrée",
  waySub: "Dites-nous qui vous êtes et ce que vous souhaitez faire. Nous vous montrons à quoi ressemblerait notre collaboration, et nous transmettons votre réponse quand vous nous écrivez.",
  iAm: "Nous sommes", iWant: "Nous souhaitons",
  forYou: (who, want) => `Pour les ${who} qui souhaitent ${want}`,
  start: "Commencer ainsi", startNote: "Ouvre notre formulaire de partenariat, avec votre choix déjà rempli.",
  paths: [
    { id: "deploy", icon: "phone-voice", t: "Déployer l’IA vocale dans nos programmes ou services", want: "déployer l’IA vocale dans leurs programmes ou services",
      d: "Nous partons de votre programme : les personnes que vous servez, leurs langues et leurs dialectes, et la façon dont elles y accéderaient, par téléphone, application, radio ou par vos équipes de terrain.".replace(" :", `${n}:`),
      points: ["Nous testons les modèles sur des enregistrements de votre propre contexte avant de construire quoi que ce soit", "Un petit pilote avec votre équipe, et des personnes qui ont accepté d’y participer", "Des résultats mesurés avec vous, et une décision commune de l’étendre ou de l’arrêter"],
      link: { label: "Écouter les modèles", href: "/#try" } },
    { id: "api", icon: "code", t: "Utiliser les modèles ou l’API de Namu", want: "utiliser les modèles ou l’API de Namu",
      d: "Chacun peut s’inscrire et obtenir des clés d’API aussitôt. Chaque compte dispose de 30 minutes d’audio par mois pendant la bêta de l’API.",
      points: ["Reconnaissance vocale, synthèse vocale, traduction de la parole et conversation, avec une seule API", "Une documentation avec chaque appel en cURL, Python et JavaScript", "Plus d’audio, ou des clés pour toute une équipe : écrivez-nous".replace(" :", `${n}:`)],
      link: { label: "Découvrir l’API", href: "/api" } },
    { id: "research", icon: "paper", t: "Collaborer sur la recherche", want: "collaborer sur la recherche",
      d: "Évaluez les technologies de la parole sur vos données avec les méthodes du Lab, concevez des études ensemble et publiez ce que vous trouvez.",
      points: ["Chaque score donné deux fois, en strict et en replié pour l’orthographe", "Des jeux de test figés avant l’entraînement, avec la liste de qui y figure", "Des résultats publiés avec les conditions de leur mesure"],
      link: { label: "Lire la recherche", href: "/research" } },
    { id: "data", icon: "dataset", t: "Développer ensemble des données linguistiques", want: "développer des données linguistiques avec le Lab",
      d: "Aidez à construire Rumbu, le fonds commun de parole consentie du Lab pour les langues du Sahel, en commençant par le Niger.",
      points: ["Des locuteurs informés dans leur langue de l’usage de leur voix", "Des locuteurs rémunérés pour leur temps, et libres de se retirer", "Des partenaires qui accueillent des séances d’enregistrement, relient les communautés ou partagent des archives sous des licences claires"],
      link: { label: "À propos de Rumbu", href: "/programmes/rumbu" } },
    { id: "product", icon: "model", t: "Nouer un partenariat technologique ou produit", want: "nouer un partenariat technologique ou produit",
      d: "Intégrez les modèles du Lab à votre plateforme, téléphonie, messagerie, éducation ou santé, et façonnez la suite.",
      points: ["Un accès anticipé à mesure que les modèles progressent", "Votre voix sur les langues et les fonctions qui viennent en premier", "Une seule API pour construire, et l’équipe du Lab à qui parler"],
      link: { label: "Voir la plateforme", href: "/api" } },
    { id: "funding", icon: "grow", t: "Financer ou parrainer le travail", want: "financer ou parrainer le travail du Lab",
      d: "Soutenez un programme de recherche, le fonds commun de données, ou le travail sur une langue.",
      points: ["Cinq programmes de recherche, de la conversation à la mesure", "Un travail publié ouvertement, avec ses conditions", "Des données de parole recueillies avec consentement et une juste rémunération"],
      link: { label: "Voir les programmes", href: "/research" } },
  ],
  howH: "Comment se déroule un partenariat",
  howSub: "Rien n’atteint un large public avant d’avoir été testé avec vous.",
  steps: [
    { t: "Échanger", d: "Votre programme, les personnes qu’il sert, leurs langues et le canal qu’elles utilisent." },
    { t: "Tester", d: "Les modèles sur des enregistrements de votre contexte, mesurés avec vous." },
    { t: "Piloter", d: "Un petit déploiement avec votre équipe et des personnes qui ont accepté d’y participer." },
    { t: "Décider", d: "Regarder les résultats ensemble, puis étendre, modifier ou arrêter." },
  ],
  whyH: "Pourquoi travailler avec le Lab",
  why: [
    { t: "Les langues d’abord", d: "Nous partons des langues et des dialectes que les gens parlent : le hausa aujourd’hui, et notre programme zarma qui démarre.".replace(" :", `${n}:`), href: "/research", cta: "Nos programmes" },
    { t: "Une mesure honnête", d: "Chaque résultat est donné avec ses conditions de mesure, et chaque score en strict et en replié.", href: "/research/why-we-report-every-hausa-score-twice", cta: "Comment nous évaluons la parole" },
    { t: "Consentement et respect", d: "Les enregistrements du Lab viennent de locuteurs qui savent comment leur voix sera utilisée, sont rémunérés et peuvent se retirer.", href: "/data", cta: "Notre approche des données" },
  ],
  faqH: "Questions",
  faq: [
    ["Dans quelles langues travaillez-vous ?", "Le hausa aujourd’hui, avec le français pour la traduction. Le programme zarma du Lab démarre, et nous travaillons sur les langues du Sahel une à une. Dites-nous de quelles langues votre programme a besoin."],
    ["Dans quels pays travaillez-vous ?", "Nous commençons au Niger et travaillons dans la région où l’on parle hausa et zarma. Dites-nous où se déroule votre programme."],
    ["Combien cela coûte-t-il ?", "L’API est gratuite pendant sa bêta, jusqu’à 30 minutes d’audio par mois et par compte. Les pilotes, la recherche et les partenariats de données sont convenus avec chaque organisation."],
    ["Faut-il une équipe technique ?", "Non. Nous pouvons vous aider à concevoir le pilote et à en construire la première version avec vous. Si vous avez des développeurs, ils peuvent commencer tout de suite avec l’API."],
    ["Comment commencer ?", "Remplissez le formulaire de partenariat. Nous lisons chaque message et répondons depuis contact@namuai.org."],
  ].map(([q, a]) => [fr(q), fr(a)] as [string, string]),
  endH: "Parlez-nous de votre programme",
  endSub: "Les personnes que vous servez, leurs langues, et ce que vous souhaitez faire. Nous ferons le reste.",
  write: "Nous écrire",
};

export const orgCopy: Record<Lang, OrgCopy> = { en, fr: frCopy };

/* What the partnership form calls each choice (its own option labels), passed to it as hidden fields */
export const FORM_LABELS = {
  type: { ngo: "NGO / Nonprofit", international: "International organization", government: "Government / Public institution", company: "Company / Startup", university: "University / Research institution" },
  path: { deploy: "Deploying Namu's voice AI in our programs or services", api: "Using Namu's models or APIs", research: "Research collaboration",
    data: "Language data collection and development", product: "Technology or product partnership", funding: "Funding, grants, or sponsorship" },
} as const;
