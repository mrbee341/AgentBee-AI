export type FactCandidate = {
  key: string;
  value: string;
  confidence: number;
};

const EXPLICIT_CONFIDENCE = 0.9;
const MAX_CANDIDATES_PER_MESSAGE = 5;
const CLAUSE = '([^.!?\\n]{2,80})';

const RULES: Array<{ pattern: RegExp; build: (match: RegExpMatchArray) => FactCandidate[] }> = [
  {
    pattern: /\b(?:[Mm]y name is|[Cc]all me)\s+([A-Z][A-Za-z'-]{1,29})\b/g,
    build: ([, name]) => [{ key: 'name', value: `Name is ${name}`, confidence: EXPLICIT_CONFIDENCE }],
  },
  {
    pattern: new RegExp(`\\bI(?:'m| am) allergic to\\s+${CLAUSE}`, 'gi'),
    build: ([, list = '']) =>
      splitList(list).map((item) => ({
        key: `allergy:${slugify(item)}`,
        value: `Allergic to ${item}`,
        confidence: EXPLICIT_CONFIDENCE,
      })),
  },
  {
    pattern: /\bI(?:'m| am) (vegan|vegetarian|pescatarian|gluten[- ]free)\b/gi,
    build: ([, diet = '']) => [
      {
        key: 'diet',
        value: `Follows a ${diet.toLowerCase()} diet`,
        confidence: EXPLICIT_CONFIDENCE,
      },
    ],
  },
  {
    pattern: new RegExp(`\\bI prefer\\s+${CLAUSE}`, 'gi'),
    build: ([, item = '']) => [
      { key: `preference:${slugify(item)}`, value: `Prefers ${item}`, confidence: EXPLICIT_CONFIDENCE },
    ],
  },
  {
    pattern: new RegExp(`\\bI (?:don't|do not) eat\\s+${CLAUSE}`, 'gi'),
    build: ([, item = '']) => [
      { key: `dislike:${slugify(item)}`, value: `Doesn't eat ${item}`, confidence: EXPLICIT_CONFIDENCE },
    ],
  },
  {
    pattern: new RegExp(`\\bI(?:'m| am) (?:working on|building)\\s+${CLAUSE}`, 'gi'),
    build: ([, item = '']) => [
      { key: `project:${slugify(item)}`, value: `Working on ${item}`, confidence: EXPLICIT_CONFIDENCE },
    ],
  },
];

export function extractFacts(text: string): FactCandidate[] {
  const byKey = new Map<string, FactCandidate>();

  for (const rule of RULES) {
    for (const match of text.matchAll(rule.pattern)) {
      for (const candidate of rule.build(match)) {
        if (candidate.key.endsWith(':') || byKey.has(candidate.key)) continue;
        byKey.set(candidate.key, candidate);
      }
    }
  }

  return [...byKey.values()].slice(0, MAX_CANDIDATES_PER_MESSAGE);
}

function splitList(list: string): string[] {
  return list
    .split(/,| and /i)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}
