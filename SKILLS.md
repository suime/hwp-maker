# SKILLS.md

이 문서는 hwp-maker에서 LLM이 따라야 하는 작업 기술과 `hwp-actions` 프로토콜을 정의합니다.

## rhwp Editor Skill

AI는 rhwp 에디터의 현재 문서를 읽고, 사용자의 요청이 문서 작성/수정/삭제/필드 채우기라면 반드시 `hwp-actions`를 사용해야 합니다.

일반 채팅 답변만으로는 에디터 내용이 바뀌지 않습니다. 문서를 바꾸는 요청에 대해 설명만 하고 액션 블록을 생략하면 안 됩니다.

## Action Block Format

권장 형식:

````markdown
요청하신 내용을 문서에 반영하겠습니다.

```hwp-maker-actions
{
  "actions": [
    {
      "type": "insert_text",
      "text": "문서에 추가할 내용"
    }
  ]
}
```
````

허용되는 블록 이름:

- `hwp-maker-actions`
- `rhwp-actions`

규칙:

- 액션 블록은 JSON이어야 합니다.
- 최상위 값은 `{ "actions": [...] }` 객체 또는 액션 배열 `[...]`입니다.
- 여러 액션은 배열 순서대로 실행됩니다.
- 지원하지 않는 액션이나 필수 값이 빠진 액션은 무시될 수 있습니다.
- 액션 블록이 없으면 AI 답변은 채팅에만 표시되고 에디터에는 반영되지 않습니다.

## Supported Actions

### insert_text

현재 커서 위치 또는 지정한 위치에 텍스트를 삽입합니다.

```json
{
  "type": "insert_text",
  "text": "삽입할 텍스트"
}
```

선택 위치:

```json
{
  "type": "insert_text",
  "text": "삽입할 텍스트",
  "position": {
    "sectionIndex": 0,
    "paragraphIndex": 0,
    "charOffset": 0
  }
}
```

### replace_all

문서 전체에서 특정 문자열을 찾아 모두 교체합니다.

```json
{
  "type": "replace_all",
  "query": "찾을 문자열",
  "text": "바꿀 문자열"
}
```

삭제를 `replace_all`로 표현할 때는 `text`를 빈 문자열로 명시합니다.

```json
{
  "type": "replace_all",
  "query": "삭제할 문자열",
  "text": ""
}
```

주의:

- `replace_all`에서 `text`가 생략되면 호환성 차원에서 삭제 의도로 보정됩니다.
- 줄바꿈, 공백, 들여쓰기까지 정확히 일치해야 교체됩니다.
- 긴 문단을 삭제할 때는 문서에서 읽힌 원문과 줄바꿈이 정확히 같은지 확인해야 합니다.

### delete_text

문서 전체에서 특정 문자열을 찾아 삭제합니다.

```json
{
  "type": "delete_text",
  "query": "삭제할 문자열"
}
```

사용자가 특정 문장, 제목, 단락, 섹션, 요약, 목차, 문구를 "지워줘", "삭제해줘", "빼줘", "제거해줘"라고 요청하면 이 액션을 우선 사용합니다.

주의:

- 내부적으로는 `replace_all` + `text: ""`와 동일하게 처리됩니다.
- `query`에는 삭제 대상의 요약이 아니라 문서에서 실제로 읽힌 원문을 그대로 넣어야 합니다.

### fill_field

문서의 단일 필드 값을 채웁니다.

```json
{
  "type": "fill_field",
  "name": "필드명",
  "value": "필드에 입력할 값"
}
```

### fill_fields

문서의 여러 필드 값을 한 번에 채웁니다.

```json
{
  "type": "fill_fields",
  "values": {
    "제목": "보고서 제목",
    "작성자": "홍길동",
    "작성일": "2026-04-30"
  }
}
```

## Deletion Examples

권장 삭제 액션:

```hwp-maker-actions
{
  "actions": [
    {
      "type": "delete_text",
      "query": "【3줄 요약】\n- 첫 번째 요약\n- 두 번째 요약\n- 세 번째 요약"
    }
  ]
}
```

`replace_all`로 표현한 삭제:

```hwp-maker-actions
{
  "actions": [
    {
      "type": "replace_all",
      "query": "【3줄 요약】\n- 첫 번째 요약\n- 두 번째 요약\n- 세 번째 요약",
      "text": ""
    }
  ]
}
```

## Long Text Deletion Workflow

긴 블록을 삭제할 때는 아래 순서를 따릅니다.

1. 현재 문서 내용을 먼저 읽습니다.
2. 삭제할 블록의 정확한 원문을 확인합니다.
3. `delete_text`의 `query`에 원문 전체를 넣습니다.
4. 원문 일치가 어려우면 더 짧고 고유한 문장 단위로 나누어 여러 액션을 사용합니다.

예시:

```hwp-maker-actions
{
  "actions": [
    {
      "type": "delete_text",
      "query": "문서에서 실제로 읽힌 삭제 대상 전체 문자열"
    }
  ]
}
```

## Writing Example

```hwp-maker-actions
{
  "actions": [
    {
      "type": "insert_text",
      "text": "제목: 안전관리 점검 결과\n\n1. 점검 개요\n혹한기 현장 근로자 안전관리 실태를 점검했다.\n\n2. 주요 확인 사항\n- 옥외작업 안전수칙 준수 여부\n- 작업중지권 보장 여부\n\n3. 향후 계획\n선제적 안전관리 체계를 강화한다."
    }
  ]
}
```

## Implementation References

- 액션 파싱: `lib/ai/rhwpCommands.ts`
- 액션 실행 래퍼: `lib/rhwp/loader.ts`
- 에디터 인스턴스 연결: `components/editor/PreviewPanel.tsx`
- rhwp studio postMessage 처리: `public/rhwp-studio/assets/index-Dn2On7I-.js`
