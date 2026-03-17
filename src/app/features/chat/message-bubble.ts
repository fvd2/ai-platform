import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Message } from '../../core/models/message.model';
import { DynamicBlock } from '../../core/models/dynamic-block.model';
import { DynamicBlockService } from '../../core/services/dynamic-block.service';
import { ArtifactCardComponent } from '../../shared/artifact-card';
import { DynamicBlockComponent } from '../../shared/blocks/dynamic-block';

interface MessageSegment {
  type: 'text' | 'artifact' | 'dynamic';
  content: string;
  language?: string;
  title?: string;
  block?: DynamicBlock;
}

@Component({
  selector: 'app-message-bubble',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ArtifactCardComponent, DynamicBlockComponent],
  template: `
    <div class="bubble" [class.bubble--user]="message().role === 'user'">
      @if (message().role !== 'user') {
        <div class="bubble__avatar bubble__avatar--ai">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        </div>
      }
      <div class="bubble__body" [class.bubble__body--user]="message().role === 'user'">
        <div class="bubble__content">
          @for (segment of segments(); track $index) {
            @if (segment.type === 'text') {
              <span class="bubble__text">{{ segment.content }}</span>
            } @else if (segment.type === 'dynamic') {
              <app-dynamic-block [block]="segment.block!" />
            } @else {
              <app-artifact-card
                [title]="segment.title || 'Code'"
                [type]="'code'"
                [language]="segment.language || ''"
                [preview]="segment.content.slice(0, 120)"
                [content]="segment.content"
              />
            }
          }
        </div>
      </div>
      @if (message().role === 'user') {
        <div class="bubble__avatar bubble__avatar--user">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
      }
    </div>
  `,
  styles: `
    @use 'styles/variables' as *;

    .bubble {
      display: flex;
      gap: $spacing-sm;
      max-width: 720px;

      @include mobile {
        max-width: 100%;
      }

      &--user {
        margin-left: auto;
        flex-direction: row;
        justify-content: flex-end;
      }
    }

    .bubble__avatar {
      width: 28px;
      height: 28px;
      border-radius: $radius-full;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 2px;

      &--ai {
        background: var(--gradient-primary);
        color: #fff;
      }

      &--user {
        background: var(--color-bg-tertiary);
        color: var(--color-text-secondary);
        border: 1px solid var(--color-border);
      }
    }

    .bubble__body {
      flex: 1;
      min-width: 0;
      padding: $spacing-sm $spacing-md;
      border-radius: $radius-lg;
      background: var(--color-bg-primary);
      border: 1px solid var(--color-border-light);
      box-shadow: $shadow-xs;

      &--user {
        background: var(--color-primary);
        color: var(--color-primary-text);
        border-color: transparent;
        box-shadow: $shadow-sm;
        flex: 0 1 auto;
        max-width: 75%;

        @include mobile {
          max-width: 85%;
        }
      }
    }

    .bubble__content {
      font-size: var(--text-sm);
      line-height: var(--line-height-relaxed);
      display: flex;
      flex-direction: column;
      gap: $spacing-sm;
    }

    .bubble__text {
      white-space: pre-wrap;
      word-break: break-word;
    }
  `,
})
export class MessageBubbleComponent {
  readonly message = input.required<Message>();
  private readonly dynamicBlockService = inject(DynamicBlockService);

  readonly segments = computed<MessageSegment[]>(() => {
    const msg = this.message();
    if (msg.role === 'user') {
      return [{ type: 'text', content: msg.content }];
    }
    return parseMessageSegments(msg.content, this.dynamicBlockService);
  });
}

const CODE_BLOCK_REGEX = /```(\w*)\n([\s\S]*?)```/g;
const MIN_CODE_LINES = 5;

function parseMessageSegments(
  content: string,
  dynamicBlockService: DynamicBlockService,
): MessageSegment[] {
  const segments: MessageSegment[] = [];

  // First: extract dynamic blocks and replace with placeholders
  const dynamicBlocks = dynamicBlockService.parseBlocks(content);
  if (dynamicBlocks.length > 0) {
    let lastIndex = 0;
    for (const parsed of dynamicBlocks) {
      if (parsed.startIndex > lastIndex) {
        const textBefore = content.slice(lastIndex, parsed.startIndex).trim();
        if (textBefore) {
          segments.push(...parseCodeBlocks(textBefore));
        }
      }
      segments.push({ type: 'dynamic', content: '', block: parsed.block });
      lastIndex = parsed.endIndex;
    }
    if (lastIndex < content.length) {
      const remaining = content.slice(lastIndex).trim();
      if (remaining) {
        segments.push(...parseCodeBlocks(remaining));
      }
    }
    return segments.length > 0 ? segments : [{ type: 'text', content }];
  }

  return parseCodeBlocks(content);
}

function parseCodeBlocks(content: string): MessageSegment[] {
  const segments: MessageSegment[] = [];
  let lastIndex = 0;

  for (const match of content.matchAll(CODE_BLOCK_REGEX)) {
    const matchStart = match.index;
    const language = match[1] || '';
    const code = match[2].trimEnd();
    const lineCount = code.split('\n').length;

    if (matchStart > lastIndex) {
      const text = content.slice(lastIndex, matchStart).trim();
      if (text) {
        segments.push({ type: 'text', content: text });
      }
    }

    if (lineCount >= MIN_CODE_LINES) {
      const ext = language || 'txt';
      segments.push({
        type: 'artifact',
        content: code,
        language,
        title: `snippet.${ext}`,
      });
    } else {
      segments.push({ type: 'text', content: '```' + language + '\n' + code + '\n```' });
    }

    lastIndex = matchStart + match[0].length;
  }

  if (lastIndex < content.length) {
    const text = content.slice(lastIndex).trim();
    if (text) {
      segments.push({ type: 'text', content: text });
    }
  }

  if (segments.length === 0) {
    segments.push({ type: 'text', content });
  }

  return segments;
}
