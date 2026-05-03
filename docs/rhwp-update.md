# rhwp-studio / WASM 업데이트 참고

이 프로젝트는 `@rhwp/editor`를 통해 rhwp 에디터 iframe을 띄우지만, 실제 에디터 UI와 WASM은 `public/rhwp-studio/`에 self-hosting된 빌드 산출물을 사용한다.

## 현재 연결 구조

- `components/editor/PreviewPanel.tsx`
  - `@rhwp/editor`를 client-side dynamic import
  - `createEditor(container, { studioUrl: '/rhwp-studio/index.html' })`로 iframe 생성
- `public/rhwp-studio/index.html`
  - Vite로 빌드된 `assets/index-*.js`, `assets/index-*.css`를 로드
- `public/rhwp-studio/rhwp.js`, `public/rhwp-studio/assets/rhwp_bg-*.wasm`
  - rhwp WASM 바인딩과 실제 WASM 엔진

`@rhwp/editor` 패키지는 iframe wrapper에 가깝고, 저장/렌더링/편집 로직은 `public/rhwp-studio/` 안의 rhwp-studio 번들에 있다.

## 왜 WASM만 단독 교체하면 안 되는가

`rhwp_bg.wasm`, `rhwp.js`, `rhwp-studio/assets/index-*.js`는 같은 upstream 커밋 기준으로 맞아야 한다. WASM API가 바뀌면 JS glue code와 studio 번들이 함께 바뀌므로, 안전한 교체 단위는 다음 전체다.

```text
rhwp-studio/dist/
```

즉 최신 upstream을 가져올 때는 `wasm-pack`으로 `pkg/`를 만들고, 그 결과물을 `rhwp-studio/public/`에 넣은 뒤, `rhwp-studio`를 `/rhwp-studio/` base로 다시 빌드해 `public/rhwp-studio/` 전체를 교체한다.

## upstream 빌드 절차

```bash
git clone https://github.com/edwardkim/rhwp.git
cd rhwp

# Docker 기반 WASM 빌드
cp .env.docker.example .env.docker
docker compose --env-file .env.docker run --rm wasm

# 또는 wasm-pack이 로컬에 있으면
wasm-pack build --target web --release
```

WASM 빌드 결과는 upstream repo의 `pkg/`에 생성된다.

```text
pkg/rhwp.js
pkg/rhwp_bg.wasm
pkg/rhwp.d.ts
```

그 다음 rhwp-studio 빌드 전에 `pkg` 산출물을 studio public으로 복사한다.

```bash
cp pkg/rhwp_bg.wasm rhwp-studio/public/
cp pkg/rhwp.js rhwp-studio/public/
cd rhwp-studio
npm install
npx vite build --base=/rhwp-studio/
```

빌드 결과는 다음 위치다.

```text
rhwp-studio/dist/
```

이 내용을 이 프로젝트의 아래 경로로 교체한다.

```text
public/rhwp-studio/
```

## 이 프로젝트에서 한 번에 실행하기

`justfile`에 `update-rhwp` recipe가 있다.

```bash
just update-rhwp
```

기본 동작:

1. 임시 작업 디렉터리에 `https://github.com/edwardkim/rhwp.git` clone 또는 fetch
2. 지정 branch/tag checkout (`main` 기본)
3. `wasm-pack build --target web --release` 실행
   - `wasm-pack`이 없으면 Docker Compose로 upstream `wasm` 서비스를 실행
   - Windows 환경에서 `docker compose` 대신 `docker-compose`만 있는 경우도 처리
4. `pkg/rhwp_bg.wasm`, `pkg/rhwp.js`를 `rhwp-studio/public/`에 복사
5. `rhwp-studio` 의존성 설치
6. `npx vite build --base=/rhwp-studio/` 실행
7. 기존 `public/rhwp-studio`를 백업
8. 새 `rhwp-studio/dist`를 `public/rhwp-studio`로 복사

`pkg/rhwp_bg.wasm` 또는 `pkg/rhwp.js`가 생성되지 않으면 recipe가 즉시 실패한다. 이 경우 먼저 `wasm-pack` 또는 Docker Compose 설치/실행 상태를 확인한다.

특정 tag/branch를 쓰려면:

```bash
just update-rhwp v0.7.9
```

## 저장 오류 관련 주의점

upstream rhwp는 HWPX 저장 안정화 이슈가 있었다.

- `#178`: HWPX → HWP 저장/재열기 문제
- `#196`: HWPX 저장 사용자 고지/비활성화
- `#197`: HWPX→HWP 완전 변환기 후속

따라서 현재 오류가 HWPX 저장에서 발생한다면, 최신 WASM으로 바꿔도 “HWPX 저장 성공”이 아니라 “HWPX 저장 비활성화/가드/안내”로 동작할 수 있다. HWP 저장과 HWPX 저장은 분리해서 검증해야 한다.

## postMessage bridge 호환성 확인

이 프로젝트의 `PreviewPanel.tsx`는 iframe에 다음과 같은 커스텀 메서드를 요청한다.

```text
getDocumentText
getFieldList
setFieldValueByName
replaceAll
insertText
exportFile
loadFile
```

upstream rhwp-studio 기본 postMessage API는 버전에 따라 `loadFile`, `pageCount`, `getPageSvg`, `exportHwp`, `ready` 중심일 수 있다. 따라서 upstream dist를 그대로 교체한 뒤에는 다음을 반드시 확인한다.

- `exportFile` 요청이 동작하는가?
- `getDocumentText`, `getFieldList`, `replaceAll`, `insertText`가 동작하는가?
- HWP 저장과 HWPX 저장 실패/가드가 사용자에게 명확히 보이는가?

필요하면 upstream `rhwp-studio/src/main.ts`에 hwp-maker가 기대하는 postMessage handler를 추가한 fork/patch를 빌드해야 한다.
