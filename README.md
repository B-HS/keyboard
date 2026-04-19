# 나만의 작고 소중한 키보드 만들기 프로젝트

49키 핸드와이어드 + 무선(BLE) + USB-C 키보드 빌드.

## 진행 계획

- 먼저 keypad로 pcb + plate + case 만들어보기
- 잘 되면 MCU랑 다른것들 제대로 달아서 14u짜리 만들어보기

## 참고

- https://www.keyboard-layout-editor.com/
- https://editor.keyboard-tools.xyz/

## 문서

- [`docs/specs/parts.md`](docs/specs/parts.md) — 부품 체크리스트
- [`docs/specs/parts_specification.md`](docs/specs/parts_specification.md) — 부품 치수·사양 명세

## CAD 뷰어 실행

JSCAD + React + Vite 기반 파라메트릭 케이스/플레이트 모델러가 루트 프로젝트.

```bash
bun install
bun run dev
```

브라우저에서 http://localhost:5173 열면 실시간 렌더러.
`src/models/*.ts` 수정 시 Vite HMR로 즉시 반영.

## 구조

```
.
├── src/
│   ├── models/
│   │   ├── layout.ts       # 49.json → 키 위치 계산
│   │   ├── plate.ts        # 스위치 플레이트 지오메트리
│   │   ├── reference.ts    # jscad 파서 + 파라미터 파생
│   │   ├── defaults.ts     # Vite ?raw 로더
│   │   ├── build-params.ts # BuildParams 타입
│   │   ├── build-solids.ts # 조립 + 색상
│   │   └── index.ts        # re-exports
│   ├── components/
│   │   ├── viewer.tsx      # @jscad/regl-renderer 래핑
│   │   └── controls.tsx
│   ├── app.tsx
│   ├── main.tsx
│   └── styles.css
├── scripts/
│   ├── export.ts           # CLI STL export
│   ├── verify.ts           # 치수 검증 스크립트
│   └── load-defaults.ts    # CLI 로더
├── docs/
│   ├── models/             # jscad 원본 (49-final.jscad)
│   ├── specs/              # 부품 체크리스트/명세
│   └── keyboard-plate.*    # 기존 플레이트 산출물
├── 49/
│   └── 49.json             # KLE 레이아웃
└── keypad/                 # 이전 실험 (keypad 빌드)
```

## Export

- 브라우저: 사이드바의 `Download STL`
- CLI: `bun run export:stl` → `docs/` 에 출력

## 조작

- 드래그: 회전
- Shift+드래그 또는 우클릭 드래그: 이동
- 휠: 줌
