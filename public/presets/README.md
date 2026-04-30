# 프리셋 파일 위치

이 디렉토리에는 문서 변수와 AI 시스템 프롬프트를 담은 YAML 프리셋을 위치시킵니다.

- 지원 확장자: `.yaml`, `.yml`
- 파일을 이 디렉토리에 넣으면 프리셋 탭의 `기본 프리셋` 목록에 표시됩니다.
- 한글 문서 템플릿 파일은 `public/templates`에 둡니다.

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

  writtenDate:
    label: 작성일
    type: script
    script: date("yyyy-MM-dd")

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

- `document`: 문서 기본 정보 섹션입니다. `author`, `description`, `systemPrompt`를 모아 적을 수 있습니다.
- `variables.<변수명>.description`: 각 변수의 설명 문구입니다. 프리셋 사이드바에서 해당 입력 항목 아래에 표시됩니다.
- `optionsWhen`: 다른 변수의 값에 따라 `select` 후보를 바꿉니다.

## `script` 타입 예시

`script` 변수는 앞에 정의된 다른 문서 변수 값을 `value("변수명")`으로 읽을 수 있습니다. 숫자 계산에는 `number(...)`, 문자열 처리에는 `text(...)`를 사용할 수 있습니다.

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
