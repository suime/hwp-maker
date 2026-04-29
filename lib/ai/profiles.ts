import { HwpRunStyle, HwpParagraphStyle } from '@/types/hwp';
import { AiConfig } from './client';

/** AI 프로필 정의 */
export interface AiProfile {
  id: string;
  name: string;
  description: string;
  /** AI에게 전달할 시스템 역할 및 지침 */
  systemPrompt: string;
  /** 해당 프로필에서 권장되는 문서 스타일 */
  defaultStyle: {
    run?: HwpRunStyle;
    paragraph?: HwpParagraphStyle;
  };
  /** 특정 프로필 전용 AI 설정 (전역 설정을 덮어씀) */
  configOverride?: Partial<AiConfig>;
  /** 사용자 생성 여부 */
  isCustom?: boolean;
}

/** 내장 기본 프로필 목록 */
export const BUILTIN_PROFILES: AiProfile[] = [
  {
    id: 'official-report',
    name: '공식 보고서',
    description: '격식을 차린 공문서 및 보고서 스타일입니다.',
    systemPrompt: `당신은 대한민국 공공기관의 노련한 사무관입니다. 
다음 지침에 따라 문서를 작성하세요:
1. 문장은 명사형으로 종결하거나 '~함', '~임' 형식을 사용하세요.
2. 개조식(Bullet points)을 적극적으로 활용하여 가독성을 높이세요.
3. 중립적이고 객관적인 어조를 유지하세요.
4. 전문 용어를 정확하게 사용하되, 가급적 쉬운 우리말로 표현하세요.`,
    defaultStyle: {
      run: {
        fontFamily: '함초롬바탕',
        fontSize: 10,
      },
      paragraph: {
        alignment: 'justify',
        lineSpacing: 160,
      },
    },
  },
  {
    id: 'creative-blog',
    name: '창의적 블로그',
    description: '친근하고 읽기 쉬운 블로그 포스팅 스타일입니다.',
    systemPrompt: `당신은 친절한 블로그 에디터입니다.
다음 지침에 따라 문서를 작성하세요:
1. 독자에게 말을 거는 듯한 대화체(~해요, ~입니다)를 사용하세요.
2. 풍부한 형용사와 이모지를 적절히 사용하여 생동감을 주되, 너무 가볍지 않게 하세요.
3. 소제목을 사용하여 내용을 명확히 구분하세요.
4. 독자의 흥미를 끌 수 있는 서론과 마무리 멘트를 포함하세요.`,
    defaultStyle: {
      run: {
        fontFamily: '나눔고딕',
        fontSize: 11,
      },
      paragraph: {
        alignment: 'left',
        lineSpacing: 180,
      },
    },
  },
];

const ACTIVE_PROFILE_KEY = 'hwp-maker:active-profile-id';
const CUSTOM_PROFILES_KEY = 'hwp-maker:custom-profiles';

/** 모든 프로필 (내장 + 사용자 정의) 가져오기 */
export function getAllProfiles(): AiProfile[] {
  if (typeof window === 'undefined') return BUILTIN_PROFILES;
  try {
    const raw = localStorage.getItem(CUSTOM_PROFILES_KEY);
    const custom: AiProfile[] = raw ? JSON.parse(raw) : [];
    
    // 내장 프로필 중 커스텀에 의해 덮어씌워지지 않은 것만 필터링
    const customIds = new Set(custom.map(p => p.id));
    const filteredBuiltin = BUILTIN_PROFILES.filter(p => !customIds.has(p.id));
    
    return [...filteredBuiltin, ...custom];
  } catch {
    return BUILTIN_PROFILES;
  }
}

/** 현재 활성화된 프로필 로드 */
export function getActiveProfile(): AiProfile {
  const all = getAllProfiles();
  if (typeof window === 'undefined') return all[0];
  const id = localStorage.getItem(ACTIVE_PROFILE_KEY);
  return all.find((p) => p.id === id) || all[0];
}

/** 활성화된 프로필 변경 */
export function setActiveProfile(id: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACTIVE_PROFILE_KEY, id);
}

/** 사용자 프로필 저장/수정 */
export function saveCustomProfile(profile: AiProfile): void {
  const custom = getCustomProfiles();
  const index = custom.findIndex((p) => p.id === profile.id);
  
  const updated = index >= 0 
    ? custom.map((p, i) => i === index ? { ...profile, isCustom: true } : p)
    : [...custom, { ...profile, isCustom: true }];
    
  localStorage.setItem(CUSTOM_PROFILES_KEY, JSON.stringify(updated));
}

/** 사용자 프로필 삭제 */
export function deleteCustomProfile(id: string): void {
  const custom = getCustomProfiles();
  const filtered = custom.filter((p) => p.id !== id);
  localStorage.setItem(CUSTOM_PROFILES_KEY, JSON.stringify(filtered));
  
  if (localStorage.getItem(ACTIVE_PROFILE_KEY) === id) {
    localStorage.removeItem(ACTIVE_PROFILE_KEY);
  }
}

function getCustomProfiles(): AiProfile[] {
  const raw = localStorage.getItem(CUSTOM_PROFILES_KEY);
  return raw ? JSON.parse(raw) : [];
}

/** 프로필을 YAML 문자열로 변환 */
export function profileToYaml(profile: AiProfile): string {
  // 간단한 YAML 직렬화 (복잡한 객체는 수동 처리)
  const lines = [
    `id: ${profile.id}`,
    `name: ${profile.name}`,
    `description: ${profile.description}`,
    `systemPrompt: |-\n  ${profile.systemPrompt.replace(/\n/g, '\n  ')}`,
  ];
  
  if (profile.defaultStyle) {
    lines.push('defaultStyle:');
    if (profile.defaultStyle.run) {
      lines.push('  run:');
      Object.entries(profile.defaultStyle.run).forEach(([k, v]) => lines.push(`    ${k}: ${v}`));
    }
    if (profile.defaultStyle.paragraph) {
      lines.push('  paragraph:');
      Object.entries(profile.defaultStyle.paragraph).forEach(([k, v]) => lines.push(`    ${k}: ${v}`));
    }
  }
  
  if (profile.configOverride) {
    lines.push('configOverride:');
    Object.entries(profile.configOverride).forEach(([k, v]) => lines.push(`  ${k}: ${v}`));
  }
  
  return lines.join('\n');
}

/** YAML 문자열을 프로필 객체로 변환 (간이 파서) */
export function yamlToProfile(yaml: string): Partial<AiProfile> {
  // 주의: 실제 앱에서는 js-yaml 같은 검증된 라이브러리 사용 권장
  // 여기서는 구조가 단순하므로 줄 단위 파싱 수행
  const result: any = { defaultStyle: {}, configOverride: {} };
  const lines = yaml.split('\n');
  let currentKey = '';
  let inSystemPrompt = false;
  let systemPromptLines: string[] = [];

  for (let line of lines) {
    const indent = line.search(/\S/);
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    if (inSystemPrompt) {
      if (indent >= 2) {
        systemPromptLines.push(line.slice(2));
        continue;
      } else {
        result.systemPrompt = systemPromptLines.join('\n');
        inSystemPrompt = false;
      }
    }

    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) continue;

    const key = trimmed.slice(0, colonIndex).trim();
    const value = trimmed.slice(colonIndex + 1).trim();

    if (key === 'systemPrompt' && value.startsWith('|-')) {
      inSystemPrompt = true;
      continue;
    }

    if (indent === 0) {
      currentKey = key;
      if (value) result[key] = value;
    } else if (indent === 2) {
      if (currentKey === 'defaultStyle') {
        // 스타일 파싱 생략 (간소화)
      } else if (currentKey === 'configOverride') {
        result.configOverride[key] = value;
      }
    }
  }
  
  if (inSystemPrompt) result.systemPrompt = systemPromptLines.join('\n');
  
  return result;
}
