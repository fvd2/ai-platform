export type ArtifactType = 'code' | 'markdown' | 'table' | 'json' | 'text';
export type ArtifactSourceType = 'chat' | 'task' | 'trigger';

export interface Artifact {
  id: string;
  title: string;
  type: ArtifactType;
  language?: string;
  content: string;
  sourceType: ArtifactSourceType;
  sourceId: string;
  runId?: string;
  createdAt: string;
}
