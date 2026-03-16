import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const SYSTEM_PROMPT = `You are a helpful AI research assistant. You help with research, analysis, shopping tips, study topics, and general questions. Be concise, accurate, and actionable. Use markdown formatting for structure when helpful.`;

export function streamChatResponse(messages: ChatMessage[]) {
  return streamText({
    model: anthropic('claude-sonnet-4-20250514'),
    system: SYSTEM_PROMPT,
    messages,
    maxTokens: 4096,
  });
}
