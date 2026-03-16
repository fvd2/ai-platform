import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { ChatService } from '../../core/services/chat.service';
import { ConversationListComponent } from './conversation-list';
import { MessageBubbleComponent } from './message-bubble';

@Component({
  selector: 'app-chat',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ConversationListComponent, MessageBubbleComponent],
  templateUrl: './chat.html',
  styleUrl: './chat.scss',
})
export class ChatComponent {
  private readonly chatService = inject(ChatService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private readonly messagesContainer = viewChild<ElementRef<HTMLElement>>('messagesContainer');
  private readonly textareaEl = viewChild<ElementRef<HTMLTextAreaElement>>('textareaEl');

  protected readonly conversations = this.chatService.conversations;
  protected readonly activeConversation = this.chatService.activeConversation;
  protected readonly messages = this.chatService.messages;
  protected readonly streamingContent = this.chatService.streamingContent;
  protected readonly isStreaming = this.chatService.isStreaming;
  protected readonly error = this.chatService.error;

  protected readonly activeId = computed(() => this.activeConversation()?.id ?? null);
  protected readonly inputText = signal('');

  constructor() {
    // Load conversations on init
    this.chatService.loadConversations();

    // Auto-scroll when messages change or streaming content updates
    effect(() => {
      this.messages();
      this.streamingContent();
      this.scrollToBottom();
    });

    // Handle route params reactively
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const id = params.get('conversationId');
      if (id) {
        this.chatService.selectConversation(id);
      }
    });
  }

  protected async onCreateConversation(): Promise<void> {
    const conversation = await this.chatService.createConversation();
    await this.router.navigate(['/chat', conversation.id]);
  }

  protected async onSelectConversation(id: string): Promise<void> {
    await this.chatService.selectConversation(id);
    await this.router.navigate(['/chat', id]);
  }

  protected async onDeleteConversation(id: string): Promise<void> {
    await this.chatService.deleteConversation(id);
    if (this.activeConversation() === null) {
      await this.router.navigate(['/chat']);
    }
  }

  protected async onSend(): Promise<void> {
    const text = this.inputText().trim();
    if (!text || this.isStreaming()) return;

    // Auto-create conversation if none active
    if (!this.activeConversation()) {
      const conversation = await this.chatService.createConversation();
      await this.router.navigate(['/chat', conversation.id]);
    }

    this.inputText.set('');
    this.resetTextareaHeight();
    await this.chatService.sendMessage(text);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.onSend();
    }
  }

  protected onInput(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    this.inputText.set(textarea.value);
    this.autoGrowTextarea(textarea);
  }

  protected dismissError(): void {
    this.chatService.clearError();
  }

  private autoGrowTextarea(textarea: HTMLTextAreaElement): void {
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
  }

  private resetTextareaHeight(): void {
    const textarea = this.textareaEl()?.nativeElement;
    if (textarea) {
      textarea.style.height = 'auto';
    }
  }

  protected onCancel(): void {
    this.chatService.cancelStream();
  }

  private scrollToBottom(): void {
    const el = this.messagesContainer()?.nativeElement;
    if (el) {
      // Use setTimeout to scroll after DOM update
      setTimeout(() => el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }), 0);
    }
  }
}
