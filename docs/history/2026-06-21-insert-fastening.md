# 2026-06-21 — 보강판↔PCB 열간압입 인서트 체결 확정

> ⚠️ **폐기된 설계 이력**: 이 인서트 압입안(둘레벽 + M3×3×4, ring 홀 Ø3.8)은 이후 **관통 볼트 클램프(인서트 0)** 로 전면 대체됐다. `PLATE_WALL_THICKNESS`·`INSERT_*` 상수와 `buildPlateRing2D`는 코드에서 제거됨. 현재 설계는 `docs/PROCESS.md` §1 + `case-construction.md` §12. 아래는 당시 결정 기록(역사적 정확성을 위해 원문 유지).

## 배경

사용자가 보유한 220pcs 황동 열간압입 인서트 키트(M2/M2.5/M3/M4/M5/M6, 표기 `M나사 × 길이 × 외경`)를 현재 설계에 활용 가능한지 검토. PROCESS §6의 미결 "보강판 벽 인서트 정확 치수 확정"을 종결.

## 분석 (코드 기준 계산)

보강판 둘레벽 = 아크릴 ring, 폭 `PLATE_WALL_THICKNESS` 6mm · 높이 `PLATE_BOTTOM_TO_PCB_TOP` 3.5mm. PCB를 아래에서 M3 나사로 ring에 직결(핫스왑이라 스위치는 구조재 아님) → ring에 인서트 압입 필요.

- **깊이**: M3×3×4(길이 3) ≤ 벽 3.5 → 매립 OK(여유 0.5, field 1.5가 덮어 블라인드). M3×4×4(길이 4)는 ✗.
- **수량**: 좌 8 + 우 8 = 16개 < 보유 25개. OK.
- **잔살(치명 결함 발견)**: 기존 마운트홀 inset = (LATERAL_CLEARANCE+CASE_MARGIN)/2 = 5.125 → 홀이 ring 안쪽으로 쏠려 OD4 인서트(압입경 Ø3.8) 기준 **안쪽 살 0.22mm**(아크릴 압입 시 크랙). 해소: inset = CASE_MARGIN − PLATE_WALL_THICKNESS/2 = **6.0**(둘레벽 폭 정중앙) → 안쪽/바깥 살 각 **1.1mm**.

## 변경 (코드)

| 파일                       | 변경                                                                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `src/config/dimensions.js` | `PLATE_WALL_THICKNESS=6`(plate.js 로컬 WALL_THICKNESS 승격), `INSERT_OD=4`, `INSERT_LENGTH=3`, `INSERT_HOLE_DIAMETER=3.8` 추가       |
| `src/config/layout.js`     | `computeMountHoles` inset = `CASE_MARGIN − PLATE_WALL_THICKNESS/2` (5.125→6.0, 둘레벽 정중앙)                                        |
| `src/parts/shapes.js`      | `mountHoleCuts(holes, diameter = M3_HOLE_DIAMETER)` — 직경 인자 추가                                                                 |
| `src/parts/plate.js`       | 로컬 WALL_THICKNESS 제거→SSOT import. `buildPlateRing2D`만 홀 직경 `INSERT_HOLE_DIAMETER`(Ø3.8) 사용. field/frame/bottom은 Ø3.2 유지 |

마운트홀은 전 레이어가 `side.mountHoles` 공유 → 위치 이동이 frame·field·ring·bottom·PCB·스페이서에 동시 반영(정렬 유지). 인서트 압입경 분리는 ring 레이어에만 적용.

## 검증

- 살: 안쪽/바깥 각 1.10mm(좌·우), 깊이 여유 0.5mm.
- `bun run smoke` ok (좌 30키·우 35키, holes 8, plate Z −3.5~1.5).
- `bun run export` → DXF 8장(`plate-ring`에 Ø3.8 압입홀 반영).
- `bun run build` 통과.

## 잔여 주의

- 아크릴 열압입 크랙 위험 → 예열·저속 압입, 압입경(Ø3.8)은 보유 인서트 데이터시트/실측으로 보정.
- 프레임↔보강판 너트 나사와 ring 인서트가 동축이므로, 상단 너트나사가 ring 인서트 영역까지 내려오지 않도록 나사 길이 관리(프레임 나사는 field에서 멈춤).
