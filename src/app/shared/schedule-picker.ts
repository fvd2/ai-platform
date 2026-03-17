import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

@Component({
  selector: 'app-schedule-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="schedule-picker">
      <div class="schedule-picker__presets">
        @for (preset of presets; track preset.cron) {
          <button
            class="schedule-picker__preset"
            [class.schedule-picker__preset--active]="
              preset.cron ? selectedPreset() === preset.cron : isCustom()
            "
            (click)="onPresetSelect(preset)"
          >
            {{ preset.label }}
          </button>
        }
      </div>
      @if (isCustom()) {
        <input
          class="schedule-picker__input"
          type="text"
          placeholder="* * * * * (cron expression)"
          [value]="customCron()"
          (input)="onCustomChange($any($event.target).value)"
        />
      }
    </div>
  `,
  styles: `
    @use 'styles/variables' as *;

    .schedule-picker__presets {
      display: flex;
      flex-wrap: wrap;
      gap: $spacing-xs;
    }

    .schedule-picker__preset {
      padding: $spacing-xs $spacing-md;
      border: 1px solid var(--color-border);
      border-radius: $radius-full;
      font-size: var(--text-sm);
      background: var(--color-bg-primary);
      color: var(--color-text-secondary);
      cursor: pointer;
      transition: all $transition-fast;

      &:hover:not(.schedule-picker__preset--active) {
        background: var(--color-bg-secondary);
        border-color: var(--color-text-muted);
      }

      &--active {
        background: var(--color-primary);
        color: #fff;
        border-color: var(--color-primary);
      }
    }

    .schedule-picker__input {
      margin-top: $spacing-sm;
      width: 100%;
      padding: $spacing-sm $spacing-md;
      border: 1px solid var(--color-border);
      border-radius: $radius-lg;
      font-family: var(--font-family-mono);
      font-size: var(--text-sm);
      color: var(--color-text-primary);
      background: var(--color-bg-primary);

      &:focus {
        border-color: var(--color-border-focus);
        box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.08);
        outline: none;
      }
    }
  `,
})
export class SchedulePickerComponent {
  readonly schedule = input<string>('');
  readonly scheduleDescription = input<string>('');

  readonly scheduleChange = output<{ schedule: string; description: string }>();

  readonly presets = [
    { label: 'Every 15 minutes', cron: '*/15 * * * *' },
    { label: 'Every hour', cron: '0 * * * *' },
    { label: 'Every day at 9:00 AM', cron: '0 9 * * *' },
    { label: 'Every weekday at 9:00 AM', cron: '0 9 * * 1-5' },
    { label: 'Every Monday at 9:00 AM', cron: '0 9 * * 1' },
    { label: 'Custom', cron: '' },
  ] as const;

  readonly selectedPreset = signal<string>('');
  readonly customCron = signal<string>('');
  readonly isCustom = computed(() => this.selectedPreset() === '');

  onPresetSelect(preset: { label: string; cron: string }): void {
    this.selectedPreset.set(preset.cron);
    if (preset.cron) {
      this.scheduleChange.emit({ schedule: preset.cron, description: preset.label });
    }
  }

  onCustomChange(value: string): void {
    this.customCron.set(value);
    this.scheduleChange.emit({ schedule: value, description: 'Custom: ' + value });
  }
}
