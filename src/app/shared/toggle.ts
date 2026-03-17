import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-toggle',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      class="toggle"
      [class.toggle--checked]="checked()"
      [class.toggle--disabled]="disabled()"
      [disabled]="disabled()"
      (click)="toggled.emit(!checked())"
      role="switch"
      [attr.aria-checked]="checked()"
    >
      <span class="toggle__track">
        <span class="toggle__thumb"></span>
      </span>
    </button>
  `,
  styles: `
    @use 'styles/variables' as *;

    .toggle {
      display: inline-flex;
      padding: 0;
      background: none;
      border: none;
      cursor: pointer;

      &:focus-visible .toggle__track {
        box-shadow: 0 0 0 3px var(--color-primary-light);
      }
    }

    .toggle__track {
      position: relative;
      width: 42px;
      height: 24px;
      border-radius: $radius-full;
      background: var(--color-border);
      transition: background $transition-base;
    }

    .toggle__thumb {
      position: absolute;
      top: 3px;
      left: 3px;
      width: 18px;
      height: 18px;
      border-radius: $radius-full;
      background: #fff;
      transition: transform $transition-base;
      box-shadow: $shadow-sm;
    }

    .toggle--checked {
      .toggle__track {
        background: var(--color-primary);
      }

      .toggle__thumb {
        transform: translateX(18px);
      }
    }

    .toggle--disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `,
})
export class ToggleComponent {
  readonly checked = input.required<boolean>();
  readonly disabled = input<boolean>(false);

  readonly toggled = output<boolean>();
}
