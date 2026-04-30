# hwp-maker TODO

현재 구현 상태와 남은 제품/기술 과제를 정리합니다.

## 우선순위 높은 미결 사항

### AI 양식/스타일 모델 정리

- [ ] 템플릿, 문서 변수, 프로필, 프로젝트가 각각 무엇을 책임지는지 정의
  - 템플릿: HWP/HWPX 양식, 필드, 플레이스홀더, YAML 변수
  - 문서 변수: YAML 변수 정의, 입력값, LLM 생성값, 문서 치환
  - 프로필: 문체, 작성 규칙, 시스템 프롬프트, 선택적 AI 설정
  - 프로젝트: 프로필, 템플릿, 기본 변수, 채팅 세션을 묶는 작업 단위
- [ ] AI가 “양식을 유지하고 내용만 생성”하도록 프롬프트/컨텍스트 규칙 강화
- [ ] 문서 변수와 AI 프로필 시스템 프롬프트의 우선순위 정의
- [ ] 문서 스타일 적용 범위 결정
  - 현재는 주로 텍스트 삽입/치환 중심
  - 향후 글자 모양, 문단 모양, 표/섹션 조작까지 확장할지 결정

### 에디터-AI 액션 인터페이스 고도화

- [ ] `hwp-maker-actions` 프로토콜 버전 관리 방식 정의
- [ ] 액션 실행 결과를 채팅 UI에 명확히 표시
  - 성공
  - 일부 실패
  - 에디터 미준비
  - 원문 불일치로 치환/삭제 실패
- [ ] `replace_all`/`delete_text` 실패 시 대체 전략 설계
  - 짧은 고유 문장 단위 재시도
  - 사용자 확인 요청
  - 문서 컨텍스트 재조회
- [ ] 커서/선택 영역 기반 삽입 UX 검증
- [ ] 스타일 관련 액션 구현 여부 결정
  - `apply_char_shape`
  - `apply_paragraph_shape`
  - heading/list/table 액션
- [ ] `SKILLS.md`와 `lib/ai/rhwpCommands.ts`의 지원 액션을 계속 동기화

### 프로젝트 기능 정의

- [ ] 프로젝트 스키마 정의
  - 이름
  - 활성 AI 프로필
  - 연결된 문서 템플릿
  - 기본 변수
  - 관련 채팅 세션
  - 최근 문서 상태
- [ ] 프로젝트 저장 위치 결정
  - 우선 `localStorage`
  - 추후 파일 export/import 또는 서버 저장 확장
- [ ] 프로젝트 생성/선택/수정/삭제 UI 설계
- [ ] 채팅/문서 작성 시 프로젝트 컨텍스트 주입 방식 정의
- [ ] 프로젝트 변수와 템플릿 YAML 변수의 우선순위 규칙 정의

## 기능별 남은 과제

### 템플릿과 문서 변수

- [x] `public/templates/`의 HWP/HWPX 파일 목록 API 제공
- [x] 템플릿 패널에서 내장 템플릿 로드
- [x] 사용자 HWP/HWPX 템플릿 업로드
- [x] `.hwp/.hwpx + .yaml/.yml` 문서 변수 정의 인식
- [x] 문서 변수 전용 아이콘 레일 탭 추가
- [x] `{{변수명}}` 플레이스홀더 치환
- [x] YAML 변수 타입 지원
  - [x] `text`
  - [x] `select`
  - [x] `date`
  - [x] `script`
  - [x] `llm`
- [x] `llm` 변수 생성 API 구현
- [ ] 사용자 업로드 템플릿 영구 저장 방식 개선
  - 현재 ArrayBuffer는 세션 내 상태 중심
  - IndexedDB 또는 파일 재선택 UX 검토
- [ ] 문서 변수 YAML 검증/오류 메시지 개선
- [ ] YAML 파서를 검증된 라이브러리로 교체할지 결정
- [ ] 문서 변수 적용 전 미리보기/되돌리기 UX 설계
- [ ] 같은 변수의 여러 표기 방식 지원 여부 결정
  - `{{name}}`
  - `{{ name }}`
  - HWP 누름틀/필드명 기반 치환

### AI 프로필

- [x] 내장 프로필 정의
- [x] 활성 프로필 저장
- [x] 사용자 프로필 저장/삭제 유틸
- [x] 프로필 YAML export/import용 간이 변환 유틸
- [ ] 프로필 관리 UI 완성도 점검
- [ ] 프로필별 API 설정 override UX 확정
- [ ] 프로필 스키마 검증 추가
- [ ] 내장 프로필 보강
  - 공문
  - 보고서
  - 회의록
  - 보도자료
  - 계약/공사 문서

### 채팅 및 첨부파일

- [x] 채팅 첨부파일 데이터 모델
- [x] 파일 리더 유틸
- [x] 첨부 버튼/미리보기/메시지 첨부 UI
- [x] 드래그 앤 드롭 첨부
- [x] 이미지 붙여넣기 첨부
- [x] 텍스트 첨부파일 컨텍스트 주입
- [x] 이미지 첨부파일 Vision-compatible 전달
- [x] 채팅 세션 저장/복원
- [x] 세션 목록/선택/이름 변경/삭제
- [ ] 첨부파일 크기 제한과 사용자 안내 정교화
- [ ] PDF/문서 텍스트 추출 품질 검증
- [ ] 오래된 세션/큰 첨부파일로 인한 localStorage 용량 초과 대응
- [ ] 세션 export/import 지원 여부 결정

### AI API

- [x] `/api/chat` streaming proxy 구현
- [x] OpenAI-compatible endpoint 설정 지원
- [x] Ollama-compatible local endpoint 기본값 제공
- [x] 브라우저 AI 설정 저장
- [ ] AI SDK 의존성 경로 정리
  - 현재 `/api/chat`과 `/api/template-llm`에서 `@ai-sdk/react` 하위의 `ai` dist를 직접 import
  - root `ai` 패키지와 버전 호환 문제를 근본적으로 정리 필요
- [ ] 모델별 Vision 지원 여부 안내
- [ ] API 오류 메시지 개선
- [ ] stream 중단/재시도 UX 추가
- [ ] API key 저장 방식과 보안 안내 보강

### rhwp 에디터 브릿지

- [x] `@rhwp/editor` 동적 로드
- [x] `/rhwp-studio/index.html` iframe 기반 editor mount
- [x] `postMessage` 요청/응답 브릿지
- [x] 현재 문서 텍스트 읽기
- [x] 필드 목록 조회
- [x] 필드 값 채우기
- [x] 텍스트 삽입
- [x] 전체 치환/삭제
- [x] 문서 로드
- [x] HWP/HWPX export 래퍼
- [ ] 실제 rhwp studio API 변경에 대비한 타입/호환성 점검
- [ ] 요청 timeout/오류 처리 세분화
- [ ] 액션 실행 후 문서 상태 재조회/동기화 방식 확정
- [ ] 에디터 초기화 실패 시 복구 버튼 추가

### UI/UX

- [x] 아이콘 레일 + 사이드 패널 + 전체 높이 프리뷰 레이아웃
- [x] 사이드바 리사이즈
- [x] 사이드바 좌/우 위치 설정
- [x] Latte/Mocha 테마
- [x] AI 설정 모달
- [x] 템플릿 패널
- [x] 프로필 패널
- [x] 설정 패널
- [ ] 작은 화면/모바일 레이아웃 점검
- [ ] 키보드 접근성 점검
- [ ] 버튼/아이콘 툴팁 일관성 점검
- [ ] Korean UI copy 정리
- [ ] 로딩/실패/빈 상태 문구 통일

## 문서 및 유지보수

- [x] `AGENTS.md` 현재 아키텍처 기준 정리
- [x] `README.md` 현재 구현 기준 갱신
- [x] `TODO.md` 현재 구현 기준 재분류
- [x] `SKILLS.md`에 LLM-facing hwp-actions 프로토콜 정의
- [ ] `README.md`에 스크린샷 또는 짧은 데모 흐름 추가
- [ ] `SKILLS.md`와 실제 parser/action 타입 불일치 자동 검증 검토
- [ ] `DESIGN.md`, `GEMINI.md`, `CLAUDE.md` 최신성 점검
- [ ] 템플릿 YAML 작성 가이드 보강
- [ ] 릴리스/배포 가이드 작성

## 테스트

- [ ] `npm run lint` 정기 실행
- [ ] `npm run build` 정기 실행
- [ ] `lib/ai/rhwpCommands.ts` 액션 파서 단위 테스트 추가
- [ ] `lib/templates/advanced.ts` YAML 파서/변수 평가 테스트 추가
- [ ] `lib/attachment/reader.ts` 첨부파일 처리 테스트 추가
- [ ] 문서 변수 치환 통합 테스트 검토
- [ ] rhwp iframe 브릿지 수동 테스트 체크리스트 작성

## 결정 완료

- [x] 프레임워크: Next.js App Router
- [x] 언어: TypeScript strict
- [x] 스타일링: Tailwind CSS v4
- [x] 문서 처리: rhwp WASM 및 `@rhwp/editor`
- [x] rhwp studio 배포 방식: `public/rhwp-studio/` 정적 파일 포함
- [x] AI: OpenAI-compatible API 및 Ollama-compatible endpoint
- [x] 인증: 없음
- [x] 기본 저장 방식: 브라우저 로컬 저장소 + 로컬 파일 다운로드
- [x] 서버 역할: AI proxy와 정적 리소스 목록/보조 API로 제한

## 보류 중인 제품 결정

- [ ] 한국어 전용으로 유지할지 i18n 구조를 도입할지
- [ ] 사용자 템플릿을 브라우저에 저장할지, 파일 기반으로 매번 불러오게 할지
- [ ] 프로젝트 기능을 MVP에 포함할지, 템플릿/프로필 안정화 이후로 미룰지
- [ ] AI가 문서 구조까지 생성할 수 있게 할지, 기존 양식 안의 내용 생성으로 제한할지
- [ ] 서버 저장 기능을 도입할지 여부
