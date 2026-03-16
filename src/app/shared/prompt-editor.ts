import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-prompt-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="prompt-editor">
      <label class="prompt-editor__label">{{ label() }}</label>
      <textarea
        class="prompt-editor__textarea"
        [rows]="rows()"
        [value]="value()"
        [placeholder]="placeholder()"
        (input)="valueChange.emit($any($event.target).value)"
      ></textarea>
    </div>
  `,
  styles: `
    @use 'styles/variables' as *;

    .prompt-editor__label {
      display: block;
      font-size: var(--text-sm);
      font-weight: var(--font-weight-medium);
      color: var(--color-text-primary);
      margin-bottom: $spacing-xs;
    }

    .prompt-editor__textarea {
      width: 100%;
      resize: vertical;
      padding: $spacing-sm $spacing-md;
      border: 1px solid var(--color-border);
      border-radius: $radius-md;
      font-family: var(--font-family);
      font-size: var(--text-sm);
      line-height: var(--line-height-relaxed);
      min-height: 120px;

      &:focus {
        border-color: var(--color-border-focus);
        box-shadow: 0 0 0 3px var(--color-primary-light);
        outline: none;
      }

      &::placeholder {
        color: var(--color-text-muted);
      }
    }
  `,
})
export class PromptEditorComponent {
  readonly value = input<string>('');
  readonly placeholder = input<string>('Enter your AI prompt...');
  readonly label = input<string>('Prompt');
  readonly rows = input<number>(6);

  readonly valueChange = output<string>();
}
