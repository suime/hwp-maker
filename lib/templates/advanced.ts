export type AdvancedTemplateVariableType = 'text' | 'select' | 'date' | 'script' | 'llm';

export interface AdvancedTemplateVariable {
  name: string;
  label: string;
  type: AdvancedTemplateVariableType;
  defaultValue: string;
  options: string[];
  format?: string;
  script?: string;
  prompt?: string;
  description?: string;
}

export interface AdvancedTemplateDefinition {
  variables: AdvancedTemplateVariable[];
}

const DEFAULT_DATE_FORMAT = 'yyyy-MM-dd';

function stripQuotes(value: string) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseScalar(value: string) {
  return stripQuotes(value.replace(/\s+#.*$/, '').trim());
}

function parseInlineList(value: string) {
  const trimmed = value.trim();
  if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) return null;
  return trimmed
    .slice(1, -1)
    .split(',')
    .map((item) => parseScalar(item))
    .filter(Boolean);
}

function formatDate(date: Date, format = DEFAULT_DATE_FORMAT) {
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  const parts = {
    yyyy: String(date.getFullYear()),
    MM: String(date.getMonth() + 1).padStart(2, '0'),
    M: String(date.getMonth() + 1),
    dd: String(date.getDate()).padStart(2, '0'),
    d: String(date.getDate()),
    aaa: weekdays[date.getDay()],
    EEE: weekdays[date.getDay()],
  };

  return format.replace(/yyyy|MM|M|dd|d|aaa|EEE/g, (token) => parts[token as keyof typeof parts]);
}

export function interpolateTemplateString(template: string, values: Record<string, string>) {
  return template.replace(/\{\{\s*([A-Za-z0-9_.-]+)\s*\}\}/g, (_, key: string) => values[key] ?? '');
}

export function evaluateTemplateVariable(variable: AdvancedTemplateVariable) {
  const now = new Date();

  if (variable.type === 'date') {
    return formatDate(now, variable.format || variable.defaultValue || DEFAULT_DATE_FORMAT);
  }

  if (variable.type === 'llm') {
    return '';
  }

  if (variable.type !== 'script') {
    return variable.defaultValue || variable.options[0] || '';
  }

  const script = (variable.script || variable.defaultValue || '').trim();

  if (!script || script === 'today' || script === 'today()' || script === 'currentDate' || script === 'currentDate()') {
    return formatDate(now, variable.format || DEFAULT_DATE_FORMAT);
  }
  if (script === 'currentYear' || script === 'currentYear()') return String(now.getFullYear());
  if (script === 'currentMonth' || script === 'currentMonth()') return String(now.getMonth() + 1).padStart(2, '0');
  if (script === 'currentDay' || script === 'currentDay()') return String(now.getDate()).padStart(2, '0');

  const dateMatch = script.match(/^date\((['"]?)([^'")]*)\1\)$/);
  if (dateMatch) return formatDate(now, dateMatch[2] || DEFAULT_DATE_FORMAT);

  return variable.defaultValue || '';
}

export function parseAdvancedTemplateYaml(yaml: string): AdvancedTemplateDefinition {
  const variables = new Map<string, Partial<AdvancedTemplateVariable> & { options?: string[] }>();
  const lines = yaml.replace(/\r\n/g, '\n').split('\n');
  let inVariables = false;
  let currentName: string | null = null;
  let currentListKey: string | null = null;
  let blockScalar:
    | { variableName: string; key: 'prompt' | 'script' | 'description'; indent: number; lines: string[] }
    | null = null;

  for (const rawLine of lines) {
    const line = rawLine.replace(/\t/g, '  ');
    const trimmed = line.trim();
    const indent = line.search(/\S/);

    if (blockScalar) {
      if (!trimmed) {
        blockScalar.lines.push('');
        continue;
      }

      if (indent >= blockScalar.indent) {
        blockScalar.lines.push(line.slice(blockScalar.indent));
        continue;
      }

      const variable = variables.get(blockScalar.variableName);
      if (variable) variable[blockScalar.key] = blockScalar.lines.join('\n').trim();
      blockScalar = null;
    }

    if (!trimmed || trimmed.startsWith('#')) continue;
    if (indent === 0) {
      inVariables = trimmed === 'variables:';
      currentName = null;
      currentListKey = null;
      continue;
    }

    if (!inVariables) continue;

    if (indent === 2 && trimmed.endsWith(':')) {
      currentName = trimmed.slice(0, -1).trim();
      currentListKey = null;
      variables.set(currentName, {
        name: currentName,
        label: currentName,
        type: 'text',
        defaultValue: '',
        options: [],
      });
      continue;
    }

    if (!currentName) continue;

    const variable = variables.get(currentName);
    if (!variable) continue;

    if (indent === 4) {
      const colonIndex = trimmed.indexOf(':');
      if (colonIndex === -1) continue;

      const key = trimmed.slice(0, colonIndex).trim();
      const rawValue = trimmed.slice(colonIndex + 1).trim();
      currentListKey = rawValue ? null : key;

      if (key === 'options') {
        const inlineOptions = parseInlineList(rawValue);
        variable.options = inlineOptions ?? [];
      } else if (key === 'label') {
        variable.label = parseScalar(rawValue);
      } else if (key === 'type') {
        const type = parseScalar(rawValue);
        variable.type = ['text', 'select', 'date', 'script', 'llm'].includes(type)
          ? (type as AdvancedTemplateVariableType)
          : 'text';
      } else if (key === 'default' || key === 'defaultValue') {
        variable.defaultValue = parseScalar(rawValue);
      } else if (key === 'format') {
        variable.format = parseScalar(rawValue);
      } else if (key === 'script') {
        if (rawValue === '|' || rawValue === '|-') {
          blockScalar = { variableName: currentName, key: 'script', indent: indent + 2, lines: [] };
        } else {
          variable.script = parseScalar(rawValue);
        }
      } else if (key === 'prompt' || key === 'instruction') {
        if (rawValue === '|' || rawValue === '|-') {
          blockScalar = { variableName: currentName, key: 'prompt', indent: indent + 2, lines: [] };
        } else {
          variable.prompt = parseScalar(rawValue);
        }
      } else if (key === 'description') {
        if (rawValue === '|' || rawValue === '|-') {
          blockScalar = { variableName: currentName, key: 'description', indent: indent + 2, lines: [] };
        } else {
          variable.description = parseScalar(rawValue);
        }
      }
      continue;
    }

    if (indent >= 6 && currentListKey === 'options' && trimmed.startsWith('- ')) {
      variable.options = [...(variable.options || []), parseScalar(trimmed.slice(2))];
    }
  }

  if (blockScalar) {
    const variable = variables.get(blockScalar.variableName);
    if (variable) variable[blockScalar.key] = blockScalar.lines.join('\n').trim();
  }

  return {
    variables: Array.from(variables.values()).map((variable) => ({
      name: variable.name || '',
      label: variable.label || variable.name || '',
      type: variable.type || 'text',
      defaultValue: variable.defaultValue || '',
      options: variable.options || [],
      format: variable.format,
      script: variable.script,
      prompt: variable.prompt,
      description: variable.description,
    })),
  };
}
