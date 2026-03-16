import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ChatService } from './chat.service';
import { ApiService } from './api.service';

describe('ChatService', () => {
  let service: ChatService;
  let apiService: ApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ChatService, ApiService],
    });
    service = TestBed.inject(ChatService);
    apiService = TestBed.inject(ApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should start with empty conversations', () => {
    expect(service.conversations()).toEqual([]);
  });

  it('should start with no active conversation', () => {
    expect(service.activeConversation()).toBeNull();
  });

  it('should not be streaming initially', () => {
    expect(service.isStreaming()).toBe(false);
  });

  it('should start with empty streaming content', () => {
    expect(service.streamingContent()).toBe('');
  });

  it('should have no active conversation computed as false', () => {
    expect(service.hasActiveConversation()).toBe(false);
  });

  it('should load conversations from API', async () => {
    const mockConversations = [
      { id: '1', title: 'Test', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
    ];
    vi.spyOn(apiService, 'get').mockResolvedValue(mockConversations);

    await service.loadConversations();

    expect(service.conversations()).toEqual(mockConversations);
    expect(apiService.get).toHaveBeenCalledWith('/chat');
  });

  it('should create a new conversation', async () => {
    const mockConversation = {
      id: '1',
      title: 'New conversation',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    };
    vi.spyOn(apiService, 'post').mockResolvedValue(mockConversation);

    const result = await service.createConversation();

    expect(result).toEqual(mockConversation);
    expect(service.activeConversation()).toEqual(mockConversation);
    expect(service.conversations()).toContainEqual(mockConversation);
    expect(service.messages()).toEqual([]);
  });

  it('should delete a conversation', async () => {
    // Set up initial state
    const mockConversation = {
      id: '1',
      title: 'Test',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    };
    vi.spyOn(apiService, 'post').mockResolvedValue(mockConversation);
    vi.spyOn(apiService, 'delete').mockResolvedValue(undefined);
    await service.createConversation();

    await service.deleteConversation('1');

    expect(service.conversations()).toEqual([]);
    expect(service.activeConversation()).toBeNull();
  });
});
