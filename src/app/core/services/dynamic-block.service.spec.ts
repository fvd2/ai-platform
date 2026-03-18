import { TestBed } from '@angular/core/testing';
import { DynamicBlockService } from './dynamic-block.service';

describe('DynamicBlockService', () => {
  let service: DynamicBlockService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DynamicBlockService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('parseBlocks', () => {
    it('should detect fenced chart block', () => {
      const content = 'Some text\n```json:chart\n{"type":"bar","labels":["A","B"],"datasets":[{"label":"Sales","data":[10,20]}]}\n```\nMore text';
      const blocks = service.parseBlocks(content);
      expect(blocks).toHaveLength(1);
      expect(blocks[0].block.type).toBe('chart');
    });

    it('should detect comment-style data-table block', () => {
      const content = '<!--dynamic:data-table-->{"columns":[{"key":"name","label":"Name"}],"rows":[{"name":"Alice"}]}<!--/dynamic-->';
      const blocks = service.parseBlocks(content);
      expect(blocks).toHaveLength(1);
      expect(blocks[0].block.type).toBe('data-table');
    });

    it('should detect mermaid blocks', () => {
      const content = '```json:mermaid\n{"definition":"graph TD; A-->B;"}\n```';
      const blocks = service.parseBlocks(content);
      expect(blocks).toHaveLength(1);
      expect(blocks[0].block.type).toBe('mermaid');
    });

    it('should detect key-value blocks', () => {
      const content = '```json:key-value\n{"pairs":[{"key":"Status","value":"Active"}]}\n```';
      const blocks = service.parseBlocks(content);
      expect(blocks).toHaveLength(1);
      expect(blocks[0].block.type).toBe('key-value');
    });

    it('should fallback to code block on invalid JSON', () => {
      const content = '```json:chart\nnot valid json\n```';
      const blocks = service.parseBlocks(content);
      expect(blocks).toHaveLength(1);
      expect(blocks[0].block.type).toBe('code');
      expect(blocks[0].block.title).toContain('Invalid');
    });

    it('should fallback on invalid chart data shape', () => {
      const content = '```json:chart\n{"wrong":"shape"}\n```';
      const blocks = service.parseBlocks(content);
      expect(blocks).toHaveLength(1);
      expect(blocks[0].block.type).toBe('code');
    });

    it('should detect multiple blocks', () => {
      const content = '```json:chart\n{"type":"bar","labels":["A"],"datasets":[{"label":"X","data":[1]}]}\n```\nSome text\n```json:key-value\n{"pairs":[{"key":"K","value":"V"}]}\n```';
      const blocks = service.parseBlocks(content);
      expect(blocks).toHaveLength(2);
    });

    it('should return empty for plain text', () => {
      const blocks = service.parseBlocks('Just regular text');
      expect(blocks).toHaveLength(0);
    });

    it('should record start and end indices', () => {
      const prefix = 'Hello ';
      const block = '```json:key-value\n{"pairs":[{"key":"K","value":"V"}]}\n```';
      const content = prefix + block + ' world';
      const blocks = service.parseBlocks(content);
      expect(blocks[0].startIndex).toBe(prefix.length);
      expect(blocks[0].endIndex).toBe(prefix.length + block.length);
    });
  });

  describe('hasBlocks', () => {
    it('should return true for content with blocks', () => {
      const content = '```json:chart\n{"type":"bar","labels":[],"datasets":[]}\n```';
      expect(service.hasBlocks(content)).toBe(true);
    });

    it('should return false for plain text', () => {
      expect(service.hasBlocks('Hello world')).toBe(false);
    });
  });
});
