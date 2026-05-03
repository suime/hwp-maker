# Offline Docker Deployment Plan

## TL;DR
> **Summary**: 인터넷 연결 환경에서 Docker 이미지를 미리 빌드하여 오프라인 머신으로 이동·실행하는 배포 체계 구축. 호스트 Ollama를 AI 엔드포인트로 사용.
> **Deliverables**: `Dockerfile`, `docker-compose.yml`, `.dockerignore`, `DEPLOY-OFFLINE.md` (배포 가이드)
> **Effort**: Short
> **Parallel**: YES - 2 waves (files can be created in parallel)
> **Critical Path**: Dockerfile → docker-compose → docs → build/test

## Context
### Original Request
"현재 프로젝트를 인터넷 연결이 없는곳에서 실행하고 싶어. 어떻게 내보내기 해?"

### Interview Summary
- 배포 방식: Docker 이미지 (docker save/load로 오프라인 이동)
- AI 기능: 로컬 Ollama + 외부 API 둘 다 지원 (기본은 Ollama)
- Ollama 토폴로지: 호스트에 별도 설치된 Ollama 사용
- Ollama 모델: 호스트에 이미 존재함

### Metis Review (gaps addressed)
- **localhost vs container networking**: 컨테이너에서 호스트 Ollama 접근 시 `host.docker.internal` 또는 IP 사용 필요 → docs에 명시
- **Next.js standalone**: `next.config.ts`에 `output: 'standalone'` 추가 필요 → T1에서 처리
- **WASM/static assets**: `public/rhwp-studio/`가 최종 이미지에 포함되어야 함 → Dockerfile COPY 명시
- **AI config defaults**: 서버 env vars + 클라이언트 localStorage 간 매칭 → compose env로 `OPENAI_API_BASE_URL` 등 설정
- **Scope creep 방지**: auth, DB, TLS, UI 변경 등은 제외

## Work Objectives
### Core Objective
hwp-maker 앱을 Docker 컨테이너로 패키징하여 인터넷 없는 환경에서 실행 가능하게 한다.

### Deliverables
1. `Dockerfile` - 멀티스테이지 빌드, Next.js standalone 모드
2. `docker-compose.yml` - 앱 서비스 + 호스트 Ollama 연동 설정
3. `.dockerignore` - 불필요 파일 제외
4. `DEPLOY-OFFLINE.md` - 오프라인 배포 절차 문서
5. `next.config.ts` 수정 - `output: 'standalone'` 추가

### Definition of Done (verifiable conditions with commands)
- [ ] `docker build -t hwp-maker:test .` 성공
- [ ] `docker compose up -d` 후 `curl -f http://localhost:3000` 200 응답
- [ ] `curl -f http://localhost:3000/rhwp-studio/index.html` 성공
- [ ] `curl -f http://localhost:3000/api/templates` 성공
- [ ] `docker save hwp-maker:test -o hwp-maker.tar` → 파일 생성 확인
- [ ] AI 엔드포인트 미설정 시 앱 크래시 없이 시작

### Must Have
- 멀티스테이지 빌드로 최소 이미지 크기
- `public/` 전체 assets 포함 (rhwp-studio, templates)
- 호스트 Ollama 연동을 위한 네트워크 설정 (`host.docker.internal`)
- 환경변수 기반 AI config (OPENAI_API_BASE_URL, OPENAI_API_KEY 등)
- docker save/load 기반 오프라인 이동 가이드

### Must NOT Have (guardrails)
- 인증/DB/TLS/reverse proxy 추가 금지
- Ollama 컨테이너 포함 금지 (호스트 Ollama 사용)
- UI 변경/리팩토링 금지
- Kubernetes/Helm 관련 설정 금지
- v3 Tailwind 가정 금지
- 기존 rhwp-studio assets 변경 금지

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: tests-after (기존 테스트 인프라 없음) + agent-executed QA scenarios
- QA policy: Every task has agent-executed scenarios (Docker build, curl health checks, Playwright editor loading)
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`

## Execution Strategy
### Parallel Execution Waves

Wave 1: [기반 파일 생성 - 독립적]
- T1. next.config.ts standalone 모드 추가
- T2. .dockerignore 생성
- T3. Dockerfile 생성

Wave 2: [의존적 설정 + 문서]
- T4. docker-compose.yml 생성
- T5. DEPLOY-OFFLINE.md 문서 생성

Wave 3: [검증]
- T6. Docker 빌드 + smoke test
- F1-F4. Final Verification Wave

### Dependency Matrix
| Task | Blocks | Blocked By |
|------|--------|------------|
| T1 | T3 | - |
| T2 | T3 | - |
| T3 | T6 | T1, T2 |
| T4 | T6 | T3 |
| T5 | - | T3, T4 |
| T6 | F1-F4 | T3, T4 |

### Agent Dispatch Summary
- Wave 1: 3 tasks (quick - file creation)
- Wave 2: 2 tasks (quick - compose + docs)
- Wave 3: 1 task (build/test) + 4 final verification agents

## TODOs

- [ ] 1. next.config.ts에 `output: 'standalone'` 추가

  **What to do**: `next.config.ts`에 `output: 'standalone'` 옵션을 추가하여 Next.js가 `.next/standalone/`에 최소 실행 파일을 출력하도록 설정. 기존 설정은 유지.
  **Must NOT do**: 기존 rhwp-studio iframe 관련 설정 변경 금지. 다른 config 추가 금지.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: 단일 파일, 명확한 수정
  - Skills: [] - No special skills needed
  - Omitted: [] - N/A

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: T3 | Blocked By: -

  **References**:
  - Pattern: `next.config.ts` - 현재 8라인, 단순 설정 객체
  - External: Next.js standalone output docs - `output: 'standalone'` produces minimal server deployment files

  **Acceptance Criteria** (agent-executable only):
  - [ ] `next.config.ts`에 `output: 'standalone'` 존재
  - [ ] 기존 주석/설정 유지
  - [ ] TypeScript 컴파일 에러 없음

  **QA Scenarios** (MANDATORY):
  ```
  Scenario: next.config.ts valid
    Tool: Bash
    Steps: npx tsc --noEmit next.config.ts (또는 npm run build)
    Expected: 컴파일 성공, 에러 없음
    Evidence: .sisyphus/evidence/task-1-config-valid.txt
  ```

  **Commit**: YES | Message: `feat(docker): add standalone output to next.config` | Files: [next.config.ts]

- [ ] 2. .dockerignore 생성

  **What to do**: 프로젝트 루트에 `.dockerignore` 파일 생성. 불필요한 파일(.git, .sisyphus, node_modules, IDE 파일, OS 파일 등)을 Docker 빌드 컨텍스트에서 제외.
  **Must NOT do**: public/, app/, components/, lib/, types/, package.json, package-lock.json 제외 금지.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: 단일 파일 생성, 명확한 패턴
  - Skills: [] - No special skills needed
  - Omitted: [] - N/A

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: T3 | Blocked By: -

  **References**:
  - Pattern: `.gitignore` - 유사한 제외 패턴 참고 가능

  **Acceptance Criteria** (agent-executable only):
  - [ ] `.dockerignore` 파일 존재
  - [ ] node_modules, .git, .sisyphus, *.md(Docker 관련 제외), .env.* 패턴 포함
  - [ ] public/, app/, lib/, components/, types/, package*.json, next.config.ts 제외하지 않음

  **QA Scenarios** (MANDATORY):
  ```
  Scenario: .dockerignore syntax valid
    Tool: Bash
    Steps: docker build --progress=plain . 2>&1 | grep -i "dockerignore" 또는 빌드 로그 확인
    Expected: .dockerignore가 빌드 컨텍스트에서 적용됨
    Evidence: .sisyphus/evidence/task-2-dockerignore-valid.txt
  ```

  **Commit**: YES | Message: `feat(docker): add .dockerignore for build context optimization` | Files: [.dockerignore]

- [ ] 3. Dockerfile 생성

  **What to do**: 멀티스테이지 빌드 Dockerfile 생성. Stage 1: deps install + build. Stage 2: standalone output + public assets 복사 + node로 실행. Node.js 20+ Alpine 기반.
  **Must NOT do**: 단일 스테이지 빌드 금지. full node_modules 복사 금지. Ollama 포함 금지.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: 표준 Next.js Dockerfile 패턴
  - Skills: [] - No special skills needed
  - Omitted: [] - N/A

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: T4, T5, T6 | Blocked By: T1, T2

  **References**:
  - Pattern: `next.config.ts` - standalone output 설정 확인용
  - External: Next.js Docker docs - standalone deployment with multi-stage build
  - Constraint: `public/` 디렉토리 전체를 최종 이미지에 COPY 해야 함 (rhwp-studio, templates)

  **Acceptance Criteria** (agent-executable only):
  - [ ] Dockerfile 존재, 멀티스테이지 빌드 구조
  - [ ] `FROM node:20-alpine` 또는 유사 경량 베이스
  - [ ] deps install, build, standalone copy 단계 분리
  - [ ] `public/` 디렉토리 COPY 포함
  - [ ] `CMD ["node", "server.js"]` 또는 동등한 실행 명령
  - [ ] 포트 3000 EXPOSE
  - [ ] `HOSTNAME=0.0.0.0` 또는 바인드 설정

  **QA Scenarios** (MANDATORY):
  ```
  Scenario: Docker build succeeds
    Tool: Bash
    Steps: docker build -t hwp-maker:test .
    Expected: 빌드 성공, exit code 0
    Evidence: .sisyphus/evidence/task-3-build-success.txt

  Scenario: Docker image starts and responds
    Tool: Bash
    Steps: docker run -d --name test-hwp -p 3000:3000 hwp-maker:test && sleep 5 && curl -f http://localhost:3000
    Expected: HTTP 200 응답, HTML content 반환
    Evidence: .sisyphus/evidence/task-3-health-check.txt

  Scenario: Static rhwp assets accessible
    Tool: Bash
    Steps: curl -f http://localhost:3000/rhwp-studio/index.html
    Expected: HTTP 200, HTML content with WASM references
    Evidence: .sisyphus/evidence/task-3-rhwp-assets.txt
  ```

  **Commit**: YES | Message: `feat(docker): add multi-stage Dockerfile for production` | Files: [Dockerfile]

- [ ] 4. docker-compose.yml 생성

  **What to do**: 앱 서비스 정의. 호스트 Ollama 연동을 위한 네트워크 설정. 환경변수로 AI config 기본값 설정.
  **Must NOT do**: Ollama 서비스 정의 금지. DB/redis/추가 서비스 금지.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: 표준 compose 파일 생성
  - Skills: [] - No special skills needed
  - Omitted: [] - N/A

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: T5, T6 | Blocked By: T3

  **References**:
  - Pattern: `lib/ai/providers.ts` - 서버 env vars 처리 (`OPENAI_API_BASE_URL`, `OPENAI_API_KEY`, `GEMINI_API_BASE_URL`, `GEMINI_API_KEY`)
  - Pattern: `lib/ai/config.ts` - 기본 Ollama 설정 `http://localhost:11434/v1`
  - Constraint: 컨테이너에서 호스트 접근 시 `host.docker.internal` 사용 (Docker Desktop) 또는 호스트 IP

  **Acceptance Criteria** (agent-executable only):
  - [ ] `docker-compose.yml` 존재
  - [ ] `hwp-maker` 서비스 정의, 이미지 빌드 설정
  - [ ] 포트 3000 매핑
  - [ ] `extra_hosts` 또는 네트워크 설정으로 호스트 Ollama 접근 가능
  - [ ] 환경변수: `OPENAI_API_BASE_URL=http://host.docker.internal:11434/v1`, `OPENAI_API_KEY=dummy`
  - [ ] restart policy 설정

  **QA Scenarios** (MANDATORY):
  ```
  Scenario: docker compose starts
    Tool: Bash
    Steps: docker compose up -d && sleep 5 && curl -f http://localhost:3000
    Expected: HTTP 200 응답
    Evidence: .sisyphus/evidence/task-4-compose-start.txt

  Scenario: docker compose without AI config still works
    Tool: Bash
    Steps: docker compose -f docker-compose.yml config (syntax check)
    Expected: 유효한 compose 설정 출력, 에러 없음
    Evidence: .sisyphus/evidence/task-4-compose-syntax.txt
  ```

  **Commit**: YES | Message: `feat(docker): add docker-compose.yml for offline deployment` | Files: [docker-compose.yml]

- [ ] 5. DEPLOY-OFFLINE.md 문서 생성

  **What to do**: 오프라인 배포 절차 문서 생성. 다음 섹션 포함:
  1. 개요 (2단계 프로세스 설명)
  2. 사전 요구사항 (인터넷 측/오프라인 머신)
  3. 1단계: Docker 이미지 빌드 (docker build → docker save → USB 전송)
  4. 2단계: Docker 이미지 로드 및 실행 (docker load → docker compose up / docker run)
  5. 3단계: AI 설정 (Ollama 로컬 테이블 + 외부 API 예시)
  6. 문제 해결 (앱 시작 실패, Ollama 연결, rhwp 에디터, 템플릿)
  7. 파일 구성 목록
  8. 빠른 참조 명령어 테이블

  **Must NOT do**: Vercel 배포 가이드 금지. Kubernetes 가이드 금지.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: 문서 생성
  - Skills: [] - No special skills needed
  - Omitted: [] - N/A

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: - | Blocked By: T3, T4

  **References**:
  - Pattern: `Dockerfile` - 빌드 명령 참조
  - Pattern: `docker-compose.yml` - 실행 명령 참조
  - External: docker save/load docs - 오프라인 이미지 이동

  **Acceptance Criteria** (agent-executable only):
  - [ ] `DEPLOY-OFFLINE.md` 존재
  - [ ] 빌드 명령 (`docker build`) 포함
  - [ ] 저장 명령 (`docker save`) 포함
  - [ ] 이동 방법 (USB/네트워크) 설명
  - [ ] 로드 명령 (`docker load`) 포함
  - [ ] 실행 명령 (`docker compose up` 또는 `docker run`) 포함
  - [ ] 호스트 Ollama 연동 방법 (`host.docker.internal` 또는 IP) 설명
  - [ ] 한국어로 작성
  - [ ] 문제 해결 섹션 포함

  **QA Scenarios** (MANDATORY):
  ```
  Scenario: Document exists and has required sections
    Tool: Bash
    Steps: grep -c "docker build\|docker save\|docker load\|docker compose\|host.docker.internal\|문제 해결" DEPLOY-OFFLINE.md
    Expected: 6개 이상 키워드 언급
    Evidence: .sisyphus/evidence/task-5-doc-sections.txt
  ```

  **Commit**: YES | Message: `docs: add offline Docker deployment guide` | Files: [DEPLOY-OFFLINE.md]

- [ ] 6. Docker 빌드 + smoke test 통합 검증

  **What to do**: 생성된 Dockerfile + docker-compose.yml로 전체 빌드 및 smoke test 실행.
  **Must NOT do**: 개별 파일 수정과 분리된 테스트 금지. 이전 task에서 검증을 완료했다면 생략 가능.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: 빌드 + 테스트 실행
  - Skills: [] - No special skills needed
  - Omitted: [] - N/A

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: F1-F4 | Blocked By: T3, T4

  **References**:
  - Pattern: `Dockerfile` - 빌드 대상
  - Pattern: `docker-compose.yml` - 실행 대상

  **Acceptance Criteria** (agent-executable only):
  - [ ] `docker build -t hwp-maker:test .` 성공
  - [ ] `docker compose up -d` 성공
  - [ ] `curl -f http://localhost:3000` HTTP 200
  - [ ] `curl -f http://localhost:3000/rhwp-studio/index.html` HTTP 200
  - [ ] `curl -f http://localhost:3000/api/templates` HTTP 200
  - [ ] `docker save hwp-maker:test -o /tmp/hwp-maker.tar` 성공, 파일 크기 > 0
  - [ ] 테스트 후 `docker compose down && docker rm -f test-hwp` 정리

  **QA Scenarios** (MANDATORY):
  ```
  Scenario: Full build and smoke test
    Tool: Bash
    Steps: |
      docker build -t hwp-maker:test .
      docker run -d --name test-hwp -p 3000:3000 hwp-maker:test
      sleep 5
      curl -f http://localhost:3000
      curl -f http://localhost:3000/rhwp-studio/index.html
      curl -f http://localhost:3000/api/templates
      docker save hwp-maker:test -o /tmp/hwp-maker.tar
      ls -lh /tmp/hwp-maker.tar
      docker stop test-hwp && docker rm test-hwp
    Expected: 모든 명령 성공, tar 파일 생성
    Evidence: .sisyphus/evidence/task-6-full-smoke-test.txt

  Scenario: App starts without AI env vars
    Tool: Bash
    Steps: docker run -d --name test-no-ai -p 3001:3000 hwp-maker:test && sleep 5 && curl -f http://localhost:3001
    Expected: 앱 크래시 없이 HTTP 200
    Evidence: .sisyphus/evidence/task-6-no-ai-start.txt
  ```

  **Commit**: NO

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
- [ ] F1. Plan Compliance Audit — oracle
- [ ] F2. Code Quality Review — unspecified-high
- [ ] F3. Real Manual QA — unspecified-high (+ playwright if UI)
- [ ] F4. Scope Fidelity Check — deep

## Commit Strategy
- T1: `feat(docker): add standalone output to next.config`
- T2: `feat(docker): add .dockerignore for build context optimization`
- T3: `feat(docker): add multi-stage Dockerfile for production`
- T4: `feat(docker): add docker-compose.yml for offline deployment`
- T5: `docs: add offline Docker deployment guide`
- T6: No commit (verification only)
- 각 커밋은 atomic. T1→T2→T3→T4→T5 순서로 커밋.

## Success Criteria
1. Docker 이미지가 빌드되고 `docker save`로 tar 파일 생성 가능
2. 오프라인 머신에서 `docker load` 후 `docker compose up`으로 앱 실행
3. `http://localhost:3000`에서 HWP 에디터 UI 정상 렌더링
4. 호스트 Ollama(`http://host.docker.internal:11434/v1`)를 AI 엔드포인트로 사용 가능
5. AI 설정 없이도 앱 크래시 없이 시작
6. 기존 기능(rhwp 편집, 템플릿, 채팅 UI) 변경 없음
