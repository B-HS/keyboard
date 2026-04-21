# 나만의 작고 소중한 키보드 만들기 프로젝트

49키 핸드와이어드 USB-C 키보드. 3D 프린팅 샌드위치 케이스 + 사용자 제공 plate.

**재질**: PA12 SLS Nylon (MJF PA12 동일 가능) — self-tap M3 직접 체결

## 스펙 요약

- 레이아웃: **49키** (KLE 기반, `docs/models/49.json`)
  - Row 0: 14×1u
  - Row 1: 1.5+11×1u+1.5u
  - Row 2: 2+10×1u+2u
  - Row 3: 1u+2×1.25u+2×2.75u (split spacebar)+5×1u
- 컨트롤러: **LOLIN S3 Mini** (ESP32-S3FH4R2)
- 펌웨어: **RMK** (Rust) — Vial 네이티브
- 연결: **USB-C 유선 전용**
- 틸트: **8°** (앞 ~20.7mm / 뒤 ~32.8mm)
- 케이스 외곽: 275.65 × 86.10 mm (plate STL 치수에 자동 스케일)

## 구조 (샌드위치)

```
  [Keycaps]
 ┌────────────────┐
 │  Top Case      │ ← 상판 (뚜껑, 옆벽 4 체결점)
 │ ┌────────────┐ │
 │ │ Switches   │ │
 │ ├────Plate───┤ │ ← 사용자 STL, 기둥 위에 얹힘 (8°)
 │ ┌┴──────────┴┐ │
 │ │ LOLIN + 배선 │ │ ← 4 수직 기둥 Ø6 (하판 floor에서 솟음)
 │ └──────────── │
 └────────────────┘
      [Foot pads]
```

- **하판**: floor (2.4mm) + 4 pillars (Ø6, 8° tilted pocket Ø2.5 × 4mm 셀프탭용)
- **상판**: 뚜껑, 옆벽 Y=2/4·3/4에 4개 self-tap 체결점 (Ø2.5 × 4mm)
- **체결**: M3×6 button head × **8개** (plate 4 + 상·하판 4) — self-tap

Wall 두께 최소치: pocket drift 포함 ≥ **1.19mm** (JLC 최소 0.8mm 초과)

## Export 산출물

| 파일 | 용도 |
|---|---|
| `1_case-top.stl` | 상판 (뚜껑) |
| `2_case-bottom.stl` | 하판 (floor + 4 기둥) |

## 참고

- 레이아웃 편집: https://www.keyboard-layout-editor.com/
- KLE-NG (plate 생성): https://editor.keyboard-tools.xyz/
- RMK 펌웨어: https://rmk.rs/

## 문서

- [`context.md`](context.md) — 설계 결정·파라미터·이력 전체 맥락
- [`DEBUG.md`](DEBUG.md) — 주문/디버깅 세션 기록
- [`docs/specs/parts.md`](docs/specs/parts.md) — 부품 체크리스트

## CAD 뷰어 실행

JSCAD + React + Vite 기반 파라메트릭 케이스 모델러.

```bash
bun install
bun run dev        # http://localhost:5173
```

- 사이드바 체크박스로 부품 on/off
- 사용자 plate STL (`docs/models/plate/keyboard-plate.stl`) 로드되어 8° 틸트로 렌더링
- `src/models/*.ts` 수정 시 Vite HMR로 즉시 반영

### 카메라 (Blender / KiCad 스타일)

| 조작 | 동작 |
|---|---|
| **LMB / MMB 드래그** | 회전 (orbit) |
| **RMB 드래그** | 이동 (pan) |
| **Shift + 드래그** | 이동 (pan) |
| **휠** | 커서 위치 기준 줌 |
| **F 키** | 모든 솔리드에 맞춰 프레이밍 리셋 |

## 명령어

```bash
bun run dev               # 개발 서버
bun run build             # 프로덕션 빌드
bun run export            # STL 생성 (+ admesh 자동 repair)
bun scripts/verify.ts     # 치수 검증 + plate STL alignment 확인
```

### 외부 의존성

```bash
brew install admesh       # STL 메쉬 repair
```

`bun run export` 실행 시 각 STL 생성 후 자동 admesh 적용:
`admesh -n -t 0.005 -i 5 -f -d -v -b output input`
- `-n`: nearby facet 연결 (5μm 이내)
- `-i 5`: 5 iterations
- `-f`: fill holes
- `-d -v`: fix normal directions & values

CSG boolean 결과의 non-manifold edges / planar holes를 자동 수리.

## JLC3DP 주문 옵션

- **Material**: MJF PA12 또는 SLS PA12 Nylon (3201PA-F)
- Surface finish: 없음 (자연 마감)
- Insert 없음 (self-tap)
- Tolerance: ±0.2mm

## 구조

```
.
├── src/
│   ├── models/
│   │   ├── layout.ts         # 49.json → 키 위치
│   │   ├── plate.ts          # buildPlate + loadPlateGeom (STL 로드)
│   │   ├── case.ts           # 상/하판 빌드
│   │   ├── lolin.ts          # LOLIN S3 Mini 시각화
│   │   ├── switch.ts         # Cherry MX STL 로드
│   │   ├── keycap.ts         # 키캡 STL (폭×R 매핑)
│   │   ├── stabilizer.ts     # 스태빌 STL 로드
│   │   ├── accessories.ts    # 고무발
│   │   ├── reference.ts      # 49-final.jscad 파서
│   │   ├── defaults.ts       # plate padding override
│   │   ├── build-params.ts
│   │   ├── build-solids.ts   # 조립
│   │   └── index.ts
│   ├── components/
│   │   ├── viewer.tsx        # regl-renderer + Blender 카메라
│   │   └── controls.tsx
│   ├── app.tsx
│   ├── main.tsx
│   └── styles.css
├── scripts/
│   ├── export.ts             # STL 생성 + admesh repair
│   ├── verify.ts             # 치수 검증
│   └── load-defaults.ts
├── docs/
│   ├── models/
│   │   ├── 49.json           # KLE 레이아웃 (truth source)
│   │   ├── 49-final.jscad    # reference fallback
│   │   ├── plate/
│   │   │   ├── keyboard-plate.stl   # ⭐ 사용자 plate
│   │   │   └── plate.jscad
│   │   ├── switch/
│   │   ├── keycap/STL/
│   │   └── stabilizer/
│   ├── specs/                # 부품 명세
│   └── export/               # JLC 주문용 STL
├── context.md                # 프로젝트 전체 맥락
└── DEBUG.md                  # 디버깅 세션 기록
```

## 조립 순서

1. PA12 케이스 수령 → floor/기둥 확인
2. 하판 기둥 4개 위에 plate 얹기 → **M3×6 × 4개** 위에서 self-tap 체결 (Ø2.5 pilot holes)
3. Plate에 Cherry MX 스위치 clip 장착
4. 스위치 핸드와이어 (UEW 0.6mm + 1N4148 × 49)
5. LOLIN S3 Mini 배선 + 양면폼으로 하판 고정
6. USB-C 테스트 → RMK 펌웨어 플래시
7. 상판을 위에서 씌움
8. 하판 아래에서 **M3×6 × 4개** → 상판 옆벽 self-tap 체결
9. 키캡 장착 ✓
