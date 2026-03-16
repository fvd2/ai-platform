import { Injectable, inject, signal, computed } from '@angular/core';
import { ApiService } from './api.service';
import { Conversation } from '../models/conversation.model';
import { Message } from '../models/message.model';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly api = inject(ApiService);

  readonly conversations = signal<Conversation[]>([]);
  readonly activeConversation = signal<Conversation | null>(null);
  readonly messages = signal<Message[]>([]);
  readonly streamingContent = signal('');
  readonly isStreaming = signal(false);
  readonly error = signal<string | null>(null);

  private abortController: AbortController | null = null;

  readonly hasActiveConversation = computed(() => this.activeConversation() !== null);

  async loadConversations(): Promise<void> {
    const data = await this.api.get<Conversation[]>('/chat');
    this.conversations.set(data);
  }

  async createConversation(): Promise<Conversation> {
    const conversation = await this.api.post<Conversation>('/chat');
    this.conversations.update((list) => [conversation, ...list]);
    this.activeConversation.set(conversation);
    this.messages.set([]);
    return conversation;
  }

  async selectConversation(id: string): Promise<void> {
    const conversation = this.conversations().find((c) => c.id === id);
    if (!conversation) return;

    this.activeConversation.set(conversation);
    const msgs = await this.api.get<Message[]>(`/chat/${id}/messages`);
    this.messages.set(msgs);
  }

  async deleteConversation(id: string): Promise<void> {
    await this.api.delete(`/chat/${id}`);
    this.conversations.update((list) => list.filter((c) => c.id !== id));
    if (this.activeConversation()?.id === id) {
      this.activeConversation.set(null);
      this.messages.set([]);
    }
  }

  async sendMessage(content: string): Promise<void> {
    const conversation = this.activeConversation();
    if (!conversation) return;

    // Add user message to local state immediately
    const userMessage: Message = {
      id: crypto.randomUUID(),
      conversationId: conversation.id,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    };
    this.messages.update((msgs) => [...msgs, userMessage]);
    this.isStreaming.set(true);
    this.streamingContent.set('');

    this.abortController = new AbortController();
    this.error.set(null);

    try {
      const response = await this.api.streamPost(
        `/chat/${conversation.id}/stream`,
        { message: content },
        this.abortController.signal,
      );

      if (!response.ok) {
        throw new Error(`Stream failed: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data) as { text?: string; done?: boolean; error?: string };
            if (parsed.error) {
              throw new Error(parsed.error);
            }
            if (parsed.text) {
              fullContent += parsed.text;
              this.streamingContent.set(fullContent);
            }
          } catch (e) {
            if (e instanceof Error && e.message !== 'Unexpected end of JSON input') {
              throw e;
            }
          }
        }
      }

      // Add the complete assistant message
      if (fullContent) {
        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          conversationId: conversation.id,
          role: 'assistant',
          content: fullContent,
          createdAt: new Date().toISOString(),
        };
        this.messages.update((msgs) => [...msgs, assistantMessage]);
      }

      // Update conversation title if it was the first message
      await this.loadConversations();
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Stream error:', error);
        this.error.set('Failed to get a response. Please try again.');
      }
    } finally {
      this.isStreaming.set(false);
      this.streamingContent.set('');
      this.abortController = null;
    }
  }

  cancelStream(): void {
    this.abortController?.abort();
  }

  clearError(): void {
    this.error.set(null);
  }
}
