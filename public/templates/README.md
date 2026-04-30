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
variables:
  title:
    label: 문서 제목
    type: text
    default: 안전관리 점검 보고

  department:
    label: 작성 부서
    type: select
    options:
      - 안전관리팀
      - 시설관리팀
      - 홍보팀

  writtenDate:
    label: 작성일
    type: date
    format: yyyy-MM-dd

  year:
    label: 연도
    type: script
    script: currentYear

  summary:
    label: 3줄 요약
    type: llm
    prompt: |
      문서 제목은 "{{title}}"입니다.
      작성 부서는 "{{department}}"입니다.
      이 정보를 바탕으로 보고서 첫머리에 넣을 3줄 요약을 작성하세요.
```

지원하는 변수 타입:

- `text`: 사용자가 직접 입력
- `select`: YAML에 정의된 선택지 중 하나 선택
- `date`: 현재 날짜를 지정 포맷으로 생성
- `script`: 제한된 스크립트 값 생성 (`today`, `currentDate`, `currentYear`, `currentMonth`, `currentDay`, `date("yyyy-MM-dd")`)
- `llm`: 사용자가 선택/입력한 다른 변수 값을 `{{변수명}}`으로 참조해 지시문을 만들고, LLM이 값을 생성
