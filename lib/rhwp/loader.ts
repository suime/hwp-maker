/**
 * rhwp WASM 로더 및 래퍼
 * 클라이언트에서만 로드됩니다. 반드시 'use client' 컴포넌트에서 useEffect 안에 호출하세요.
 *
 * TODO: rhwp WASM 빌드 방식 확정 후 실제 import 경로 업데이트 필요
 * @see TODO.md - rhwp WASM 빌드 방식 확정
 */

export type RhwpInstance = {
  /** hwpx Blob → 렌더링 가능한 HTML 문자열 */
  renderToHtml: (buffer: ArrayBuffer) => string;
  /** 편집된 데이터 → hwpx ArrayBuffer 내보내기 */
  exportToHwpx: () => ArrayBuffer;
  /** hwp ArrayBuffer → hwpx ArrayBuffer 변환 */
  convertHwpToHwpx: (buffer: ArrayBuffer) => ArrayBuffer;
};

let _instance: RhwpInstance | null = null;

/**
 * rhwp WASM 인스턴스를 초기화합니다.
 * 이미 초기화된 경우 캐시된 인스턴스를 반환합니다.
 */
export async function initRhwp(): Promise<RhwpInstance> {
  if (_instance) return _instance;

  // TODO: 실제 rhwp WASM 패키지 경로로 교체 필요
  // 예: const wasm = await import('rhwp');
  // 또는 public/wasm/ 에서 fetch 로 로드
  throw new Error(
    'rhwp WASM 아직 연동되지 않았습니다. TODO.md의 WASM 빌드 방식 확정 후 구현 예정입니다.'
  );
}

/**
 * 초기화된 rhwp 인스턴스를 반환합니다.
 * initRhwp() 호출 전에 사용하면 null이 반환됩니다.
 */
export function getRhwp(): RhwpInstance | null {
  return _instance;
}
