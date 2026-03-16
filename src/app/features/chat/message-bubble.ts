import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Message } from '../../core/models/message.model';

@Component({
  selector: 'app-message-bubble',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bubble" [class.bubble--user]="message().role === 'user'">
      <div class="bubble__role">{{ message().role === 'user' ? 'You' : 'AI' }}</div>
      <div class="bubble__content">{{ message().content }}</div>
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
      white-space: pre-wrap;
      word-break: break-word;

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
    }
  `,
})
export class MessageBubbleComponent {
  readonly message = input.required<Message>();
}
