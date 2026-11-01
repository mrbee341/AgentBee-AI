import { z } from 'zod';
import { config } from '../config.js';

export const MODEL_ID = 'anthropic/claude-3.5-sonnet';
const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const REQUEST_TIMEOUT_MS = 45_000;
const MAX_OUTPUT_TOKENS = 1024;

export class AiNotConfiguredError extends Error {
  constructor() {
    super('OPENROUTER_API_KEY is not set');
  }
}

export type ToolCall = {
  id: string;
  type?: string;
  function: { name: string; arguments: string };
};

export type ChatMessage =
  | { role: 'system' | 'user'; content: string }
  | { role: 'assistant'; content: string | null; tool_calls?: ToolCall[] }
  | { role: 'tool'; tool_call_id: string; content: string };

export type ToolSpec = {
  type: 'function';
  function: { name: string; description: string; parameters: Record<string, unknown> };
};

const toolCallSchema = z.object({
  id: z.string(),
  type: z.string().optional(),
  function: z.object({ name: z.string(), arguments: z.string() }),
});

const responseSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({
          content: z.string().nullable().optional(),
          tool_calls: z.array(toolCallSchema).optional(),
        }),
      }),
    )
    .min(1),
});

export async function callModel(
  messages: ChatMessage[],
  tools: ToolSpec[],
): Promise<{ content: string | null; toolCalls: ToolCall[] }> {
  const apiKey = config.OPENROUTER_API_KEY;
  if (!apiKey) throw new AiNotConfiguredError();

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL_ID,
      messages,
      tools,
      tool_choice: 'auto',
      max_tokens: MAX_OUTPUT_TOKENS,
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    console.error(`OpenRouter ${response.status} for model ${MODEL_ID}: ${detail}`);
    throw new Error(`OpenRouter request failed with status ${response.status}`);
  }

  const parsed = responseSchema.safeParse(await response.json());
  if (!parsed.success) throw new Error('OpenRouter returned an unexpected response');

  const [choice] = parsed.data.choices;
  if (!choice) throw new Error('OpenRouter returned no choices');
  return {
    content: choice.message.content ?? null,
    toolCalls: choice.message.tool_calls ?? [],
  };
}
