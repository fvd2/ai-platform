import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Message } from '../../core/models/message.model';
import { ArtifactCardComponent } from '../../shared/artifact-card';

interface MessageSegment {
  type: 'text' | 'artifact';
  content: string;
  language?: string;
  title?: string;
}

@Component({
  selector: 'app-message-bubble',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ArtifactCardComponent],
  template: `
    <div class="bubble" [class.bubble--user]="message().role === 'user'">
      <div class="bubble__role">{{ message().role === 'user' ? 'You' : 'AI' }}</div>
      <div class="bubble__content">
        @for (segment of segments(); track $index) {
          @if (segment.type === 'text') {
            <span class="bubble__text">{{ segment.content }}</span>
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
  `,
  styles: `
    @use 'styles/variables' as *;

    .bubble {
      max-width: 80%;
      padding: $spacing-sm $spacing-md;
      border-radius: $radius-lg;
      background: var(--color-bg-primary);
      border: 1px solid var(--color-border-light);
      word-break: break-word;

      @include mobile {
        max-width: 95%;
      }

      &--user {
        margin-left: auto;
        background: var(--color-primary);
        color: var(--color-primary-text);
        border-color: transparent;
      }
    }

    .bubble__role {
      font-size: var(--text-xs);
      font-weight: var(--font-weight-semibold);
      margin-bottom: $spacing-2xs;
      opacity: 0.7;
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
    }
  `,
})
export class MessageBubbleComponent {
  readonly message = input.required<Message>();

  readonly segments = computed<MessageSegment[]>(() => {
    const msg = this.message();
    if (msg.role === 'user') {
      return [{ type: 'text', content: msg.content }];
    }
    return parseMessageSegments(msg.content);
  });
}

const CODE_BLOCK_REGEX = /```(\w*)\n([\s\S]*?)```/g;
const MIN_CODE_LINES = 5;

function parseMessageSegments(content: string): MessageSegment[] {
  const segments: MessageSegment[] = [];
  let lastIndex = 0;

  for (const match of content.matchAll(CODE_BLOCK_REGEX)) {
    const matchStart = match.index;
    const language = match[1] || '';
    const code = match[2].trimEnd();
    const lineCount = code.split('\n').length;

    // Text before the code block
    if (matchStart > lastIndex) {
      const text = content.slice(lastIndex, matchStart).trim();
      if (text) {
        segments.push({ type: 'text', content: text });
      }
    }

    if (lineCount >= MIN_CODE_LINES) {
      // Promote to artifact
      const ext = language || 'txt';
      segments.push({
        type: 'artifact',
        content: code,
        language,
        title: `snippet.${ext}`,
      });
    } else {
      // Keep as inline text
      segments.push({ type: 'text', content: '```' + language + '\n' + code + '\n```' });
    }

    lastIndex = matchStart + match[0].length;
  }

  // Remaining text
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
