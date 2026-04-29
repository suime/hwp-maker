/**
 * 첨부파일 읽기/추출 유틸리티
 * 파일 타입에 따라 적절한 방법으로 콘텐츠를 추출합니다.
 * 클라이언트 전용 (브라우저 API 사용)
 */

import type {
  Attachment,
  AttachmentFileType,
} from '@/types/attachment';
import {
  SUPPORTED_MIME_TYPES,
  MAX_FILE_SIZE,
  MAX_CONTEXT_TEXT_LENGTH,
} from '@/types/attachment';

/** 파일의 AttachmentFileType을 판별합니다 */
export function detectFileType(file: File): AttachmentFileType | null {
  const mime = file.type.toLowerCase();
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';

  if (SUPPORTED_MIME_TYPES.image.includes(mime)) return 'image';
  if (SUPPORTED_MIME_TYPES.pdf.includes(mime)) return 'pdf';
  if (SUPPORTED_MIME_TYPES.hwp.includes(mime) || ext === 'hwp' || ext === 'hwpx') return 'hwp';
  if (SUPPORTED_MIME_TYPES.text.includes(mime) || ext === 'txt' || ext === 'md') return 'text';

  // MIME이 없는 경우 확장자로 재판별
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image';
  if (ext === 'pdf') return 'pdf';

  return null;
}

/** 파일 크기를 검증합니다 */
export function validateFileSize(file: File, fileType: AttachmentFileType): string | null {
  const limit = MAX_FILE_SIZE[fileType];
  if (file.size > limit) {
    const limitMb = Math.round(limit / 1024 / 1024);
    return `파일 크기가 너무 큽니다. 최대 ${limitMb}MB까지 지원합니다.`;
  }
  return null;
}

/** 이미지 파일을 base64 data URL로 읽습니다 */
async function readImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('이미지 파일을 읽는 데 실패했습니다.'));
    reader.readAsDataURL(file);
  });
}

/** 텍스트 파일을 문자열로 읽습니다 */
async function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      resolve(text.slice(0, MAX_CONTEXT_TEXT_LENGTH));
    };
    reader.onerror = () => reject(new Error('텍스트 파일을 읽는 데 실패했습니다.'));
    reader.readAsText(file, 'UTF-8');
  });
}

/** PDF 파일에서 텍스트를 추출합니다 (pdfjs-dist dynamic import) */
async function readPdfFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();

  // pdfjs-dist를 dynamic import로 로드 (번들 크기 최소화)
  const pdfjsLib = await import('pdfjs-dist').catch(() => null);
  if (!pdfjsLib) {
    throw new Error('PDF 파서를 불러올 수 없습니다. pdfjs-dist 패키지가 설치되어 있는지 확인하세요.');
  }

  // worker 설정
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const textParts: string[] = [];

  const maxPages = Math.min(pdf.numPages, 30); // 최대 30페이지
  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: { str?: string }) => item.str ?? '')
      .join(' ');
    textParts.push(pageText);

    // 글자 수 초과 시 중단
    if (textParts.join('\n').length >= MAX_CONTEXT_TEXT_LENGTH) break;
  }

  return textParts.join('\n').slice(0, MAX_CONTEXT_TEXT_LENGTH);
}

/** HWP/HWPX 파일에서 텍스트를 추출합니다 */
async function readHwpFile(file: File): Promise<string> {
  // rhwp.js (public/rhwp-studio/rhwp.js) 동적 로드 시도
  // rhwp가 텍스트 추출 API를 노출하지 않는 경우 파일명만 반환
  try {
    const arrayBuffer = await file.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);

    // rhwp WASM이 글로벌에 노출되어 있으면 사용
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    if (w.__rhwp_extract_text) {
      const text: string = await w.__rhwp_extract_text(uint8);
      return text.slice(0, MAX_CONTEXT_TEXT_LENGTH);
    }

    // HWPX는 ZIP 형식이므로 JSZip으로 내용.xml 추출 시도
    if (file.name.toLowerCase().endsWith('.hwpx')) {
      const JSZip = await import('jszip').catch(() => null);
      if (JSZip) {
        const zip = await JSZip.default.loadAsync(uint8);
        const contentFile = zip.file('Contents/section0.xml') ?? zip.file('content.xml');
        if (contentFile) {
          const xmlText = await contentFile.async('string');
          // XML 태그 제거하여 텍스트만 추출
          const plainText = xmlText.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
          return plainText.slice(0, MAX_CONTEXT_TEXT_LENGTH);
        }
      }
    }

    return `[${file.name} 파일이 첨부되었습니다. 텍스트 추출을 지원하지 않는 형식입니다.]`;
  } catch {
    return `[${file.name} 파일 처리 중 오류가 발생했습니다.]`;
  }
}

/**
 * 파일을 Attachment 객체로 변환합니다.
 * 파일 타입을 자동 판별하고 내용을 추출합니다.
 */
export async function processFile(file: File): Promise<Attachment> {
  const fileType = detectFileType(file);
  if (!fileType) {
    throw new Error(`지원하지 않는 파일 형식입니다: ${file.name}`);
  }

  const sizeError = validateFileSize(file, fileType);
  if (sizeError) throw new Error(sizeError);

  let content: string;
  let previewUrl: string | undefined;

  switch (fileType) {
    case 'image': {
      content = await readImageFile(file);
      previewUrl = content;
      break;
    }
    case 'text': {
      content = await readTextFile(file);
      break;
    }
    case 'pdf': {
      content = await readPdfFile(file);
      break;
    }
    case 'hwp': {
      content = await readHwpFile(file);
      break;
    }
  }

  return {
    id: crypto.randomUUID(),
    name: file.name,
    fileType,
    mimeType: file.type || 'application/octet-stream',
    sizeBytes: file.size,
    content,
    previewUrl,
  };
}

/** 파일 크기를 사람이 읽기 쉬운 형태로 변환 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
