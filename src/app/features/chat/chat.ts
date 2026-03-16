import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
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

  private readonly messagesContainer = viewChild<ElementRef<HTMLElement>>('messagesContainer');

  protected readonly conversations = this.chatService.conversations;
  protected readonly activeConversation = this.chatService.activeConversation;
  protected readonly messages = this.chatService.messages;
  protected readonly streamingContent = this.chatService.streamingContent;
  protected readonly isStreaming = this.chatService.isStreaming;

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

    // Handle route params
    effect(() => {
      const params = this.route.snapshot.paramMap;
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
    await this.chatService.sendMessage(text);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.onSend();
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
