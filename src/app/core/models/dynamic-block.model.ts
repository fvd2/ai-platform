export type DynamicBlockType = 'chart' | 'data-table' | 'mermaid' | 'key-value' | 'code';

export interface DynamicBlock {
  type: DynamicBlockType;
  title?: string;
  data: Record<string, unknown>;
}

export interface ChartData {
  type: 'bar' | 'line' | 'pie' | 'doughnut';
  labels: string[];
  datasets: { label: string; data: number[]; color?: string }[];
}

export interface DataTableData {
  columns: { key: string; label: string }[];
  rows: Record<string, unknown>[];
}

export interface MermaidData {
  definition: string;
}

export interface KeyValueData {
  pairs: { key: string; value: string | number }[];
}

export interface ParsedDynamicBlock {
  block: DynamicBlock;
  startIndex: number;
  endIndex: number;
}
