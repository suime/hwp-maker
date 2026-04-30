export type AdvancedTemplateVariableType = 'text' | 'select' | 'date' | 'script' | 'ai';

export interface AdvancedTemplateOptionRule {
  variable: string;
  equals: string;
  options: string[];
}

export interface AdvancedTemplateVariable {
  name: string;
  label: string;
  type: AdvancedTemplateVariableType;
  defaultValue: string;
  options: string[];
  optionRules: AdvancedTemplateOptionRule[];
  format?: string;
  script?: string;
  prompt?: string;
  description?: string;
}

export interface AdvancedTemplateDefinition {
  author?: string;
  description?: string;
  systemPrompt?: string;
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

function parseVariableType(value: string): AdvancedTemplateVariableType {
  const type = parseScalar(value).toLowerCase();
  if (type === 'llm') return 'ai';
  return ['text', 'select', 'date', 'script', 'ai'].includes(type)
    ? (type as AdvancedTemplateVariableType)
    : 'text';
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

export function resolveTemplateVariableOptions(
  variable: AdvancedTemplateVariable,
  values: Record<string, string>
) {
  const matchedRule = variable.optionRules.find((rule) => values[rule.variable] === rule.equals);
  return matchedRule?.options.length ? matchedRule.options : variable.options;
}

export function normalizeTemplateVariableValues(
  definition: AdvancedTemplateDefinition,
  values: Record<string, string>
) {
  const normalized = { ...values };

  for (let pass = 0; pass < definition.variables.length; pass++) {
    let changed = false;

    for (const variable of definition.variables) {
      if (variable.type !== 'select') continue;

      const options = resolveTemplateVariableOptions(variable, normalized);
      if (options.length > 0 && !options.includes(normalized[variable.name])) {
        normalized[variable.name] = options[0];
        changed = true;
      }
      if (options.length === 0 && normalized[variable.name] !== '') {
        normalized[variable.name] = '';
        changed = true;
      }
    }

    if (!changed) {
      break;
    }
  }

  return normalized;
}

export function evaluateTemplateVariable(variable: AdvancedTemplateVariable) {
  const now = new Date();

  if (variable.type === 'date') {
    return formatDate(now, variable.format || variable.defaultValue || DEFAULT_DATE_FORMAT);
  }

  if (variable.type === 'ai') {
    return variable.prompt || variable.defaultValue || '';
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
  const variables = new Map<string, Partial<AdvancedTemplateVariable> & {
    options?: string[];
    optionRules?: AdvancedTemplateOptionRule[];
  }>();
  const lines = yaml.replace(/\r\n/g, '\n').split('\n');
  let author = '';
  let description = '';
  let systemPrompt = '';
  let inDocumentMeta = false;
  let inVariables = false;
  let currentName: string | null = null;
  let currentListKey: string | null = null;
  let blockScalar:
    | {
        variableName?: string;
        key: 'prompt' | 'script' | 'description' | 'systemPrompt';
        indent: number;
        lines: string[];
      }
    | null = null;
  let optionRuleContext: { variableName: string; dependsOn: string; equals?: string } | null = null;

  function addOptionRule(variableName: string, dependsOn: string, equals: string, options: string[]) {
    const variable = variables.get(variableName);
    if (!variable) return;

    const currentRules = variable.optionRules || [];
    const existingIndex = currentRules.findIndex((rule) => rule.variable === dependsOn && rule.equals === equals);
    const nextRule = { variable: dependsOn, equals, options };

    variable.optionRules = existingIndex >= 0
      ? currentRules.map((rule, index) => index === existingIndex ? nextRule : rule)
      : [...currentRules, nextRule];
  }

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

      const text = blockScalar.lines.join('\n').trim();
      if (blockScalar.key === 'systemPrompt') {
        systemPrompt = text;
      } else if (blockScalar.key === 'description' && !blockScalar.variableName) {
        description = text;
      } else if (blockScalar.variableName) {
        const variable = variables.get(blockScalar.variableName);
        if (variable) variable[blockScalar.key] = text;
      }
      blockScalar = null;
    }

    if (!trimmed || trimmed.startsWith('#')) continue;
    if (indent === 0) {
      currentName = null;
      currentListKey = null;
      optionRuleContext = null;
      inDocumentMeta = false;

      const colonIndex = trimmed.indexOf(':');
      const key = colonIndex >= 0 ? trimmed.slice(0, colonIndex).trim() : trimmed;
      const rawValue = colonIndex >= 0 ? trimmed.slice(colonIndex + 1).trim() : '';

      if (key === 'document' || key === 'metadata' || key === 'meta') {
        inVariables = false;
        inDocumentMeta = true;
        continue;
      }

      if (key === 'author' || key === 'writer') {
        inVariables = false;
        author = parseScalar(rawValue);
        continue;
      }

      if (key === 'description' || key === 'documentDescription' || key === 'document_description') {
        inVariables = false;
        if (rawValue === '|' || rawValue === '|-') {
          blockScalar = { key: 'description', indent: 2, lines: [] };
        } else {
          description = parseScalar(rawValue);
        }
        continue;
      }

      if (key === 'systemPrompt' || key === 'system_prompt') {
        inVariables = false;
        if (rawValue === '|' || rawValue === '|-') {
          blockScalar = { key: 'systemPrompt', indent: 2, lines: [] };
        } else {
          systemPrompt = parseScalar(rawValue);
        }
        continue;
      }

      inVariables = trimmed === 'variables:';
      continue;
    }

    if (inDocumentMeta && indent === 2) {
      const colonIndex = trimmed.indexOf(':');
      if (colonIndex === -1) continue;

      const key = trimmed.slice(0, colonIndex).trim();
      const rawValue = trimmed.slice(colonIndex + 1).trim();

      if (key === 'author' || key === 'writer') {
        author = parseScalar(rawValue);
      } else if (key === 'description' || key === 'documentDescription' || key === 'document_description') {
        if (rawValue === '|' || rawValue === '|-') {
          blockScalar = { key: 'description', indent: indent + 2, lines: [] };
        } else {
          description = parseScalar(rawValue);
        }
      } else if (key === 'systemPrompt' || key === 'system_prompt') {
        if (rawValue === '|' || rawValue === '|-') {
          blockScalar = { key: 'systemPrompt', indent: indent + 2, lines: [] };
        } else {
          systemPrompt = parseScalar(rawValue);
        }
      }
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
        optionRules: [],
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
      optionRuleContext = null;

      if (key === 'options') {
        const inlineOptions = parseInlineList(rawValue);
        variable.options = inlineOptions ?? [];
      } else if (key === 'optionsWhen' || key === 'conditionalOptions') {
        currentListKey = key;
      } else if (key === 'label') {
        variable.label = parseScalar(rawValue);
      } else if (key === 'type') {
        variable.type = parseVariableType(rawValue);
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
      continue;
    }

    if (indent === 6 && (currentListKey === 'optionsWhen' || currentListKey === 'conditionalOptions') && trimmed.endsWith(':')) {
      optionRuleContext = {
        variableName: currentName,
        dependsOn: trimmed.slice(0, -1).trim(),
      };
      continue;
    }

    if (indent === 8 && optionRuleContext) {
      const colonIndex = trimmed.indexOf(':');
      if (colonIndex === -1) continue;

      const equals = parseScalar(trimmed.slice(0, colonIndex));
      const rawValue = trimmed.slice(colonIndex + 1).trim();
      const inlineOptions = parseInlineList(rawValue);
      optionRuleContext = { ...optionRuleContext, equals };

      if (inlineOptions) {
        addOptionRule(optionRuleContext.variableName, optionRuleContext.dependsOn, equals, inlineOptions);
      } else {
        addOptionRule(optionRuleContext.variableName, optionRuleContext.dependsOn, equals, []);
      }
      continue;
    }

    if (indent >= 10 && optionRuleContext?.equals && trimmed.startsWith('- ')) {
      const variable = variables.get(optionRuleContext.variableName);
      const rules = variable?.optionRules || [];
      const targetRule = rules.find((rule) =>
        rule.variable === optionRuleContext?.dependsOn && rule.equals === optionRuleContext?.equals
      );
      if (targetRule) {
        targetRule.options = [...targetRule.options, parseScalar(trimmed.slice(2))];
      }
    }
  }

  if (blockScalar) {
    const text = blockScalar.lines.join('\n').trim();
    if (blockScalar.key === 'systemPrompt') {
      systemPrompt = text;
    } else if (blockScalar.key === 'description' && !blockScalar.variableName) {
      description = text;
    } else if (blockScalar.variableName) {
      const variable = variables.get(blockScalar.variableName);
      if (variable) variable[blockScalar.key] = text;
    }
  }

  return {
    author,
    description,
    systemPrompt,
    variables: Array.from(variables.values()).map((variable) => ({
      name: variable.name || '',
      label: variable.label || variable.name || '',
      type: variable.type || 'text',
      defaultValue: variable.defaultValue || '',
      options: variable.options || [],
      optionRules: variable.optionRules || [],
      format: variable.format,
      script: variable.script,
      prompt: variable.prompt,
      description: variable.description,
    })),
  };
}
