export interface ExtractedArtifact {
  title: string;
  type: 'code' | 'markdown' | 'table' | 'json' | 'text';
  language?: string;
  content: string;
}

const CODE_BLOCK_REGEX = /```(\w*)\n([\s\S]*?)```/g;
const MIN_CODE_LINES = 5;

const LANGUAGE_LABELS: Record<string, string> = {
  js: 'javascript',
  ts: 'typescript',
  py: 'python',
  rb: 'ruby',
  sh: 'shell',
  bash: 'shell',
  yml: 'yaml',
  md: 'markdown',
};

function normalizeLanguage(lang: string): string {
  return LANGUAGE_LABELS[lang] ?? lang;
}

function isJsonContent(content: string): boolean {
  try {
    JSON.parse(content);
    return true;
  } catch {
    return false;
  }
}

function generateTitle(language: string, content: string): string {
  const firstLine = content.split('\n')[0].trim();

  // Try to extract a meaningful title from the first line
  // Function/class definitions
  const fnMatch = firstLine.match(
    /(?:function|class|const|let|var|def|fn|pub fn|func|interface|type|struct|enum)\s+(\w+)/,
  );
  if (fnMatch) {
    return fnMatch[1];
  }

  // Import statements - use the module name
  const importMatch = firstLine.match(/(?:import|from|require)\s+['"]([^'"]+)['"]/);
  if (importMatch) {
    return importMatch[1];
  }

  // Fallback: use language + snippet
  const ext = language || 'txt';
  return `snippet.${ext}`;
}

export function extractArtifacts(markdownContent: string): ExtractedArtifact[] {
  const artifacts: ExtractedArtifact[] = [];

  for (const match of markdownContent.matchAll(CODE_BLOCK_REGEX)) {
    const rawLanguage = match[1] || '';
    const code = match[2].trimEnd();
    const lineCount = code.split('\n').length;

    if (lineCount < MIN_CODE_LINES) {
      continue;
    }

    const language = rawLanguage.toLowerCase();

    // Check if it's JSON
    if (language === 'json' || (!language && isJsonContent(code))) {
      artifacts.push({
        title: 'data.json',
        type: 'json',
        language: 'json',
        content: code,
      });
      continue;
    }

    // Check if it's markdown
    if (language === 'markdown' || language === 'md') {
      const firstLine = code.split('\n')[0].trim();
      const heading = firstLine.startsWith('#') ? firstLine.replace(/^#+\s*/, '') : 'document';
      artifacts.push({
        title: `${heading}.md`,
        type: 'markdown',
        language: 'markdown',
        content: code,
      });
      continue;
    }

    // Default: code artifact
    const normalized = normalizeLanguage(language);
    artifacts.push({
      title: generateTitle(language, code),
      type: 'code',
      language: normalized || undefined,
      content: code,
    });
  }

  return artifacts;
}
