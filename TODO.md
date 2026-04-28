# hwp-maker TODO

## 미결 사항

### 🔧 기술 결정 필요

- [ ] **rhwp WASM 빌드 방식 확정**
  - 옵션 A: Rust 소스에서 직접 `wasm-pack` 빌드
  - 옵션 B: npm 패키지로 배포된 버전 사용
  - 관련 이슈: Vercel 배포 시 WASM 바이너리 포함 방법

- [ ] **Vercel 배포 시 WASM 바이너리 처리 방법**
  - 옵션 A: `public/wasm/` 에 정적 파일로 포함
  - 옵션 B: 외부 CDN에서 로드
  - Next.js `next.config.js` 에서 WASM 파일 처리 설정 필요

- [ ] **AI 양식(스타일) 정의 방법**
  - 옵션 A: JSON 템플릿으로 양식 정의
  - 옵션 B: 시스템 프롬프트에 양식 고정
  - 옵션 C: 사용자가 업로드한 hwp 파일을 양식으로 활용
- [ ] **프로필 기능 정의** - 문서 작성 시스템 프롬프트, 문체, 스타일링 규칙 정의 (템플릿과 별도)

  - 기본 AI API 설정을 프로필별로 지정 (Base URL, API Key, 모델 등)

### 🌐 기능 범위 결정 필요

- [ ] **다국어(i18n) 지원 여부**
  - 우선 한국어 전용으로 시작할지, 처음부터 i18n 구조 잡을지

- [ ] **문서 템플릿 관리 방식**
  - 기본 내장 템플릿 제공 여부
  - 사용자 커스텀 템플릿 업로드/저장 방식

---

## ✅ 완료된 결정사항

- [x] 프레임워크: Next.js (App Router) + TypeScript
- [x] 스타일링: Tailwind CSS v3
- [x] 문서 처리: rhwp WASM (클라이언트 전용)
- [x] AI: OpenAI Compatible API / Ollama 호환
- [x] 상태 저장: Session Storage + 로컬 다운로드
- [x] 인증: 없음 (공개 서비스)
