import type { Api } from 'grammy';
import { recordMessage } from '../db/messages.js';
import { splitIntoChunks } from '../lib/text.js';
import { assembleContext } from './context.js';
import { AiNotConfiguredError, callModel, type ChatMessage } from './openrouter.js';
import { MODEL_TOOLS, runModelTool, type ToolRunContext } from './tools.js';

const MAX_TOOL_ROUNDS = 4;
const MAX_REPLY_CHUNKS = 3;
const MAX_CHUNK_CHARS = 3_500;

const NOT_CONFIGURED = 'AI replies are not switched on yet, so I cannot answer in full right now.';
const FAILED = 'Sorry, I could not finish that just now. Please try again in a moment.';
const OUT_OF_STEPS = 'I could not finish that in the steps I had. Try asking in a smaller piece.';

export async function runAgentTurn(input: {
  api: Api;
  userId: string;
  chatId: number;
  sourceMessageId: number;
  currentMessageId: string;
  text: string;
}): Promise<void> {
  try {
    const reply = await produceReply(input);
    await sendReply(input, reply);
  } catch (err) {
    if (err instanceof AiNotConfiguredError) {
      await input.api.sendMessage(input.chatId, NOT_CONFIGURED).catch(logSendFailure);
      return;
    }
    console.error('Agent turn failed:', err);
    await input.api.sendMessage(input.chatId, FAILED).catch(logSendFailure);
  }
}

async function produceReply(input: {
  api: Api;
  userId: string;
  chatId: number;
  sourceMessageId: number;
  currentMessageId: string;
  text: string;
}): Promise<string> {
  await input.api.sendChatAction(input.chatId, 'typing');
  const conversation: ChatMessage[] = await assembleContext({
    userId: input.userId,
    userText: input.text,
    currentMessageId: input.currentMessageId,
  });

  const toolContext: ToolRunContext = {
    api: input.api,
    userId: input.userId,
    chatId: input.chatId,
    sourceMessageId: input.sourceMessageId,
  };

  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    const { content, toolCalls } = await callModel(conversation, MODEL_TOOLS);
    if (toolCalls.length === 0) return content?.trim() || 'I have nothing to add to that.';

    conversation.push({ role: 'assistant', content, tool_calls: toolCalls });
    for (const call of toolCalls) {
      const result = await runModelTool(toolContext, call.function.name, call.function.arguments);
      conversation.push({ role: 'tool', tool_call_id: call.id, content: result });
    }
  }
  return OUT_OF_STEPS;
}

async function sendReply(
  input: { api: Api; userId: string; chatId: number },
  reply: string,
): Promise<void> {
  let firstMessageId: number | null = null;
  for (const chunk of splitIntoChunks(reply, MAX_REPLY_CHUNKS, MAX_CHUNK_CHARS)) {
    const sent = await input.api.sendMessage(input.chatId, chunk);
    firstMessageId ??= sent.message_id;
  }
  if (firstMessageId === null) return;
  await recordMessage({
    userId: input.userId,
    chatId: input.chatId,
    telegramMessageId: firstMessageId,
    role: 'agent',
    content: reply,
  });
}

function logSendFailure(err: unknown): void {
  console.error('Could not send agent notice:', err);
}
