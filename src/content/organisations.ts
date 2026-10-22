/* The Organisations page (/organisations): for NGOs, international organisations, governments, companies and
   universities that want to work with the Lab. Its spine is the founder's own partnership form (Tally 2jEx8e): the
   organisation types and the six ways to work together are the form's, so what a visitor picks here is what they
   are asked there, and the choice is passed to it.
   Claims gate: no partners, pilots, customers or deployments are named or implied; everything is how the Lab would
   work, in the present tense only where it is already true (open sign-up, the free beta allowance, the Lab's
   scoring). Positioning: the languages of the Sahel; Hausa is where the models are today, the Zarma programme is
   starting. FR-REVIEW: drafted French, to be reviewed by a native speaker.
   FOUNDER-REVIEW: the commitments ("What we commit to", the data FAQ) are written as Lab policy for partnerships;
   the founders confirm them before this page is merged. Figures in `facts` come with their source and link. */
import type { Lang } from "@/i18n/config";

const n = " ";   // narrow no-break space before French high punctuation
const fr = (s: string) => s.replace(/ ([:;!?»])/g, `${n}$1`).replace(/« /g, `«${n}`);

export type OrgType = { id: string; icon: string; t: string; who: string; d: string };
export type OrgPath = { id: string; icon: string; t: string; want: string; d: string; points: string[]; link: { label: string; href: string } };
/* a public figure with its source, printed with the source beside it */
export type OrgFact = { figure: string; label: string; source: string; href: string };
/* what a programme in a sector could look like: who it reaches, how, and what would be measured with the partner */
export type OrgSector = { who: string; channel: string; measure: string };

export type OrgCopy = {
  meta: [string, string];
  eyebrow: string; h1: string; lede: string; partner: string; hear: string;
  whoH: string; whoSub: string; types: OrgType[]; solo: { t: string; d: string; cta: string };
  wayH: string; waySub: string; iAm: string; iWant: string; forYou: (who: string, want: string) => string; start: string; startNote: string;
  paths: OrgPath[];
  contextH: string; contextSub: string; facts: OrgFact[]; factsNote: string;
  sectorsH: string; sectorsSub: string; sectorUi: { who: string; channel: string; measure: string; heard: string; play: string; stop: string; models: string; note: string };
  sectors: Record<string, OrgSector>;
  howH: string; howSub: string; receive: string; steps: { t: string; d: string; get: string }[];
  commitH: string; commitSub: string; commits: { icon: string; t: string; d: string }[];
  notYetH: string; notYet: string[];
  researchH: string; researchSub: string; progLabel: string; latestLabel: string; allResearch: string;
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
  contextH: "Why voice, and why now",
  contextSub: "Most people in the Sahel speak languages that technology serves poorly, if at all. Many have a phone; fewer can read the language it uses.",
  facts: [
    { figure: "94.5 million", label: "people use Hausa, 58 million of them as their first language.", source: "Ethnologue, 2021–2023 data", href: "https://www.ethnologue.com/language/hau/" },
    { figure: "35.6%", label: "of adults in Niger can read and write; among women, 25.7%.", source: "UNESCO Institute for Statistics, 2022, via the World Bank", href: "https://data.worldbank.org/indicator/SE.ADT.LITR.ZS?locations=NE" },
    { figure: "58.9%", label: "of people in Niger own a mobile phone.", source: "ITU DataHub, 2025", href: "https://datahub.itu.int/data/?e=NER&i=28027" },
    { figure: "23%", label: "of 951 displaced people in Maiduguri understood written messages in Hausa or Kanuri. Spoken messages were understood almost universally.", source: "Translators without Borders, 2017", href: "https://translatorswithoutborders.org/wp-content/uploads/2017/04/Language-profile-of-five-IDP-sites-in-Maiduguri.pdf" },
    { figure: "~100", label: "of the world’s 7,000+ languages were covered by speech technology, a 2023 study found.", source: "Pratap et al., Meta AI, 2023", href: "https://arxiv.org/abs/2305.13516" },
    { figure: "4.35 h", label: "of validated Hausa speech in Mozilla’s open Common Voice dataset, against 2,826.8 hours of English.", source: "Common Voice 27.0, 2026", href: "https://github.com/common-voice/cv-dataset/blob/main/datasets/scripted-speech/cv-corpus-27.0-2026-09-11.json" },
  ],
  factsNote: "Figures are the latest each source publishes; follow the links for their methods.",
  sectorsH: "Where voice can help",
  sectorsSub: "What a programme could sound like in your sector. Each line is spoken by the Lab’s own models through the API; the programmes are illustrations, not deployments.",
  sectorUi: { who: "Who it reaches", channel: "How it reaches them", measure: "What we would measure with you", heard: "What Tatsuniya wrote down", play: "Play", stop: "Stop", models: "Built on", note: "An illustration of a programme, not a deployment." },
  sectors: {
    health: { who: "Mothers and caregivers, patients between visits, community health workers.", channel: "Phone calls and voice notes, health lines, community radio.", measure: "Whether the message was understood, appointments kept, and which questions were handed to a person." },
    farming: { who: "Smallholder farmers and pastoralists, and the extension workers who advise them.", channel: "A phone line, voice notes, local radio.", measure: "Whether advice is understood and used, checked against what agronomists would say." },
    education: { who: "Learners and their teachers, adult literacy classes, children reading at home.", channel: "Shared phones and tablets, classroom speakers, recorded lessons.", measure: "Comprehension, time spent listening, and what teachers see in class." },
    public: { who: "Citizens at service desks and on hotlines, especially those who do not read French.", channel: "A hotline, a kiosk, a service desk’s phone.", measure: "Requests resolved, errors in forms, and how often a person had to step in." },
    translation: { who: "Communities and the staff who serve them, when they do not share a language.", channel: "Field interviews, helplines, meetings.", measure: "Translation quality reviewed by native speakers, and the time it saves." },
    heritage: { who: "Archives, broadcasters, researchers and the communities whose stories they hold.", channel: "Radio archives, recorded interviews, oral histories.", measure: "Transcript accuracy, scored strict and folded, and the hours made searchable." },
  },
  howH: "How a partnership runs",
  howSub: "Nothing reaches many people before it has been tested with you. Each step ends with something you can keep.",
  receive: "You receive",
  steps: [
    { t: "Talk", d: "Your programme, the people it serves, their languages and the channel they use.", get: "A short note on what we heard, including whether speech technology is the right tool for it." },
    { t: "Test", d: "The models on recordings from your setting, measured with you.", get: "An evaluation on your own recordings, scored strict and folded, with what the models get wrong." },
    { t: "Pilot", d: "A small deployment with your team and people who have agreed to take part.", get: "A working pilot your team runs, with a record of every request it handled." },
    { t: "Decide", d: "Look at the results together, then grow it, change it or stop.", get: "A pilot report: what worked, what did not, for whom, and what growing it would take." },
  ],
  commitH: "What we commit to",
  commitSub: "The same rules for every partnership, written down before any work starts.",
  commits: [
    { icon: "consent", t: "Consent first", d: "Everyone recorded agrees, in their own language, to how their voice will be used, and can withdraw." },
    { icon: "dataset", t: "Your data stays yours", d: "Recordings you share are used only for what we agree in writing, then returned or deleted." },
    { icon: "person", t: "People stay in the loop", d: "For health, legal or money matters, the system hands over to a person. It informs; it does not diagnose or decide." },
    { icon: "check", t: "Measured with you", d: "Results are reported with their conditions, strict and folded, and split by dialect and gender where the data allows." },
    { icon: "language", t: "Languages first", d: "We build from the languages and dialects people speak, not from the ones technology already supports." },
  ],
  notYetH: "What we do not claim yet",
  notYet: [
    "Our models are in development. We have not yet published benchmark results for them; when we do, each will come with the conditions it was measured under.",
    "Hausa is the language our models serve today, with French for translation. Our Zarma programme is starting.",
    "Aïr, our conversation model, is a research preview.",
    "We are choosing our first pilot partners now. This page describes how we will work with them, not past deployments.",
  ],
  researchH: "The research behind it",
  researchSub: "Five research programmes, from how people take turns in conversation to how speech is measured, and the work they publish.",
  progLabel: "Programmes", latestLabel: "Latest from the Lab", allResearch: "All research",
  faqH: "Questions",
  faq: [
    ["Which languages do you work in?", "Hausa today, with French for translation. The Lab’s Zarma programme is starting, and we work on the languages of the Sahel one at a time. Tell us which languages your programme needs."],
    ["Which countries do you work in?", "We start in Niger and work across the region where Hausa and Zarma are spoken. Tell us where your programme runs."],
    ["What does it cost?", "The API is free during its beta, up to 30 minutes of audio a month per account. Pilots, research and data partnerships are agreed with each organisation."],
    ["Do we need technical staff?", "No. We can help you design the pilot and build the first version with you. If you have developers, they can start on the API straight away."],
    ["What happens to our data?", "Recordings and transcripts you share are used only for the purposes we agree in writing for your project, then returned or deleted. Nothing you share trains a model without your explicit agreement."],
    ["Who can partner with the Lab?", "NGOs, international organisations, public institutions, companies and universities working with communities that speak the languages of the Sahel. Developers can start on the API without a partnership."],
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
  contextH: "Pourquoi la voix, et pourquoi maintenant",
  contextSub: fr("La plupart des habitants du Sahel parlent des langues que la technologie sert mal, voire pas du tout. Beaucoup ont un téléphone ; moins nombreux sont ceux qui lisent la langue qu’il utilise."),
  facts: [
    { figure: "94,5 millions", label: "de personnes utilisent le hausa, dont 58 millions comme première langue.", source: "Ethnologue, données 2021–2023", href: "https://www.ethnologue.com/language/hau/" },
    { figure: `35,6${n}%`, label: `des adultes au Niger savent lire et écrire${n}; parmi les femmes, 25,7${n}%.`, source: "Institut de statistique de l’UNESCO, 2022, via la Banque mondiale", href: "https://data.worldbank.org/indicator/SE.ADT.LITR.ZS?locations=NE" },
    { figure: `58,9${n}%`, label: "des habitants du Niger possèdent un téléphone portable.", source: "UIT, DataHub, 2025", href: "https://datahub.itu.int/data/?e=NER&i=28027" },
    { figure: `23${n}%`, label: "des 951 personnes déplacées interrogées à Maiduguri comprenaient des messages écrits en hausa ou en kanouri. Les messages parlés étaient compris presque par tous.", source: "Translators without Borders, 2017", href: "https://translatorswithoutborders.org/wp-content/uploads/2017/04/Language-profile-of-five-IDP-sites-in-Maiduguri.pdf" },
    { figure: "~100", label: "des plus de 7 000 langues du monde étaient couvertes par les technologies de la parole, selon une étude de 2023.", source: "Pratap et al., Meta AI, 2023", href: "https://arxiv.org/abs/2305.13516" },
    { figure: "4,35 h", label: "de parole hausa validée dans le jeu de données ouvert Common Voice de Mozilla, contre 2 826,8 heures d’anglais.", source: "Common Voice 27.0, 2026", href: "https://github.com/common-voice/cv-dataset/blob/main/datasets/scripted-speech/cv-corpus-27.0-2026-09-11.json" },
  ],
  factsNote: "Les chiffres sont les plus récents publiés par chaque source ; suivez les liens pour leurs méthodes.".replace(" ;", `${n};`),
  sectorsH: "Là où la voix peut aider",
  sectorsSub: fr("À quoi pourrait ressembler un programme dans votre secteur. Chaque phrase est prononcée par les modèles du Lab via l’API ; les programmes sont des illustrations, pas des déploiements."),
  sectorUi: { who: "Qui il touche", channel: "Comment il les touche", measure: "Ce que nous mesurerions avec vous", heard: "Ce que Tatsuniya a écrit", play: "Écouter", stop: "Arrêter", models: "Construit avec", note: "L’illustration d’un programme, pas un déploiement." },
  sectors: {
    health: { who: "Les mères et les aidants, les patients entre deux visites, les agents de santé communautaires.", channel: "Appels et messages vocaux, lignes santé, radio communautaire.", measure: "Si le message a été compris, les rendez-vous honorés, et les questions transmises à une personne." },
    farming: { who: "Les petits agriculteurs et les éleveurs, et les agents de vulgarisation qui les conseillent.", channel: "Une ligne téléphonique, des messages vocaux, la radio locale.", measure: "Si les conseils sont compris et suivis, vérifiés par rapport à ce que diraient des agronomes." },
    education: { who: "Les élèves et leurs enseignants, les cours d’alphabétisation, les enfants qui lisent à la maison.", channel: "Téléphones et tablettes partagés, haut-parleurs en classe, leçons enregistrées.", measure: "La compréhension, le temps d’écoute, et ce que les enseignants observent en classe." },
    public: { who: "Les citoyens aux guichets et sur les lignes d’assistance, surtout ceux qui ne lisent pas le français.", channel: "Une ligne d’assistance, une borne, le téléphone d’un guichet.", measure: "Les demandes résolues, les erreurs dans les formulaires, et la fréquence où une personne a dû intervenir." },
    translation: { who: "Les communautés et le personnel qui les sert, quand ils ne partagent pas une langue.", channel: "Entretiens de terrain, lignes d’assistance, réunions.", measure: "La qualité de traduction relue par des locuteurs natifs, et le temps gagné." },
    heritage: { who: "Les archives, les radios, les chercheurs et les communautés dont ils gardent les histoires.", channel: "Archives radio, entretiens enregistrés, histoires orales.", measure: "La justesse des transcriptions, notée en strict et en replié, et les heures rendues consultables." },
  },
  howH: "Comment se déroule un partenariat",
  howSub: "Rien n’atteint un large public avant d’avoir été testé avec vous. Chaque étape se termine par quelque chose que vous gardez.",
  receive: "Vous recevez",
  steps: [
    { t: "Échanger", d: "Votre programme, les personnes qu’il sert, leurs langues et le canal qu’elles utilisent.", get: "Une courte note sur ce que nous avons compris, y compris si la technologie vocale est le bon outil." },
    { t: "Tester", d: "Les modèles sur des enregistrements de votre contexte, mesurés avec vous.", get: "Une évaluation sur vos propres enregistrements, notée en strict et en replié, avec les erreurs des modèles." },
    { t: "Piloter", d: "Un petit déploiement avec votre équipe et des personnes qui ont accepté d’y participer.", get: "Un pilote qui fonctionne, mené par votre équipe, avec le relevé de chaque requête traitée." },
    { t: "Décider", d: "Regarder les résultats ensemble, puis étendre, modifier ou arrêter.", get: fr("Un rapport de pilote : ce qui a marché, ce qui n’a pas marché, pour qui, et ce qu’il faudrait pour l’étendre.") },
  ],
  commitH: "Nos engagements",
  commitSub: "Les mêmes règles pour chaque partenariat, écrites avant le début du travail.",
  commits: [
    { icon: "consent", t: "Le consentement d’abord", d: "Chaque personne enregistrée accepte, dans sa langue, l’usage qui sera fait de sa voix, et peut se retirer." },
    { icon: "dataset", t: "Vos données restent les vôtres", d: "Les enregistrements que vous partagez ne servent qu’à ce que nous convenons par écrit, puis sont rendus ou supprimés." },
    { icon: "person", t: "Des personnes dans la boucle", d: fr("Pour la santé, le droit ou l’argent, le système passe la main à une personne. Il informe ; il ne diagnostique pas et ne décide pas.") },
    { icon: "check", t: "Mesuré avec vous", d: "Les résultats sont donnés avec leurs conditions, en strict et en replié, et ventilés par dialecte et par genre quand les données le permettent." },
    { icon: "language", t: "Les langues d’abord", d: "Nous partons des langues et des dialectes que les gens parlent, pas de celles que la technologie prend déjà en charge." },
  ],
  notYetH: "Ce que nous ne prétendons pas encore",
  notYet: [
    fr("Nos modèles sont en développement. Nous n’avons pas encore publié de résultats de référence ; quand nous le ferons, chacun sera donné avec ses conditions de mesure."),
    "Le hausa est la langue que nos modèles servent aujourd’hui, avec le français pour la traduction. Notre programme zarma démarre.",
    "Aïr, notre modèle de conversation, est un aperçu de recherche.",
    "Nous choisissons nos premiers partenaires pilotes en ce moment. Cette page décrit comment nous travaillerons avec eux, pas des déploiements passés.",
  ],
  researchH: "La recherche derrière",
  researchSub: "Cinq programmes de recherche, de la façon dont les gens se passent la parole à la façon dont on mesure la parole, et les travaux qu’ils publient.",
  progLabel: "Programmes", latestLabel: "Les dernières publications du Lab", allResearch: "Toute la recherche",
  faqH: "Questions",
  faq: [
    ["Dans quelles langues travaillez-vous ?", "Le hausa aujourd’hui, avec le français pour la traduction. Le programme zarma du Lab démarre, et nous travaillons sur les langues du Sahel une à une. Dites-nous de quelles langues votre programme a besoin."],
    ["Dans quels pays travaillez-vous ?", "Nous commençons au Niger et travaillons dans la région où l’on parle hausa et zarma. Dites-nous où se déroule votre programme."],
    ["Combien cela coûte-t-il ?", "L’API est gratuite pendant sa bêta, jusqu’à 30 minutes d’audio par mois et par compte. Les pilotes, la recherche et les partenariats de données sont convenus avec chaque organisation."],
    ["Faut-il une équipe technique ?", "Non. Nous pouvons vous aider à concevoir le pilote et à en construire la première version avec vous. Si vous avez des développeurs, ils peuvent commencer tout de suite avec l’API."],
    ["Que deviennent nos données ?", "Les enregistrements et transcriptions que vous partagez ne servent qu’aux usages convenus par écrit pour votre projet, puis sont rendus ou supprimés. Rien de ce que vous partagez n’entraîne un modèle sans votre accord explicite."],
    ["Qui peut devenir partenaire du Lab ?", "Les ONG, les organisations internationales, les institutions publiques, les entreprises et les universités qui travaillent avec des communautés parlant les langues du Sahel. Les développeurs peuvent commencer avec l’API sans partenariat."],
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
