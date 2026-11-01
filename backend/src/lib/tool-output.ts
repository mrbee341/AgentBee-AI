import { truncate } from './text.js';

const INSTRUCTION_LINE_PATTERNS = [
  /ignore\s+(all\s+|any\s+|the\s+)?(previous|prior|above|earlier)\s+(instructions|messages|prompts|rules)/i,
  /disregard\s+(all\s+|any\s+|the\s+)?(previous|prior|above|earlier)/i,
  /^\s*(system|assistant|developer)\s*:/i,
  /\byou\s+are\s+now\b/i,
  /\bnew\s+instructions?\s*:/i,
];

const SECRET_PATTERNS = [
  /\b\d{6,12}:[A-Za-z0-9_-]{30,}\b/g,
  /\bsk-[A-Za-z0-9_-]{16,}\b/g,
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
  /\b[a-z][a-z0-9+.-]*:\/\/[^\s:@/]+:[^\s@/]+@\S+/gi,
  /\b[A-Fa-f0-9]{40,}\b/g,
];

const DELIMITER_TAG = /<\/?\s*tool_output\b/gi;

export type SanitizedOutput = {
  text: string;
  strippedLines: number;
  redactions: number;
  truncated: boolean;
};

export function sanitizeToolOutput(raw: string, maxChars: number): SanitizedOutput {
  let strippedLines = 0;
  let redactions = 0;

  const kept = raw.split('\n').filter((line) => {
    if (INSTRUCTION_LINE_PATTERNS.some((pattern) => pattern.test(line))) {
      strippedLines += 1;
      return false;
    }
    return true;
  });

  let text = kept.join('\n').replace(DELIMITER_TAG, '[tag]');
  for (const pattern of SECRET_PATTERNS) {
    text = text.replace(pattern, () => {
      redactions += 1;
      return '[redacted]';
    });
  }

  const truncated = text.length > maxChars;
  return { text: truncate(text, maxChars), strippedLines, redactions, truncated };
}

export function wrapUntrusted(toolName: string, sanitized: SanitizedOutput): string {
  const notes: string[] = [];
  if (sanitized.strippedLines > 0) notes.push(`${sanitized.strippedLines} instruction-like line(s) removed`);
  if (sanitized.redactions > 0) notes.push(`${sanitized.redactions} secret-like value(s) redacted`);
  if (sanitized.truncated) notes.push('output truncated');
  const header = notes.length > 0 ? `Notes: ${notes.join('; ')}.\n` : '';
  return `${header}<tool_output tool="${toolName}" trust="untrusted">\n${sanitized.text}\n</tool_output>`;
}
