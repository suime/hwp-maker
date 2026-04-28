/**
 * hwp 문서 관련 핵심 타입 정의
 * rhwp WASM과 연동되는 구조체를 이곳에 정의합니다.
 */

/** hwp 문서 전체 */
export interface HwpDocument {
  /** 문서 메타데이터 */
  meta: HwpDocumentMeta;
  /** 섹션 목록 */
  sections: HwpSection[];
}

/** 문서 메타데이터 */
export interface HwpDocumentMeta {
  title?: string;
  author?: string;
  createdAt?: string;
  modifiedAt?: string;
}

/** 섹션 (페이지 그룹) */
export interface HwpSection {
  id: string;
  paragraphs: HwpParagraph[];
}

/** 단락 */
export interface HwpParagraph {
  id: string;
  runs: HwpRun[];
  style?: HwpParagraphStyle;
}

/** 텍스트 런 (스타일이 동일한 연속 텍스트) */
export interface HwpRun {
  text: string;
  style?: HwpRunStyle;
}

/** 단락 스타일 */
export interface HwpParagraphStyle {
  alignment?: 'left' | 'center' | 'right' | 'justify';
  lineSpacing?: number;
  spaceBeforeLines?: number;
  spaceAfterLines?: number;
}

/** 텍스트 런 스타일 */
export interface HwpRunStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
}

/** AI로부터 생성된 문서 콘텐츠 단위 */
export interface HwpGeneratedContent {
  sectionId: string;
  paragraphs: HwpParagraph[];
}

/** 편집기 상태 (Session Storage에 저장) */
export interface EditorSession {
  document: HwpDocument | null;
  /** 마지막으로 저장된 시각 */
  savedAt: string;
  /** 현재 템플릿 ID */
  templateId?: string;
}
