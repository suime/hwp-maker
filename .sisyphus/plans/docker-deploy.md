# Docker 배포 - hwp-maker

## TL;DR

> **Quick Summary**: hwp-maker Next.js 16 프로젝트를 Docker 컨테이너로 배포할 수 있도록 Dockerfile (멀티스테이지 빌드), docker-compose.yml, .dockerignore, .env.example을 생성하고 next.config.ts에 standalone 모드를 추가합니다.
> 
> **Deliverables**:
> - `Dockerfile` - 멀티스테이지 빌드 (build → production)
> - `docker-compose.yml` - 서비스 정의, 환경변수, 포트 매핑
> - `.dockerignore` - 불필요 파일 제외
> - `.env.example` - 환경변수 템플릿
> - `next.config.ts` 수정 - `output: 'standalone'` 추가
> 
> **Estimated Effort**: Short (1-2 tasks, 10-15 minutes)
> **Parallel Execution**: YES - 2 waves
> **Critical Path**: next.config.ts 수정 → Dockerfile 생성 → docker-compose.yml → 검증

---

## Context

### Original Request
"현재 프로젝트를 도커 환경으로 배포할 수있도록 하고 싶어."

### Interview Summary
**Key Discussions**:
- 배포 목적: 프로덕션 빌드 (standalone 모드)
- 환경변수 관리: docker-compose env 파일 (.env 사용)
- 구성: 전체 패키지 (Dockerfile + docker-compose + .dockerignore + .env.example)

**Research Findings**:
- 현재 Docker 관련 파일 전혀 없음
- next.config.ts는 현재 빈 설정
- @rhwp/editor WASM 파일은 public/rhwp-studio/에 있으며 standalone 빌드 시 자동 포함

---

## Work Objectives

### Core Objective
hwp-maker Next.js 프로젝트를 Docker 컨테이너로 빌드하고 실행할 수 있도록 필요한 모든 설정 파일을 생성합니다.

### Concrete Deliverables
- `Dockerfile` - 멀티스테이지 빌드
- `docker-compose.yml` - 서비스 정의
- `.dockerignore` - 빌드 제외 패턴
- `.env.example` - 환경변수 템플릿
- `next.config.ts` - standalone 모드 활성화

### Definition of Done
- [ ] `docker compose up -d` 실행 시 컨테이너 시작
- [ ] `curl http://localhost:3000` 응답 확인
- [ ] 빌드 에러 없음

### Must Have
- 멀티스테이지 빌드로 최종 이미지 크기 최소화
- standalone 모드로 프로덕션 실행
- 환경변수 (.env 파일)로 OPENAI_API_KEY 등 설정

### Must NOT Have (Guardrails)
- 개발 의존성 (devDependencies)이 production 이미지에 포함되지 않음
- node_modules가 레이어에 캐시되지 않도록 .dockerignore에 포함
- CI/CD, Kubernetes 매니페스트는 scope 제외

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: NO
- **Automated tests**: None (도커 배포 검증은 agent QA로 충분)
- **Framework**: none
- **If TDD**: N/A

### QA Policy
Every task MUST include agent-executed QA scenarios.

- **Frontend/UI**: N/A
- **TUI/CLI**: Bash (docker compose, curl) - 컨테이너 실행, HTTP 응답 확인
- **API/Backend**: curl - localhost:3000 엔드포인트 확인
- **Library/Module**: N/A

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately - 설정 파일 생성, 병렬 가능):
├── Task 1: next.config.ts 수정 (standalone 추가) [quick]
├── Task 2: Dockerfile 생성 (멀티스테이지 빌드) [quick]
├── Task 3: .dockerignore 생성 [quick]
└── Task 4: .env.example + docker-compose.yml 생성 [quick]

Wave 2 (After Wave 1 - 빌드 + 검증):
└── Task 5: 도커 빌드 + 실행 검증 [quick]

Critical Path: Task 1-4 → Task 5
Parallel Speedup: 4 tasks in Wave 1 (all independent)
Max Concurrent: 4 (Wave 1)
```

### Dependency Matrix
- **1-4**: None (all independent)
- **5**: 1, 2, 3, 4 (모든 설정 파일 필요)

### Agent Dispatch Summary
- **Wave 1**: 4 tasks → all `quick` (T1-T4)
- **Wave 2**: 1 task → `quick` (T5)

---

## TODOs

- [ ] 1. next.config.ts 수정 - standalone 모드 추가

  **What to do**:
  - `next.config.ts`에 `output: 'standalone'` 추가
  - 기존 설정 유지 (빈 객체 주석 등)

  **Must NOT do**:
  - 다른 설정 변경하지 않음
  - 실험적인 기능 추가하지 않음

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 단일 파일, 1-2줄 수정
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (Tasks 2, 3, 4)
  - **Blocks**: Task 5
  - **Blocked By**: None

  **References**:
  - `next.config.ts` - 현재 설정 파일

  **Acceptance Criteria**:
  - [ ] `next.config.ts`에 `output: 'standalone'` 포함
  - [ ] `npm run build` 실행 시 `.next/standalone` 디렉토리 생성

  **Commit**: YES
  - Message: `feat(docker): add standalone output mode to next.config.ts`
  - Files: `next.config.ts`

---

- [ ] 2. Dockerfile 생성 - 멀티스테이지 빌드

  **What to do**:
  - Stage 1 (builder): node:20-alpine 기반, npm ci + npm run build
  - Stage 2 (production): node:20-alpine 기반, standalone output + production node_modules + public 복사
  - 포트 3000 노출, health check 설정
  - NODE_ENV=production 설정

  **Must NOT do**:
  - 개발 의존성 설치하지 않음 (production 이미지에)
  - 불필요한 패키지 추가하지 않음

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 표준 Next.js Dockerfile 패턴
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (Tasks 1, 3, 4)
  - **Blocks**: Task 5
  - **Blocked By**: None

  **References**:
  - `package.json` - dependencies/scripts 확인
  - Official Next.js Docker docs: https://nextjs.org/docs/app/building-your-application/deploying#docker

  **Acceptance Criteria**:
  - [ ] `docker build -t hwp-maker .` 성공
  - [ ] 최종 이미지 크기 < 300MB (alpine 기반)

  **Commit**: YES (groups with 3, 4)
  - Message: `feat(docker): add Dockerfile, .dockerignore, docker-compose.yml, .env.example`
  - Files: `Dockerfile`, `.dockerignore`, `docker-compose.yml`, `.env.example`

---

- [ ] 3. .dockerignore 생성

  **What to do**:
  - node_modules, .next, .git, .env, .sisyphus 등 제외
  - 개발 도구 파일 제외 (VS Code, IDE 설정)
  - 테스트 파일 제외

  **Must NOT do**:
  - public/, app/, components/, lib/ 등 소스 코드 제외하지 않음
  - next.config.ts 제외하지 않음

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 표준 .dockerignore 패턴
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (Tasks 1, 2, 4)
  - **Blocks**: Task 5
  - **Blocked By**: None

  **References**:
  - 프로젝트 루트 디렉토리 구조

  **Acceptance Criteria**:
  - [ ] `.dockerignore` 파일 생성
  - [ ] node_modules, .next, .git, .env 포함

  **Commit**: YES (groups with 2, 4)
  - Message: `feat(docker): add Dockerfile, .dockerignore, docker-compose.yml, .env.example`
  - Files: `.dockerignore`

---

- [ ] 4. .env.example + docker-compose.yml 생성

  **What to do**:
  - `.env.example` 생성: OPENAI_API_BASE_URL (외부 Ollama/OpenAI 서버 주소), OPENAI_API_KEY 템플릿
    - 예시: `OPENAI_API_BASE_URL=http://<ollama-server-host>:11434/v1`
  - `docker-compose.yml` 생성:
    - 서비스명: hwp-maker (단일 서비스)
    - 빌드 컨텍스트: 현재 디렉토리
    - 포트: 3000:3000 (환경변수로 변경 가능)
    - env_file: .env
    - restart policy: unless-stopped

  **Must NOT do**:
  - 실제 API 키 포함하지 않음 (.env.example은 템플릿만)
  - Ollama 서비스 포함하지 않음 (별도 호스트 서버 사용)
  - 불필요한 서비스 추가하지 않음 (db, redis 등)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 표준 docker-compose 패턴
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (Tasks 1, 2, 3)
  - **Blocks**: Task 5
  - **Blocked By**: None

  **References**:
  - `package.json` - 스크립트 확인
  - README.md - 환경변수 섹션

  **Acceptance Criteria**:
  - [ ] `.env.example` 파일 생성 (OPENAI_API_BASE_URL, OPENAI_API_KEY 포함)
  - [ ] `docker-compose.yml` 파일 생성 (서비스, 빌드, 포트, env_file 정의)
  - [ ] `docker compose config` 유효성 검사 통과

  **Commit**: YES (groups with 2, 3)
  - Message: `feat(docker): add Dockerfile, .dockerignore, docker-compose.yml, .env.example`
  - Files: `.env.example`, `docker-compose.yml`

---

- [ ] 5. 도커 빌드 + 실행 검증

  **What to do**:
  - `docker compose build` 실행
  - `docker compose up -d` 실행
  - `curl http://localhost:3000` 응답 확인
  - 로그 확인 (`docker compose logs`)
  - 컨테이너 정리 (`docker compose down`)

  **Must NOT do**:
  - 프로덕션 환경에 배포하지 않음 (로컬 검증만)
  - 이미지 푸시하지 않음

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 명령 실행 및 검증
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (sequential after Wave 1)
  - **Blocks**: None (final verification)
  - **Blocked By**: Tasks 1, 2, 3, 4

  **References**:
  - `Dockerfile` - 빌드 설정
  - `docker-compose.yml` - 서비스 설정

  **Acceptance Criteria**:
  - [ ] `docker compose build` 성공
  - [ ] `docker compose up -d` 성공
  - [ ] `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000` → 200
  - [ ] `docker compose down` 성공

  **QA Scenarios**:

  ```
  Scenario: 도커 빌드 성공 검증
    Tool: Bash
    Steps:
      1. cd C:\Users\Administrator\project\github.com\suime\hwp-maker
      2. docker compose build
    Expected Result: 빌드 성공, 에러 없음
    Evidence: .sisyphus/evidence/task-5-docker-build.txt
  ```

  ```
  Scenario: 도커 컨테이너 실행 + HTTP 응답 검증
    Tool: Bash
    Steps:
      1. docker compose up -d
      2. sleep 5 (컨테이너 시작 대기)
      3. curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
    Expected Result: HTTP 200 응답
    Evidence: .sisyphus/evidence/task-5-http-response.txt
  ```

  ```
  Scenario: 도커 컨테이너 정리
    Tool: Bash
    Steps:
      1. docker compose down
      2. docker ps | grep hwp-maker (빈 결과 확인)
    Expected Result: 컨테이너 중지 및 제거 완료
    Evidence: .sisyphus/evidence/task-5-cleanup.txt
  ```

  **Commit**: NO (검증만)

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists. For each "Must NOT Have": search codebase for forbidden patterns. Check evidence files exist. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Review all created files (Dockerfile, docker-compose.yml, .dockerignore, .env.example, next.config.ts) for: correct syntax, security issues (no hardcoded secrets), best practices.
  Output: `Build [PASS/FAIL] | Syntax [PASS/FAIL] | Security [PASS/FAIL] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high`
  Start from clean state. Execute EVERY QA scenario from EVERY task. Test docker compose build + up + curl + down flow. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual files. Verify 1:1 compliance. No extra files created, no missing files.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN] | VERDICT`

---

## Commit Strategy

- **1**: `feat(docker): add standalone output mode to next.config.ts`
- **2-4**: `feat(docker): add Dockerfile, .dockerignore, docker-compose.yml, .env.example`

---

## Success Criteria

### Verification Commands
```bash
docker compose build      # Expected: successful build
docker compose up -d      # Expected: container starts
curl http://localhost:3000 # Expected: HTTP 200 response
docker compose down       # Expected: container stops
```

### Final Checklist
- [ ] `next.config.ts`에 `output: 'standalone'` 포함
- [ ] `Dockerfile` 생성 (멀티스테이지 빌드)
- [ ] `.dockerignore` 생성
- [ ] `docker-compose.yml` 생성
- [ ] `.env.example` 생성
- [ ] `docker compose build` 성공
- [ ] `docker compose up -d` 성공
- [ ] `curl http://localhost:3000` → HTTP 200
