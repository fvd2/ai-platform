import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TriggerService } from '../../core/services/trigger.service';
import { TriggerListComponent } from './trigger-list';
import { TriggerDetailComponent } from './trigger-detail';
import { TriggerFormComponent } from './trigger-form';
import { EmptyStateComponent } from '../../shared/empty-state';
import { TriggerConfig, TriggerType } from '../../core/models/trigger.model';

@Component({
  selector: 'app-triggers',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TriggerListComponent, TriggerDetailComponent, TriggerFormComponent, EmptyStateComponent],
  templateUrl: './triggers.html',
  styleUrl: './triggers.scss',
})
export class TriggersComponent {
  private readonly triggerService = inject(TriggerService);

  protected readonly triggers = this.triggerService.triggers;
  protected readonly activeTrigger = this.triggerService.activeTrigger;
  protected readonly runs = this.triggerService.runs;
  protected readonly loading = this.triggerService.loading;
  protected readonly error = this.triggerService.error;

  protected readonly showForm = signal(false);
  protected readonly activeId = computed(() => this.activeTrigger()?.id ?? null);

  constructor() {
    this.triggerService.loadTriggers();
  }

  protected onCreateClick(): void {
    this.showForm.set(true);
  }

  protected async onSelectTrigger(id: string): Promise<void> {
    this.showForm.set(false);
    await this.triggerService.selectTrigger(id);
  }

  protected async onDeleteTrigger(id: string): Promise<void> {
    await this.triggerService.deleteTrigger(id);
  }

  protected async onCreate(data: {
    name: string;
    type: TriggerType;
    prompt: string;
    config: TriggerConfig;
  }): Promise<void> {
    await this.triggerService.createTrigger(data);
    this.showForm.set(false);
  }

  protected onCancelForm(): void {
    this.showForm.set(false);
  }

  protected async onToggle(): Promise<void> {
    const trigger = this.activeTrigger();
    if (trigger) {
      await this.triggerService.toggleTrigger(trigger.id);
    }
  }

  protected async onFireNow(): Promise<void> {
    const trigger = this.activeTrigger();
    if (trigger) {
      await this.triggerService.fireTrigger(trigger.id);
    }
  }

  protected async onDelete(): Promise<void> {
    const trigger = this.activeTrigger();
    if (trigger) {
      await this.triggerService.deleteTrigger(trigger.id);
    }
  }

  protected async onUpdatePrompt(prompt: string): Promise<void> {
    const trigger = this.activeTrigger();
    if (trigger) {
      await this.triggerService.updateTrigger(trigger.id, { prompt });
    }
  }

  protected dismissError(): void {
    this.triggerService.clearError();
  }
}
