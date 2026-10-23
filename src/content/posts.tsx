import type { ReactNode } from "react";
import { introducing, fleursNote, strictFolded } from "./posts-new";

export type Post = {
  slug: string;
  title: string;
  dek: string;
  date: string;          // ISO
  readMinutes: number;
  kind: "Research" | "Story" | "Log";
  programme?: string;    // programme slug
  authors: string[];
  team?: string;
  artefacts: { label: string; href: string }[];
  sections: { id: string; title: string }[];
  origin?: { label: string; href: string };
  body: ReactNode;
};

/* First published on namu-ai.org (19 September 2025) by Abdourahamane Ide Salifou.
   Lightly edited for the Lab: section headings added for navigation, the closing lessons set as a
   list, the measurement conditions set as a callout (all facts from the original), one grammar fix. */
const swahili: Post = {
  slug: "swahili-asr-challenge",
  title: "Winning the Swahili ASR challenge on a single 16GB GPU",
  dek: "How a machine learns to understand speech from buses, markets and busy offices. First place at 17.81% word error rate on the competition’s private leaderboard, trained on a single borrowed GPU.",
  date: "2025-09-19",
  readMinutes: 6,
  kind: "Research",
  authors: ["Abdourahamane Ide Salifou"],
  artefacts: [{ label: "Code", href: "https://github.com/SalifouAbdourahamane/swahili_asr_sota_model" }],
  origin: { label: "First published on namu-ai.org", href: "https://www.namu-ai.org/blog/swahili-asr-challenge" },
  sections: [
    { id: "real-speech", title: "Real speech" },
    { id: "starting-point", title: "Starting point" },
    { id: "noise", title: "Expecting noise" },
    { id: "one-gpu", title: "One GPU" },
    { id: "decoding", title: "Decoding" },
    { id: "what-it-means", title: "What 17.81% means" },
    { id: "lessons", title: "Lessons for Hausa" },
  ],
  body: (
    <>
      <p>Have you ever wondered how a machine learns to understand a language, not from text typed neatly on a screen, but from real human speech spoken in buses, markets, busy offices, or quiet homes? Speech full of interruptions, background noise, accents, laughter, and hesitation?</p>
      <p>That was the question we wanted to answer when we entered the AI for Good Swahili ASR Challenge on Zindi. We ended up winning the competition.</p>
      <p>Our system achieved a word error rate of 17.81% on the private leaderboard and 18.22% on the public leaderboard. It processed each recording in about 1.24 seconds and transcribed the full test set of 4,089 recordings in one hour and twenty-four minutes. We trained the entire system using a single borrowed GPU.</p>
      <p>But the score is not the most important part of this work.</p>
      <p>What mattered to us was that the challenge reflected many of the same conditions we face when building speech technology for African languages: noisy recordings, limited computing power, and languages that are still poorly represented in the largest AI models.</p>

      <h2 id="real-speech">Real speech, not read speech</h2>
      <p>Swahili is not Hausa, but many of the technical problems are similar. Much of the speech data available online is read speech. Someone sits in a quiet room, uses a good microphone, and reads prepared sentences. This data is clean and easy to label, but models trained only on it often struggle when they hear real conversations.</p>
      <p>Real people pause, interrupt each other, change their minds, speak in different accents, and pronounce words differently depending on where they come from. They also speak in places with traffic, music, wind, markets, and other people talking nearby.</p>
      <p>For this reason, we trained our model using Sunbird’s SALT dataset, a conversational Swahili corpus with several speakers and natural dialogue. The data was more difficult to work with, but it was much closer to the environment in which the model would eventually be used.</p>

      <h2 id="starting-point">Starting from a distilled model</h2>
      <p>We did not train the model from the beginning. We started with a distilled Whisper checkpoint that had already been trained on Swahili data from Common Voice 12. This gave the model a basic understanding of how Swahili sounds before we began fine-tuning it.</p>
      <p>A distilled model is a smaller model trained to reproduce much of the performance of a larger one. It requires less memory and computing power while keeping much of the original model’s accuracy.</p>
      <p>This was important because the challenge was not simply to build an accurate system. The system also needed to be small and efficient enough to run on a device instead of depending on a large cloud server. Since the starting model already understood some Swahili, we could focus our limited training resources on helping it handle real conversations and difficult audio.</p>

      <h2 id="noise">Training the model to expect noise</h2>
      <p>One common way to handle noisy recordings is to clean the audio before transcription. The system tries to remove the sound of traffic, markets, or other conversations before sending the recording to the speech model.</p>
      <p>We took a different approach. Instead of trying to remove the noise, we trained the model to expect it.</p>
      <p>During training, our custom data collator selected sounds from a collection of urban East African noise, including traffic, markets, and nearby conversations. It mixed those sounds into the training recordings at different volume levels. The model heard a different combination each time. It could not simply memorize one kind of background noise. It had to learn how to recognize speech even when other sounds were present.</p>
      <p>This may be the most important part of the entire system. A model that has only heard clean studio recordings will struggle the first time someone tries to use it on a bus, beside a road, or inside a busy market.</p>

      <h2 id="one-gpu">One borrowed GPU</h2>
      <p>We trained the model on a single NVIDIA T4 GPU with 16 GB of memory using a free Kaggle notebook. That limitation shaped the way we built the system.</p>
      <p>Instead of updating every part of Whisper, we froze the main model and trained small LoRA adapters inside its attention layers. This allowed us to adjust the model while training only a small percentage of its parameters. We also loaded the model in 8-bit precision to reduce its memory requirements. Mixed-precision training and gradient checkpointing helped us save even more memory.</p>
      <p>With these changes, we trained with a batch size of four and used gradient accumulation to reach an effective batch size of eight. We used a learning rate of 1e-5, 500 warm-up steps, and selected the checkpoint with the lowest validation error.</p>
      <p>These methods are not unusual or experimental. They are standard tools for training models with limited resources. That is exactly why they matter. Building a competitive speech model for an under-resourced language did not require access to a large research laboratory. We trained it using hardware that a student could access for free. For many people working on African languages, that is the reality.</p>

      <h2 id="decoding">Decoding</h2>
      <p>During transcription, we used beam search with three possible outputs and a repetition penalty of 1.2.</p>
      <p>A simpler method, called greedy decoding, chooses the most likely next word at every step and never goes back. This can work well on clean audio. On noisy recordings, however, the model may make an early mistake, lose track of the sentence, and begin repeating the same words. Beam search keeps several possible transcriptions open at the same time. This requires slightly more processing, but it gives the model a better chance of recovering from uncertainty.</p>
      <p>We did not use a separate language model or combine several models into an ensemble. Both approaches might have improved the final score, but they would also have made the system larger and more difficult to deploy. Our goal was not only to perform well on the leaderboard. We wanted to build something that could realistically be used.</p>

      <h2 id="what-it-means">What 17.81% means</h2>
      <p>A word error rate of 17.81% means that roughly one out of every six words is transcribed incorrectly. That is not accurate enough for tasks that require a perfect written record, such as professional dictation. But it can still be useful when the goal is to understand what someone is asking.</p>
      <p>Even when one word is incorrect, the rest of the sentence often provides enough context to understand the speaker’s meaning. This distinction between producing a perfect transcript and understanding a person’s request is important for the systems we are building.</p>
      <div className="callout"><span className="label">Conditions</span>The result belongs to the competition’s test set: 4,089 recordings, 16 kHz mono, a little over six seconds on average, scored by the organiser on Zindi’s private leaderboard. We would not expect the same result from every microphone, dialect, speaker or environment.</div>

      <h2 id="lessons">Four lessons we are applying to Hausa</h2>
      <ol>
        <li>Conversational data is more valuable than perfectly clean recordings when the system will be used in real conversations.</li>
        <li>Noise should be part of the training process. We cannot assume that people will always speak from quiet rooms or through expensive microphones.</li>
        <li>Parameter-efficient fine-tuning makes serious speech research possible without large computing budgets. This is especially important for the researchers and communities closest to under-resourced languages.</li>
        <li>Decoding matters. On difficult audio, the difference between greedy decoding and beam search can be the difference between a useful answer and a repeated sentence that goes nowhere.</li>
      </ol>
      <p>Hausa faces many of the same challenges as Swahili, but with even fewer datasets, models, and technical resources available.</p>
      <p>The complete training and inference code is available at <a href="https://github.com/SalifouAbdourahamane/swahili_asr_sota_model">github.com/SalifouAbdourahamane/swahili_asr_sota_model</a>. A more detailed technical explanation of the solution is also available on Zindi.</p>
    </>
  ),
};

export const posts: Post[] = [introducing, fleursNote, strictFolded, swahili];
export const postBySlug = (slug: string) => posts.find(p => p.slug === slug);
