# hwp-maker TODO

## 미결 사항

### 🔧 기술 과제

- [ ] **AI 양식(스타일) 정의 방법**
  - 옵션 A: JSON 템플릿으로 양식 정의
  - 옵션 B: 시스템 프롬프트에 양식 고정
  - 옵션 C: 사용자가 업로드한 hwp 파일을 양식으로 활용

- [ ] **프로필 기능 정의**
  - 문서 작성 시스템 프롬프트, 문체, 스타일링 규칙 정의 (템플릿과 별도)
  - 기본 AI API 설정을 프로필별로 지정 (Base URL, API Key, 모델 등)

- [ ] **에디터-AI 통신 인터페이스 구현**
  - `lib/rhwp/loader.ts`를 통해 에디터 제어 API 추상화
  - AI 생성 텍스트를 에디터의 특정 위치에 삽입하거나 스타일 적용하는 로직

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
- [x] 문서 처리: rhwp WASM (클라이언트 전용, `public/rhwp-studio/` 정적 파일 활용)
- [x] AI: OpenAI Compatible API / Ollama 호환
- [x] 상태 저장: Session Storage + 로컬 다운로드
- [x] 인증: 없음 (공개 서비스)
- [x] WASM 빌드/배포: `public/rhwp-studio/` 정적 파일 포함 방식
