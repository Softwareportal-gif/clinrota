import { LOGIN_ACCESS_FAQ, type FaqItem } from "@/lib/faq";
import { USING_PRAXXT_SECTIONS } from "@/lib/help-content";

// Beatrice without an AI model: answers a question by finding the help
// entry whose wording best matches it, so she works at no cost when no
// ANTHROPIC_API_KEY is configured (and as a fallback if the API fails).
// She only ever repeats written help content — never anything clinical.

type Entry = FaqItem & { section: string };

const ENTRIES: Entry[] = [
  ...LOGIN_ACCESS_FAQ.map((item) => ({ ...item, section: "login" })),
  ...USING_PRAXXT_SECTIONS.flatMap((s) => s.items.map((item) => ({ ...item, section: s.id }))),
];

// Sections written for one role rank a little higher for that role.
const SECTION_ROLE: Record<string, string> = {
  students: "STUDENT",
  supervisors: "SUPERVISOR",
  coordinators: "COORDINATOR",
};

// Everyday phrasings → the word the help content uses. Applied before
// splitting into words, so multi-word phrases are caught.
const PHRASES: [RegExp, string][] = [
  [/\b(log(ging)?[ -]?in|log[ -]?on|sign(ing)?[ -]?in|signin|login|logon|access my account|get in)\b/g, " signin "],
  [/\b(sign[ -]?up|create (an )?account|register)\b/g, " account signup "],
  [/\b(pass ?word|pwd|passcode|pin code)\b/g, " password "],
  [/\b(curriculum vitae|resume|résumé)\b/g, " cv "],
  [/\b(clinical log|log ?book|case log|patient log|encounters?)\b/g, " logbook case "],
  [/\b(postings?|attachments?|clinicals?|allocations?)\b/g, " placement rotation "],
  [/\b(preceptors?|clinical instructors?|mentors?)\b/g, " supervisor "],
  [/\b(dm|chat|text)\b/g, " message "],
  [/\b(invitation|invite link|activation)\b/g, " invite "],
  [/\b(immuni[sz]ations?|vaccinations?|bls|cpr|certificates?)\b/g, " document compliance "],
  [/\b(year levels?|levels?|class(es)?|batch(es)?|intakes?)\b/g, " cohort level "],
  [/\b(grades?|marks?|results?)\b/g, " score "],
  [/\b(hours|attendance|clock(ed)?)\b/g, " timesheet hours "],
  [/\b(no internet|without internet|no network|no data|no signal)\b/g, " offline "],
];

const STOPWORDS = new Set(
  (
    "a an the and or but if to of in on at for from by with about as is are was were be been being am do does did " +
    "doing have has had i me my mine we our you your he she they them it its this that these those there here " +
    "what which who whom how why when where can could would should will shall may might must please hi hello hey " +
    "want need get got go going make thing things some any just also very really so not no yes up out into than then " +
    "know tell help im ive dont cant wont " +
    // Nearly every question mentions Praxxt, so it can't tell entries apart.
    "praxxt"
  ).split(" ")
);

function stem(word: string): string {
  if (word.length <= 3) return word;
  if (word.endsWith("ies") && word.length > 4) return `${word.slice(0, -3)}y`;
  if (word.endsWith("ing") && word.length > 5) return word.slice(0, -3);
  if (word.endsWith("ed") && word.length > 4) return word.slice(0, -2);
  if (word.endsWith("es") && /(ss|x|ch|sh)es$/.test(word)) return word.slice(0, -2);
  if (word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

function tokens(text: string): string[] {
  let t = ` ${text.toLowerCase()} `;
  for (const [pattern, replacement] of PHRASES) t = t.replace(pattern, replacement);
  return t
    .replace(/[^a-z0-9@.]+/g, " ")
    .replace(/\.(?=\s|$)/g, " ")
    .split(/\s+/)
    .filter((w) => w && !STOPWORDS.has(w))
    .map(stem);
}

// Per entry: each word's weight (question words count most, then
// keywords, then the answer text).
const INDEX = ENTRIES.map((entry) => {
  const weights = new Map<string, number>();
  const add = (words: string[], w: number) => {
    for (const word of words) weights.set(word, Math.max(weights.get(word) ?? 0, w));
  };
  add(tokens(entry.answer), 0.6);
  add(tokens((entry.keywords ?? []).join(" ")), 2.5);
  add(tokens(entry.question), 3);
  return weights;
});

// Rarer words say more about which entry is meant.
const IDF = (() => {
  const df = new Map<string, number>();
  for (const weights of INDEX) for (const word of weights.keys()) df.set(word, (df.get(word) ?? 0) + 1);
  const idf = new Map<string, number>();
  for (const [word, n] of df) idf.set(word, Math.log(1 + ENTRIES.length / n));
  return idf;
})();

function rank(question: string, role?: string) {
  const words = [...new Set(tokens(question))];
  if (words.length === 0) return [];
  return ENTRIES.map((entry, i) => {
    let score = 0;
    for (const word of words) score += (INDEX[i].get(word) ?? 0) * (IDF.get(word) ?? 0);
    if (role && SECTION_ROLE[entry.section] === role) score *= 1.25;
    // Mild length normalisation so long questions don't win on volume.
    return { entry, score: score / Math.sqrt(words.length) };
  })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);
}

// Below this, the best match is too weak to present as the answer.
const MIN_CONFIDENT_SCORE = 2.2;

const CLINICAL = /\b(dos(e|age|ing)|\d+\s?(mg|mcg|ml)\b|diagnos\w*|treat(ment|ing)?|symptoms?|prescri\w*|antibiotics?|paracetamol|ibuprofen|side[- ]effects?|contraindicat\w*|drug interactions?|blood pressure (is|of)|manage (a|the|this) patient|what (is|are) the (cause|signs))\b/i;
const GREETING = /^\s*(hi+|hello+|hey+|hiya|howdy|good (morning|afternoon|evening)|greetings)\b[\s!.,]*(beatrice)?[\s!.,]*$/i;
const THANKS = /^\s*(thanks?|thank you|thx|ty|ok(ay)?|great|cool|perfect|got it|alright)\b[\s!.,]*(so much|a lot|beatrice)?[\s!.,]*$/i;

function suggestionsFor(role?: string): string[] {
  const section =
    role === "STUDENT" ? "students" : role === "SUPERVISOR" ? "supervisors" : role === "COORDINATOR" ? "coordinators" : "about";
  const fromSection = USING_PRAXXT_SECTIONS.find((s) => s.id === section)?.items ?? [];
  return [...fromSection.slice(0, 2), LOGIN_ACCESS_FAQ[0]].map((i) => i.question);
}

const ABOUT_PRAXXT = ENTRIES.find((e) => e.question === "What is Praxxt?")!;

const bullets = (items: string[]) => items.map((q) => `• ${q}`).join("\n");

export function faqReply(question: string, role?: string): string {
  if (GREETING.test(question)) {
    return `Hello! I can help with using Praxxt. For example:\n${bullets(suggestionsFor(role))}`;
  }
  if (THANKS.test(question)) {
    return "You're welcome! Ask me anything else about using Praxxt.";
  }

  // "What is Praxxt?" and similar leave no words once "Praxxt" and
  // question words are set aside.
  if (tokens(question).length === 0 && /praxxt/i.test(question)) {
    return ABOUT_PRAXXT.answer;
  }

  const ranked = rank(question, role);
  const best = ranked[0];

  if (!best || best.score < MIN_CONFIDENT_SCORE) {
    if (CLINICAL.test(question)) {
      return "I can only help with using Praxxt itself, not clinical questions. Please ask your supervisor or your program about patient care.";
    }
    const closest = ranked.slice(0, 3).map((r) => r.entry.question);
    return [
      "I'm not sure I have an answer for that.",
      closest.length ? `These might help:\n${bullets(closest)}` : `I can help with things like:\n${bullets(suggestionsFor(role))}`,
      "If not, create a support ticket while signed in, or email hello@praxxt.com, and the Praxxt team will help.",
    ].join("\n\n");
  }

  const related = ranked
    .slice(1, 3)
    .filter((r) => r.score >= best.score * 0.6)
    .map((r) => r.entry.question);
  return related.length ? `${best.entry.answer}\n\nYou might also want to know:\n${bullets(related)}` : best.entry.answer;
}
