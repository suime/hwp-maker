# hwp-maker 프로젝트 가이드 (GEMINI.md)

## 프로젝트 개요

- **목적:** AI 기반으로 한글(hwp, hwpx) 문서를 쉽게 생성하고 편집하는 웹 도구.
- **배포 목표:** Vercel 배포 지원 (셀프 호스팅 우선).
- **서비스 성격:** 공개 서비스 (누구나 사용 가능), 셀프 호스팅 기반.
- **핵심 UX 흐름:**
  1. 사용자가 자연어로 문서 작성/수정 명령을 입력
  2. AI가 정해진 양식(스타일) 안에서 내용을 자동 생성
  3. 우측 패널에서 rhwp WASM 기반 미리보기 및 직접 편집 가능
  4. 완성된 문서를 로컬에 hwp/hwpx로 다운로드

---

## 기술 스택

| 항목       | 선택                      | 비고                     |
| ---------- | ------------------------- | ------------------------ |
| 프레임워크 | **Next.js**               | App Router 사용          |
| 언어       | **TypeScript**            | strict 모드 권장         |
| 스타일링   | **Tailwind CSS**          | v3 기준                  |
| 문서 처리  | **rhwp (WASM)**           | 클라이언트 사이드 전용   |
| AI 연동    | **OpenAI Compatible API** | Ollama 호환 포함         |
| 상태 저장  | **Session Storage**       | 세션 단위 진행 상태 유지 |
| 파일 저장  | **로컬 다운로드**         | hwp/hwpx 내보내기        |

---

## 아키텍처 원칙

- **모든 문서 처리는 클라이언트에서:** rhwp WASM을 통해 서버 없이 브라우저에서 hwp 파싱/생성/렌더링.
- **AI 요청만 외부 API 호출:** OpenAI compatible endpoint (또는 Ollama) 로 직접 요청. Next.js API Route는 프록시 용도로만 최소 활용.
- **서버리스 함수 최소화:** Vercel Edge/Serverless는 AI 프록시 정도만 사용. 나머지는 전부 클라이언트.
- **인증 없음:** 로그인/회원가입 없이 누구나 바로 사용 가능.

---

## 주요 기능

### 문서 편집기

- 좌측: AI 채팅 / 명령 입력 패널
- 우측: rhwp WASM 기반 hwp 문서 미리보기 + 직접 편집 패널
- AI 명령 → rhwp로 문서 조작 → 실시간 미리보기 반영

### AI 연동

- OpenAI compatible API (base URL + API Key 설정 가능)
- Ollama 로컬 모델도 지원 (endpoint 설정으로)
- AI 역할: **정해진 양식(스타일) 안에 내용만 자동 생성** (양식 자체는 변경 안 함)
- 설정 화면에서 API 키, Base URL, 모델명 입력 (세션 또는 로컬스토리지 저장)

### 파일 저장

- 세션 스토리지: 편집 중인 문서 상태 임시 보존
- 로컬 다운로드: hwp / hwpx 포맷으로 내보내기

---

## 디렉토리 구조 (예정)

```
hwp-maker/
├── app/                    # Next.js App Router
│   ├── page.tsx            # 메인 편집기 페이지
│   ├── layout.tsx
│   └── api/
│       └── ai/route.ts     # AI API 프록시 (선택)
├── components/
│   ├── editor/             # hwp 편집기 관련 컴포넌트
│   ├── chat/               # AI 채팅 패널
│   └── ui/                 # 공통 UI 컴포넌트
├── lib/
│   ├── rhwp/               # rhwp WASM 래퍼
│   ├── ai/                 # AI API 클라이언트
│   └── session/            # 세션 저장/복원 유틸
├── public/
│   └── wasm/               # rhwp WASM 바이너리
├── styles/
└── GEMINI.md
```

---

## 환경 변수 (`.env.local`)

```env
# AI API 설정 (서버사이드 프록시 사용 시)
OPENAI_API_BASE_URL=https://api.openai.com/v1
OPENAI_API_KEY=your-api-key

# 클라이언트에서 직접 호출 시 NEXT_PUBLIC_ 접두사 사용
NEXT_PUBLIC_AI_BASE_URL=http://localhost:11434/v1  # Ollama 예시
```

---

## 작업 컨벤션 및 규칙

- **컴포넌트:** `components/` 아래에 기능별 폴더로 분리
- **WASM 로딩:** `useEffect` + dynamic import로 클라이언트에서만 로드 (`'use client'` 필수)
- **AI 호출:** `lib/ai/` 모듈을 통해 추상화, 직접 fetch 금지
- **타입:** 모든 hwp 문서 구조체는 `types/hwp.ts`에 정의
- **세션 저장:** `lib/session/` 유틸을 통해 일관되게 관리
- **에러 처리:** WASM 로드 실패, AI 응답 오류 모두 사용자에게 명확히 표시

---

## 미결 사항 (추후 논의 필요)

- [ ] rhwp WASM 빌드 방식 확정 (직접 빌드 vs 패키지 배포)
- [ ] AI 양식(스타일) 정의 방법 (JSON 템플릿? 프롬프트 고정?)
- [ ] Vercel 배포 시 WASM 바이너리 처리 방법
- [ ] 다국어(i18n) 지원 여부
- [ ] 문서 템플릿 관리 방식
