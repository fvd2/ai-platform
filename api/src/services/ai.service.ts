import { streamText, generateText, type CoreTool } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { createTrace, type TraceData } from './trace.service.js';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface GenerateResponseResult {
  text: string;
  tokenUsage: number;
}

export interface TracedStreamResult {
  fullStream: ReturnType<typeof streamText>['fullStream'];
  finalize: (fullContent: string) => Promise<void>;
}

const MODEL_ID = 'claude-sonnet-4-20250514';

const SYSTEM_PROMPT = `You are a helpful AI research assistant. You help with research, analysis, shopping tips, study topics, and general questions. Be concise, accurate, and actionable. Use markdown formatting for structure when helpful.`;

export function streamChatResponse(
  messages: ChatMessage[],
  traceContext?: { sourceId: string },
  tools?: Record<string, CoreTool>,
): TracedStreamResult {
  const startTime = Date.now();
  const userInput =
    messages.filter((m) => m.role === 'user').pop()?.content ?? '';

  const result = streamText({
    model: anthropic(MODEL_ID),
    system: SYSTEM_PROMPT,
    messages,
    maxTokens: 4096,
    ...(tools && { tools }),
  });

  const finalize = async (fullContent: string): Promise<void> => {
    const latencyMs = Date.now() - startTime;

    try {
      const usage = await result.usage;
      const traceData: TraceData = {
        source: 'chat',
        sourceId: traceContext?.sourceId ?? 'unknown',
        model: MODEL_ID,
        systemPrompt: SYSTEM_PROMPT,
        userInput,
        assistantOutput: fullContent,
        inputTokens: usage?.promptTokens,
        outputTokens: usage?.completionTokens,
        totalTokens: (usage?.promptTokens ?? 0) + (usage?.completionTokens ?? 0),
        latencyMs,
        status: 'success',
      };
      createTrace(traceData);
    } catch {
      // Tracing should not break the main flow
    }
  };

  return { fullStream: result.fullStream, finalize };
}

export function recordStreamError(
  messages: ChatMessage[],
  error: string,
  sourceId: string,
  startTime: number,
): void {
  const latencyMs = Date.now() - startTime;
  const userInput =
    messages.filter((m) => m.role === 'user').pop()?.content ?? '';

  try {
    createTrace({
      source: 'chat',
      sourceId,
      model: MODEL_ID,
      systemPrompt: SYSTEM_PROMPT,
      userInput,
      latencyMs,
      status: 'error',
      error,
    });
  } catch {
    // Tracing should not break the main flow
  }
}

export async function generateResponse(
  prompt: string,
  context?: string,
  traceContext?: { source: 'task' | 'trigger'; sourceId: string; runId?: string },
): Promise<GenerateResponseResult> {
  const startTime = Date.now();
  const userContent = context ? `${prompt}\n\n---\nContext:\n${context}` : prompt;

  try {
    const result = await generateText({
      model: anthropic(MODEL_ID),
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContent }],
      maxTokens: 4096,
    });

    const latencyMs = Date.now() - startTime;

    if (traceContext) {
      try {
        createTrace({
          source: traceContext.source,
          sourceId: traceContext.sourceId,
          runId: traceContext.runId,
          model: MODEL_ID,
          systemPrompt: SYSTEM_PROMPT,
          userInput: userContent,
          assistantOutput: result.text,
          inputTokens: result.usage?.promptTokens,
          outputTokens: result.usage?.completionTokens,
          totalTokens: result.usage?.totalTokens ?? 0,
          latencyMs,
          status: 'success',
        });
      } catch {
        // Tracing should not break the main flow
      }
    }

    return {
      text: result.text,
      tokenUsage: result.usage?.totalTokens ?? 0,
    };
  } catch (err: unknown) {
    const latencyMs = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : String(err);

    if (traceContext) {
      try {
        createTrace({
          source: traceContext.source,
          sourceId: traceContext.sourceId,
          runId: traceContext.runId,
          model: MODEL_ID,
          systemPrompt: SYSTEM_PROMPT,
          userInput: userContent,
          latencyMs,
          status: 'error',
          error: errorMessage,
        });
      } catch {
        // Tracing should not break the main flow
      }
    }

    throw err;
  }
}
