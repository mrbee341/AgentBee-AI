import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { z } from 'zod';
import { sanitizeToolOutput, wrapUntrusted } from '../lib/tool-output.js';

const FETCH_TIMEOUT_MS = 8_000;
const FETCH_MAX_BYTES = 200_000;
const OUTPUT_MAX_CHARS = 3_000;
const SEARCH_MAX_RESULTS = 5;

const duckDuckGoSchema = z.object({
  AbstractText: z.string().optional(),
  AbstractURL: z.string().optional(),
  RelatedTopics: z
    .array(z.object({ Text: z.string().optional(), FirstURL: z.string().optional() }).passthrough())
    .optional(),
});

export async function webSearch(query: string): Promise<string> {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
  const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!response.ok) throw new Error(`Search failed with status ${response.status}`);

  const parsed = duckDuckGoSchema.safeParse(await response.json());
  if (!parsed.success) throw new Error('Search returned an unexpected response');

  const lines: string[] = [];
  if (parsed.data.AbstractText) {
    lines.push(`${parsed.data.AbstractText} ${parsed.data.AbstractURL ?? ''}`.trim());
  }
  for (const topic of parsed.data.RelatedTopics ?? []) {
    if (lines.length >= SEARCH_MAX_RESULTS) break;
    if (topic.Text && topic.FirstURL) lines.push(`${topic.Text} ${topic.FirstURL}`);
  }

  if (lines.length === 0) return 'No instant answers were found for that search.';
  return wrapUntrusted('web_search', sanitizeToolOutput(lines.join('\n'), OUTPUT_MAX_CHARS));
}

export async function fetchPage(rawUrl: string): Promise<string> {
  const url = parsePublicHttpsUrl(rawUrl);
  if (!url) throw new Error('Only public https:// addresses can be fetched');
  if (!(await resolvesToPublicAddress(url.hostname))) {
    throw new Error('That address does not resolve to a public server');
  }

  const response = await fetch(url, {
    redirect: 'manual',
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: { 'User-Agent': 'AgentBee/1.0', Accept: 'text/html,text/plain;q=0.9' },
  });
  if (response.status >= 300 && response.status < 400) throw new Error('Redirects are not followed');
  if (!response.ok) throw new Error(`Fetch failed with status ${response.status}`);

  const body = await readCapped(response, FETCH_MAX_BYTES);
  const contentType = response.headers.get('content-type') ?? '';
  const text = contentType.includes('html') ? htmlToText(body) : body;
  return wrapUntrusted('fetch_url', sanitizeToolOutput(text, OUTPUT_MAX_CHARS));
}

function parsePublicHttpsUrl(raw: string): URL | null {
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== 'https:') return null;
    if (url.username || url.password) return null;
    return url;
  } catch {
    return null;
  }
}

async function resolvesToPublicAddress(hostname: string): Promise<boolean> {
  const addresses = isIP(hostname) ? [{ address: hostname }] : await lookup(hostname, { all: true });
  return addresses.every(({ address }) => !isPrivateAddress(address));
}

function isPrivateAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) {
    const [a = 0, b = 0] = address.split('.').map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127)
    );
  }
  if (version === 6) {
    const lower = address.toLowerCase();
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(lower);
    if (mapped?.[1]) return isPrivateAddress(mapped[1]);
    return lower === '::' || lower === '::1' || /^f[cd]/.test(lower) || /^fe[89ab]/.test(lower);
  }
  return true;
}

async function readCapped(response: Response, maxBytes: number): Promise<string> {
  if (!response.body) return '';
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (total < maxBytes) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.byteLength;
  }
  await reader.cancel();
  return Buffer.concat(chunks).subarray(0, maxBytes).toString('utf8');
}

function htmlToText(html: string): string {
  return html
    .replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
}
