import { InlineKeyboard } from 'grammy';
import type { Screen } from '../lib/screen.js';
import { APPROVAL_TTL_SECONDS } from './ledger.js';

export function approvalScreen(input: {
  title: string;
  preview: string;
  token: string;
  editable: boolean;
}): Screen {
  const minutes = Math.round(APPROVAL_TTL_SECONDS / 60);
  const text = [
    `Approval needed: ${input.title}`,
    '',
    input.preview,
    '',
    `Approve within ${minutes} minutes, or reply yes or no.`,
  ].join('\n');

  const keyboard = new InlineKeyboard().text('Approve', `ap:y:${input.token}`);
  if (input.editable) keyboard.text('Edit', `ap:e:${input.token}`);
  keyboard.text('Reject', `ap:n:${input.token}`);

  return { text, keyboard };
}
