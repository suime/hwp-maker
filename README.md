# hwp-maker

AI 도움을 받아 한글 HWP/HWPX 문서를 만들고 편집하는 self-hostable 웹 앱입니다.

## 개요

`hwp-maker`는 자연어 명령, 템플릿, 첨부파일을 활용해 HWP/HWPX 문서 작성을 돕는 브라우저 기반 편집 도구입니다.

기본 흐름은 다음과 같습니다.

1. 사용자가 채팅 패널에 문서 작성/수정 요청을 입력합니다.
2. 현재 문서 내용, 선택한 AI 프로필, 첨부파일, 템플릿 정보를 AI 컨텍스트로 전달합니다.
3. AI가 일반 답변과 함께 `hwp-maker-actions` 액션 블록을 생성합니다.
4. 앱이 액션을 파싱해 rhwp 에디터에 텍스트 삽입, 치환, 필드 채우기 등을 적용합니다.
5. 사용자는 rhwp 미리보기/편집기에서 결과를 확인하고 HWP/HWPX로 내려받습니다.

인증은 없습니다. 브라우저에서 즉시 사용할 수 있는 공개형/self-hostable 앱을 목표로 합니다.

## 기술 스택

| 영역 | 사용 기술 |
| --- | --- |
| Framework | Next.js 16 App Router |
| UI | React 19 |
| Language | TypeScript strict |
| Styling | Tailwind CSS v4, CSS custom properties |
| Document editor | `@rhwp/editor`, bundled rhwp studio assets |
| AI | AI SDK, OpenAI-compatible API, Ollama-compatible endpoint |
| Persistence | Browser `localStorage` / `sessionStorage` |
| Deployment | Vercel 또는 self-hosted Next.js |

## 주요 기능

- 채팅 기반 문서 작성/수정 명령
- rhwp WASM 기반 HWP/HWPX 미리보기 및 편집
- AI 응답의 `hwp-maker-actions` / `rhwp-actions` 액션 실행
- OpenAI-compatible API 및 Ollama-compatible endpoint 설정
- AI 프로필 선택 및 사용자 프로필 저장
- 채팅 세션 저장, 복원, 이름 변경, 삭제
- 텍스트/문서/이미지 첨부파일 처리
- 내장 HWP/HWPX 템플릿 목록 로드
- 사용자 HWP/HWPX 템플릿 업로드
- 문서 변수 입력 및 치환
- `ai` 문서 변수 자동 생성
- Latte/Mocha 테마 전환

## 프로젝트 구조

```text
hwp-maker/
├─ app/
│  ├─ page.tsx                  # 메인 페이지, EditorLayout 렌더링
│  ├─ layout.tsx                # 루트 레이아웃, 메타데이터, 테마 초기화
│  ├─ globals.css               # Tailwind v4 및 디자인 토큰
│  └─ api/
│     ├─ chat/route.ts          # AI chat streaming proxy
│     ├─ templates/route.ts     # public/templates 목록 조회
│     └─ template-ai/route.ts   # 문서 변수 ai 값 생성
├─ components/
│  ├─ chat/                     # 채팅, 첨부파일, 세션 UI
│  ├─ editor/                   # 에디터 레이아웃, 미리보기, 템플릿, 문서 변수, 프로필, 설정
│  └─ ui/                       # 상단바, 아이콘 레일, 테마/설정 UI
├─ lib/
│  ├─ ai/                       # AI 설정, 프로필, rhwp action 파싱
│  ├─ attachment/               # 첨부파일 읽기/처리
│  ├─ chat/                     # 채팅 세션 저장소
│  ├─ rhwp/                     # rhwp editor bridge
│  ├─ session/                  # 에디터 세션 유틸
│  ├─ templates/                # 문서 변수 YAML 처리
│  └─ theme.ts
├─ public/
│  ├─ rhwp-studio/              # bundled rhwp studio, WASM, fonts, samples
│  └─ templates/                # built-in HWP/HWPX templates
├─ types/
│  ├─ attachment.ts
│  └─ hwp.ts
├─ SKILLS.md                    # LLM용 hwp-actions 프로토콜
├─ TODO.md
└─ AGENTS.md
```

## 설치 및 실행

```bash
npm install
npm run dev
```

브라우저에서 <http://localhost:3000>을 엽니다.

## 환경 변수

서버 프록시 기본값으로 사용할 OpenAI-compatible endpoint를 설정할 수 있습니다.

```env
OPENAI_API_BASE_URL=https://api.openai.com/v1
OPENAI_API_KEY=your-api-key
```

앱 안의 AI 설정 모달에서도 Base URL, API Key, 모델명을 지정할 수 있습니다. 기본 설정은 Ollama 호환 로컬 endpoint입니다.

```text
Base URL: http://localhost:11434/v1
Model: llama3
```

브라우저에 저장되는 API 설정은 서버에 별도 저장되지 않습니다.

## 개발 명령

```bash
npm run dev      # 개발 서버
npm run build    # 프로덕션 빌드
npm run start    # 빌드 결과 실행
npm run lint     # ESLint
```

## rhwp 에디터 연동

`components/editor/PreviewPanel.tsx`가 `@rhwp/editor`를 클라이언트에서 동적으로 로드하고 `/rhwp-studio/index.html`을 iframe으로 띄웁니다.

앱과 rhwp studio iframe은 `postMessage` 기반 요청/응답으로 통신합니다. 고수준 작업은 `lib/rhwp/loader.ts`의 `rhwpActions`를 통해 실행합니다.

현재 지원하는 주요 작업:

- 현재 문서 컨텍스트 읽기
- 필드 목록 조회
- 필드 값 채우기
- 텍스트 삽입
- 전체 텍스트 치환/삭제
- 문서 로드
- HWP/HWPX export

AI가 문서를 수정하려면 `SKILLS.md`에 정의된 `hwp-maker-actions` 또는 `rhwp-actions` 블록을 응답에 포함해야 합니다.

## 템플릿과 문서 변수

`public/templates/`에 `.hwp` 또는 `.hwpx` 파일을 넣으면 템플릿 패널에서 자동으로 표시됩니다.

같은 이름의 `.yaml` 또는 `.yml` 파일이 있으면 문서 변수 정의로 인식합니다.

```text
보고서.hwpx
보고서.yaml
```

한글 문서 본문에는 `{{변수명}}` 형식의 플레이스홀더를 넣고 YAML에서 입력 방식을 정의합니다. 템플릿 선택은 `템플릿` 탭에서, 변수 입력/생성/치환은 `문서 변수` 탭에서 수행합니다.

지원 변수 타입:

- `text`: 직접 입력
- `select`: 선택지 중 하나 선택
- `date`: 현재 날짜 기반 값 생성
- `script`: 제한된 내장 스크립트 값 생성
- `ai`: 현재 변수 값을 바탕으로 AI가 텍스트 생성

문서 변수 YAML은 문서 기본 정보(`document.author`, `document.description`, `document.systemPrompt`), 변수별 설명(`description`), 조건부 선택지(`optionsWhen`)도 지원합니다. 문서 기본 정보와 `systemPrompt`는 문서 변수 탭에서 수정할 수 있고, `ai` 변수 생성 및 채팅 요청에 함께 전달됩니다.

자세한 예시는 `public/templates/README.md`를 참고하세요.

## 현재 주의사항

- Next.js 16을 사용합니다. Next.js 관련 코드를 수정하기 전에는 `node_modules/next/dist/docs/`의 관련 문서를 확인해야 합니다.
- Tailwind CSS는 v4 문법입니다. v3 설정 파일 중심의 전제를 사용하지 않습니다.
- HWP/HWPX 문서 처리는 가능한 한 브라우저/rhwp 쪽에서 수행합니다.
- API route는 AI proxy, 템플릿 목록 조회, 템플릿 AI 변수 생성처럼 서버가 필요한 작업에 한정합니다.
- README는 현재 구현 상태를 설명하며, 제품 범위와 미결정 사항은 `TODO.md`에 정리합니다.

## 라이선스

MIT License. 자세한 내용은 `LICENSE`를 참고하세요.
