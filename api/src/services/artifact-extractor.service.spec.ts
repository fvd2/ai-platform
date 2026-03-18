import { describe, it, expect } from 'vitest';
import { extractArtifacts } from './artifact-extractor.service.js';

describe('extractArtifacts', () => {
  it('should return empty array for text without code blocks', () => {
    const result = extractArtifacts('Hello world, no code here.');
    expect(result).toEqual([]);
  });

  it('should ignore code blocks shorter than 5 lines', () => {
    const content = '```js\nconst x = 1;\nconst y = 2;\n```';
    const result = extractArtifacts(content);
    expect(result).toEqual([]);
  });

  it('should extract code blocks with 5+ lines', () => {
    const code = [
      'const a = 1;',
      'const b = 2;',
      'const c = 3;',
      'const d = 4;',
      'const e = 5;',
    ].join('\n');
    const content = `Here is some code:\n\`\`\`typescript\n${code}\n\`\`\``;
    const result = extractArtifacts(content);

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('code');
    expect(result[0].language).toBe('typescript');
    expect(result[0].content).toBe(code);
  });

  it('should detect JSON blocks', () => {
    const json = '{\n  "name": "test",\n  "version": "1.0",\n  "description": "a test",\n  "main": "index.js"\n}';
    const content = `\`\`\`json\n${json}\n\`\`\``;
    const result = extractArtifacts(content);

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('json');
    expect(result[0].language).toBe('json');
    expect(result[0].title).toBe('data.json');
  });

  it('should detect markdown blocks', () => {
    const md = [
      '# My Document',
      '',
      'Some content here.',
      '',
      'More content.',
    ].join('\n');
    const content = `\`\`\`markdown\n${md}\n\`\`\``;
    const result = extractArtifacts(content);

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('markdown');
    expect(result[0].title).toBe('My Document.md');
  });

  it('should normalize language aliases', () => {
    const code = 'x = 1\ny = 2\nz = 3\nw = 4\nv = 5';
    const content = `\`\`\`py\n${code}\n\`\`\``;
    const result = extractArtifacts(content);

    expect(result).toHaveLength(1);
    expect(result[0].language).toBe('python');
  });

  it('should generate title from function definition', () => {
    const code = [
      'function calculateTotal(items) {',
      '  let total = 0;',
      '  for (const item of items) {',
      '    total += item.price;',
      '  }',
      '  return total;',
      '}',
    ].join('\n');
    const content = `\`\`\`js\n${code}\n\`\`\``;
    const result = extractArtifacts(content);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('calculateTotal');
  });

  it('should extract multiple code blocks', () => {
    const code1 = 'line1\nline2\nline3\nline4\nline5';
    const code2 = 'a\nb\nc\nd\ne';
    const content = `\`\`\`ts\n${code1}\n\`\`\`\nSome text\n\`\`\`py\n${code2}\n\`\`\``;
    const result = extractArtifacts(content);

    expect(result).toHaveLength(2);
    expect(result[0].language).toBe('typescript');
    expect(result[1].language).toBe('python');
  });

  it('should handle code blocks without language specified', () => {
    const code = 'line1\nline2\nline3\nline4\nline5';
    const content = `\`\`\`\n${code}\n\`\`\``;
    const result = extractArtifacts(content);

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('code');
    expect(result[0].language).toBeUndefined();
  });
});
