import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TaskService } from '../../core/services/task.service';
import { TaskListComponent } from './task-list';
import { TaskDetailComponent } from './task-detail';
import { TaskFormComponent } from './task-form';
import { EmptyStateComponent } from '../../shared/empty-state';

@Component({
  selector: 'app-tasks',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TaskListComponent, TaskDetailComponent, TaskFormComponent, EmptyStateComponent],
  templateUrl: './tasks.html',
  styleUrl: './tasks.scss',
})
export class TasksComponent {
  private readonly taskService = inject(TaskService);

  protected readonly tasks = this.taskService.tasks;
  protected readonly activeTask = this.taskService.activeTask;
  protected readonly runs = this.taskService.runs;
  protected readonly loading = this.taskService.loading;
  protected readonly error = this.taskService.error;

  protected readonly showForm = signal(false);
  protected readonly activeId = computed(() => this.activeTask()?.id ?? null);

  constructor() {
    this.taskService.loadTasks();
  }

  protected onCreateClick(): void {
    this.showForm.set(true);
  }

  protected async onSelectTask(id: string): Promise<void> {
    this.showForm.set(false);
    await this.taskService.selectTask(id);
  }

  protected async onDeleteTask(id: string): Promise<void> {
    await this.taskService.deleteTask(id);
  }

  protected async onCreate(data: {
    name: string;
    prompt: string;
    schedule: string;
    scheduleDescription: string;
  }): Promise<void> {
    await this.taskService.createTask(data);
    this.showForm.set(false);
  }

  protected onCancelForm(): void {
    this.showForm.set(false);
  }

  protected async onToggle(): Promise<void> {
    const task = this.activeTask();
    if (task) {
      await this.taskService.toggleTask(task.id);
    }
  }

  protected async onRunNow(): Promise<void> {
    const task = this.activeTask();
    if (task) {
      await this.taskService.runTask(task.id);
    }
  }

  protected async onDelete(): Promise<void> {
    const task = this.activeTask();
    if (task) {
      await this.taskService.deleteTask(task.id);
    }
  }

  protected async onUpdatePrompt(prompt: string): Promise<void> {
    const task = this.activeTask();
    if (task) {
      await this.taskService.updateTask(task.id, { prompt });
    }
  }

  protected async onUpdateSchedule(event: {
    schedule: string;
    description: string;
  }): Promise<void> {
    const task = this.activeTask();
    if (task) {
      await this.taskService.updateTask(task.id, {
        schedule: event.schedule,
        scheduleDescription: event.description,
      });
    }
  }

  protected dismissError(): void {
    this.taskService.clearError();
  }
}
