import { Injectable } from '@angular/core';
import {
  DynamicBlock,
  DynamicBlockType,
  ParsedDynamicBlock,
  ChartData,
  DataTableData,
  MermaidData,
  KeyValueData,
} from '../models/dynamic-block.model';

const VALID_BLOCK_TYPES: DynamicBlockType[] = ['chart', 'data-table', 'mermaid', 'key-value'];

/**
 * Fenced code blocks: ```json:chart ... ``` or ```json:data-table ... ```
 */
const FENCED_BLOCK_REGEX = /```json:(chart|data-table|mermaid|key-value)\n([\s\S]*?)```/g;

/**
 * HTML comment markers: <!--dynamic:chart-->{ ... }<!--/dynamic-->
 */
const COMMENT_BLOCK_REGEX =
  /<!--dynamic:(chart|data-table|mermaid|key-value)-->([\s\S]*?)<!--\/dynamic-->/g;

@Injectable({ providedIn: 'root' })
export class DynamicBlockService {
  /**
   * Parse AI message content for structured dynamic blocks.
   * Returns an array of ParsedDynamicBlock with their positions in the text.
   */
  parseBlocks(content: string): ParsedDynamicBlock[] {
    const blocks: ParsedDynamicBlock[] = [];

    this.extractFromRegex(content, FENCED_BLOCK_REGEX, blocks);
    this.extractFromRegex(content, COMMENT_BLOCK_REGEX, blocks);

    // Sort by position in the text
    blocks.sort((a, b) => a.startIndex - b.startIndex);

    return blocks;
  }

  /**
   * Check if a given content contains any dynamic blocks.
   */
  hasBlocks(content: string): boolean {
    return FENCED_BLOCK_REGEX.test(content) || COMMENT_BLOCK_REGEX.test(content);
  }

  private extractFromRegex(
    content: string,
    regex: RegExp,
    blocks: ParsedDynamicBlock[],
  ): void {
    // Reset regex lastIndex since it's a global regex
    regex.lastIndex = 0;

    for (const match of content.matchAll(regex)) {
      const type = match[1] as DynamicBlockType;
      const jsonStr = match[2].trim();
      const startIndex = match.index;
      const endIndex = startIndex + match[0].length;

      if (!VALID_BLOCK_TYPES.includes(type)) {
        continue;
      }

      const block = this.tryParseBlock(type, jsonStr);
      blocks.push({ block, startIndex, endIndex });
    }
  }

  private tryParseBlock(type: DynamicBlockType, jsonStr: string): DynamicBlock {
    try {
      const data: unknown = JSON.parse(jsonStr);
      if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        return this.fallbackCodeBlock(type, jsonStr);
      }

      const record = data as Record<string, unknown>;

      if (this.validateBlockData(type, record)) {
        return { type, data: record };
      }

      return this.fallbackCodeBlock(type, jsonStr);
    } catch {
      return this.fallbackCodeBlock(type, jsonStr);
    }
  }

  private validateBlockData(type: DynamicBlockType, data: Record<string, unknown>): boolean {
    switch (type) {
      case 'chart':
        return this.isValidChartData(data);
      case 'data-table':
        return this.isValidDataTableData(data);
      case 'mermaid':
        return this.isValidMermaidData(data);
      case 'key-value':
        return this.isValidKeyValueData(data);
      default:
        return false;
    }
  }

  private isValidChartData(data: Record<string, unknown>): data is ChartData & Record<string, unknown> {
    const chartTypes = ['bar', 'line', 'pie', 'doughnut'];
    if (!chartTypes.includes(data['type'] as string)) return false;
    if (!Array.isArray(data['labels'])) return false;
    if (!Array.isArray(data['datasets'])) return false;

    const datasets = data['datasets'] as unknown[];
    return datasets.every(
      (ds) =>
        typeof ds === 'object' &&
        ds !== null &&
        'label' in ds &&
        'data' in ds &&
        Array.isArray((ds as Record<string, unknown>)['data']),
    );
  }

  private isValidDataTableData(data: Record<string, unknown>): data is DataTableData & Record<string, unknown> {
    if (!Array.isArray(data['columns'])) return false;
    if (!Array.isArray(data['rows'])) return false;

    const columns = data['columns'] as unknown[];
    return columns.every(
      (col) =>
        typeof col === 'object' &&
        col !== null &&
        'key' in col &&
        'label' in col,
    );
  }

  private isValidMermaidData(data: Record<string, unknown>): data is MermaidData & Record<string, unknown> {
    return typeof data['definition'] === 'string' && data['definition'].length > 0;
  }

  private isValidKeyValueData(data: Record<string, unknown>): data is KeyValueData & Record<string, unknown> {
    if (!Array.isArray(data['pairs'])) return false;

    const pairs = data['pairs'] as unknown[];
    return pairs.every(
      (p) =>
        typeof p === 'object' &&
        p !== null &&
        'key' in p &&
        'value' in p,
    );
  }

  private fallbackCodeBlock(type: string, rawContent: string): DynamicBlock {
    return {
      type: 'code',
      title: `Invalid ${type} block`,
      data: { content: rawContent, language: 'json' },
    };
  }
}
