# 템플릿 파일 위치

이 디렉토리에 hwpx 템플릿 파일을 위치시키세요.

## 기본 내장 템플릿 (추가 예정)

- `업무계획_방침.hwpx` — 업무계획(방침) 양식
- `1P보고서.hwpx` — 1P 보고서 양식

파일을 이 디렉토리에 넣으면 템플릿 패널에서 자동으로 로드됩니다.

## 문서 변수 YAML

한글 파일과 같은 이름의 YAML 파일을 함께 두면 문서 변수 정의로 인식됩니다.

- `보고서.hwp` + `보고서.yaml`
- `보고서.hwpx` + `보고서.yaml`

한글 파일 본문에는 `{{변수명}}` 형태의 변수를 넣고, YAML에서 입력 방식을 정의합니다. 템플릿 파일은 템플릿 탭에서 선택하고, 변수 값 입력과 적용은 문서 변수 탭에서 처리합니다.

```yaml
document:
  author: 안전관리팀
  description: |
    안전관리 점검 결과를 정리하는 공공기관 보고서 양식입니다.
    점검 대상, 작성 부서, 요약 문장을 문서 변수로 관리합니다.
  systemPrompt: |
    이 문서는 공공기관 보고서입니다.
    모든 자동 생성 문장은 간결한 개조식으로 작성하세요.

variables:
  title:
    label: 문서 제목
    type: text
    description: 문서 상단 제목으로 치환되는 값입니다.
    default: 안전관리 점검 보고

  department:
    label: 작성 부서
    type: select
    description: 보고서를 작성하는 담당 부서를 선택합니다.
    options:
      - 안전관리팀
      - 시설관리팀
      - 홍보팀

  workType:
    label: 업무 유형
    type: select
    options:
      - 도로
      - 교량

  inspectionItem:
    label: 점검 항목
    type: select
    description: |
      업무 유형에 따라 선택지가 달라집니다.
      문서 본문의 {{inspectionItem}} 위치에 입력됩니다.
    options:
      - 일반 점검
    optionsWhen:
      workType:
        도로:
          - 포장 파손
          - 차선 도색
          - 배수 시설
        교량:
          - 신축 이음
          - 교좌 장치
          - 난간

  writtenDate:
    label: 작성일
    type: script
    script: date("yyyy-MM-dd")

  year:
    label: 연도
    type: script
    script: currentYear

  summary:
    label: 3줄 요약
    type: ai
    prompt: |
      문서 제목은 "{{title}}"입니다.
      작성 부서는 "{{department}}"입니다.
      이 정보를 바탕으로 보고서 첫머리에 넣을 3줄 요약을 작성하세요.
```

지원하는 변수 타입:

- `text`: 사용자가 직접 입력
- `select`: YAML에 정의된 선택지 중 하나 선택
- `script`: 날짜, 숫자 계산, 문자열 파싱을 위한 JavaScript 식 실행
- `ai`: 사용자가 선택/입력한 다른 변수 값을 `{{변수명}}`으로 참조해 지시문을 만들고, AI가 값을 생성

추가 기능:

- `script`: `date("yyyy-MM-dd")`, `currentYear`, `number(value("amount")) * 1.1`, `text(value("name")).trim()` 같은 식을 사용할 수 있습니다. 여러 줄 스크립트는 `return` 문으로 값을 반환하세요. 이전 `type: date` YAML은 `script` 타입으로 자동 변환됩니다.
- `document`: 문서 기본 정보 섹션입니다. `author`, `description`, `systemPrompt`를 모아 적을 수 있으며 문서 변수 탭에서 수정할 수 있습니다. 기존처럼 최상위에 `author`, `description`, `systemPrompt`를 직접 적는 형식도 지원합니다.
- `author`: 문서 작성자입니다. AI 변수 프롬프트에서 `{{author}}` 또는 `{{documentAuthor}}`로 참조할 수 있고, 문서에 같은 플레이스홀더가 있으면 치환됩니다.
- `description`: 문서 기본 설명입니다. AI 변수 프롬프트에서 `{{documentDescription}}`로 참조할 수 있고, 문서에 같은 플레이스홀더가 있으면 치환됩니다.
- `systemPrompt`: 문서 변수 세트에 연결되는 시스템 프롬프트입니다. `ai` 변수 생성과 채팅 요청에 함께 전달됩니다.
- `variables.<변수명>.description`: 각 변수의 설명 문구입니다. 문서 변수 사이드바에서 해당 입력 항목 아래에 표시되며, `|` 블록 문법으로 여러 줄 설명도 작성할 수 있습니다.
- `optionsWhen`: 다른 변수의 값에 따라 `select` 후보를 바꿉니다. 위 예시에서는 `workType` 값이 `도로`인지 `교량`인지에 따라 `inspectionItem`의 선택지가 바뀝니다.

### `script` 타입 예시

`script` 변수는 앞에 정의된 다른 문서 변수 값을 `value("변수명")`으로 읽을 수 있습니다. 숫자 계산에는 `number(...)`, 문자열 처리에는 `text(...)`를 사용하면 빈 값이나 쉼표가 섞인 숫자도 비교적 안전하게 다룰 수 있습니다.

```yaml
variables:
  itemA:
    label: 항목 A
    type: text
    default: 1200000

  itemB:
    label: 항목 B
    type: text
    default: 350000

  totalAmount:
    label: 합계
    type: script
    description: 항목 A와 항목 B를 숫자로 바꾼 뒤 더합니다.
    script: number(value("itemA")) + number(value("itemB"))

  formattedTotal:
    label: 합계 표시
    type: script
    description: 합계 금액에 세 자리마다 쉼표를 찍고 원 단위를 붙입니다.
    script: number(value("totalAmount")).toLocaleString("ko-KR") + "원"

  taxIncluded:
    label: 부가세 포함
    type: script
    description: 합계에 부가세 10%를 더하고 반올림합니다.
    script: Math.round(number(value("totalAmount")) * 1.1).toLocaleString("ko-KR") + "원"

  authorName:
    label: 작성자 원문
    type: text
    default: "홍길동 책임 / AI데이터처"

  authorOnly:
    label: 작성자 이름
    type: script
    description: 슬래시 뒤 부서명을 제거하고 이름만 남깁니다.
    script: text(value("authorName")).replace(/\s*\/.*$/, "").trim()

  normalizedPhone:
    label: 연락처
    type: script
    description: 숫자만 남긴 뒤 휴대전화 형식으로 변환합니다.
    script: |
      const digits = text(value("rawPhone")).replace(/\D/g, "");
      return digits.replace(/^(010)(\d{4})(\d{4})$/, "$1-$2-$3");
```
