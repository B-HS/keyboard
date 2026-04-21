# 49 Keyboard 프로젝트 Context

대화 재개용 요약. 이 파일 읽으면 전체 맥락 파악 가능.

**상태: JLC3DP 주문 (PA12 SLS Nylon, self-tap)**

---

## 🎯 프로젝트 개요

**목표**: 49키 커스텀 키보드 자체 제작 (핸드와이어드, USB-C 유선, 3D 프린팅 케이스)

**핵심 스펙**:
- 레이아웃: 49키 (Row 0: 14×1u / Row 1: 1.5+11×1u+1.5u / Row 2: 2+10×1u+2u / Row 3: 1u+2×1.25u+2×2.75u(split spacebar)+5×1u)
- 컨트롤러: **LOLIN S3 Mini** (ESP32-S3FH4R2)
- 펌웨어: **RMK (Rust)** — Vial 네이티브
- 연결: **USB-C 유선 전용**
- 플레이트: **사용자 제공 STL** (`docs/models/plate/keyboard-plate.stl`)
- 케이스: **3D 프린팅 상/하 분할 + 샌드위치 구조**, **PA12 SLS Nylon**
- 타이핑 각도: **8° 틸트**
- 체결: **M3×6 button head × 8개** (self-tap 직접 체결, insert 없음)

---

## 📂 프로젝트 구조

`/Users/gkn/keyboard/` (Git: github.com/B-HS/keyboard)

```
keyboard/
├── src/
│   ├── app.tsx                  # HMR accept + model re-build 트리거
│   ├── vite-env.d.ts
│   ├── components/
│   │   ├── viewer.tsx           # Blender/KiCad 스타일 카메라
│   │   └── controls.tsx         # 사이드바
│   └── models/
│       ├── layout.ts            # 49.json 파싱
│       ├── plate.ts             # buildPlate + loadPlateGeom (STL)
│       ├── case.ts              # 메인 케이스 빌더 (DEFAULT_CASE_PARAMS)
│       ├── lolin.ts             # LOLIN S3 Mini 시각화
│       ├── switch.ts            # Cherry MX STL 로드
│       ├── keycap.ts            # Cherry MX 키캡 STL 로드
│       ├── stabilizer.ts        # 스태빌 STL 로드
│       ├── accessories.ts       # 고무발 / 스태빌 geometry
│       ├── reference.ts         # 49-final.jscad 파서
│       ├── defaults.ts          # 플레이트 파라미터 override
│       ├── build-params.ts
│       ├── build-solids.ts      # 조립
│       └── index.ts             # public API (loadPlateGeom 포함)
├── scripts/
│   ├── export.ts                # STL export + admesh 자동 repair
│   ├── load-defaults.ts
│   └── verify.ts                # 치수 검증
├── docs/
│   ├── models/
│   │   ├── 49-final.jscad       # 레퍼런스 (fallback용)
│   │   ├── 49.json              # KLE 레이아웃 (truth source)
│   │   ├── plate/
│   │   │   ├── keyboard-plate.stl   # ⭐ 사용자 제공 plate (source of truth)
│   │   │   └── plate.jscad
│   │   ├── switch/cherry mx.*
│   │   ├── keycap/STL/*.stl
│   │   └── stabilizer/*.stl
│   └── export/                  # JLC 주문용 산출물
│       ├── 1_case-top.stl
│       └── 2_case-bottom.stl
├── vite.config.ts               # base: '/keyboard/'
├── tsconfig.json                # noEmit: true
├── context.md
├── DEBUG.md                     # 디버깅 세션 기록
└── README.md
```

---

## 🏗 샌드위치 구조

```
위
│   [Keycaps]           ← 키캡 (외부)
│┌─────────────────────┐
││  Top Case           │ ← 상판 (뚜껑 역할, 옆벽 self-tap 4)
││  ┌───────────────┐  │
││  │    Switches   │  │
││  ├───────────────┤  │
││  │     Plate     │  │ ← plate (사용자 STL, 기둥 위에 얹힘)
││  ┌─┴────────┐┌──┴┐  │
││  │          ││   │  │ ← 4 기둥 Ø6 (하판에서 솟음, 상단 tilted)
││  │  LOLIN   ││   │  │
││  └──────────┘└───┘  │
│└──╧═══════════════╧──┘ ← 하판 (floor + pillars + 옆벽 관통)
아래
```

**핵심 특징**:
- Plate은 하판의 4개 수직 기둥 위에 얹힘 (tilted pocket으로 8° 정렬)
- Top case는 뚜껑처럼 씌워져 옆벽 2/4·3/4 Y 위치에서 하판과 체결
- 조립 순서: 하판 → plate 장착 → 스위치/핸드와이어 → 상판 씌움

---

## 🔧 확정된 설계 결정 (최종)

1. **재질**: PA12 SLS Nylon (MJF PA12도 동일 가능) — self-tap 직접
2. **무선·배터리 완전 제거** → USB-C 유선 전용
3. **펌웨어 RMK** (Rust): Vial 네이티브
4. **MCU ESP32-S3** (LOLIN S3 Mini, 양면폼으로 하판 고정)
5. **케이스 샌드위치**: 하판(floor+기둥) + plate + 상판(뚜껑)
6. **Plate은 사용자 STL**: `keyboard-plate.stl`, 케이스가 자동으로 bounds에 맞춰 스케일
7. **8° 틸트**, pivot Y=plateBounds.minY, plateFrontBottomZ=10
8. **벽 두께 2mm**, case margin 2mm 사방
9. **Upper wall inset**: X=2, Y=2 (키캡-벽 gap: 좌우 1mm, 앞 2.48mm, 뒤 0.48mm)
10. **옆벽 체결**: Y=2/4, 3/4 위치, 좌우 총 4개 (6×6×6mm 보스, Ø2.5 self-tap pilot × 4mm)
11. **기둥**: 4개 Ø6 수직 원기둥, plate 나사홀 위치, top만 tilted, 8° tilted pocket Ø2.5 × 4mm
12. **Plate mount head clearance hole**: 상판 upper wall에 Ø5.2 × 3mm, tilted 정렬
13. **USB-C cutout 단순화**: 단일 관통홀 (Ø12.2×5.5 × depth 4mm)
14. **나사 통일**: M3×6 button head (head Ø5×H2, thread Ø3×L6) × 8개 — self-tap

---

## 📐 현재 케이스 파라미터 (case.ts DEFAULT_CASE_PARAMS)

```ts
caseMarginFront/Back/Left/Right: 2
plateTiltDeg: 8
plateFrontBottomZ: 10

plateRecessWall: 7.5
wallThickness: 2
upperWallInsetX: 2
upperWallInsetY: 2
bottomThickness: 2.4

// Side fastener (옆벽 체결, 4개)
sideFastenerSize: 6          // 6×6mm 보스
sideFastenerHeight: 6.0
sideFastenerInsertRadius: 1.25   // Ø2.5 self-tap pilot
sideFastenerInsertDepth: 4.0
sideFastenerThroughRadius: 1.7   // Ø3.4 하판 관통
sideFastenerHeadRadius: 2.6      // Ø5.2 counterbore
sideFastenerHeadDepth: 2.0       // M3 button head 높이
sideFastenerYRatios: [0.5, 0.75]

// Plate mount pillar (하판 기둥, 4개)
plateMountPostRadius: 3.0        // Ø6 기둥 (wall 여유 1.19mm)
plateMountInsertRadius: 1.25     // Ø2.5 self-tap
plateMountInsertDepth: 4.0
plateMountHeadRadius: 2.6
plateMountHeadHeight: 2.5

// USB-C
usbCutoutWidth: 12.2, usbCutoutHeight: 5.5
usbCutoutCenterX: 9.7, usbCutoutCenterZ: 7.0

caseCornerRadius: 2
```

### 최종 외곽 치수 (사용자 plate STL 기준)

- **Plate**: 271.65 × 82.10 × 1.5mm (사용자 STL)
- **Case outer**: 275.65 × 86.10mm
- **앞 높이**: ~20.7mm / **뒤 높이**: ~32.8mm

### Wall 두께 안전성 (JLC 최소 0.8mm 대비)

- 기둥 Ø6 × pocket Ø2.5 × tilt 8° × depth 4mm
- Pocket drift = 4 × sin(8°) = 0.557mm
- Wall 최소 = (6-2.5)/2 - 0.557 = **1.19mm** ✓ (JLC 최소 0.8mm 초과)

### 주요 위치

- **Plate 나사홀 (= 기둥 XY)**: (−8.999, 8.476), (256.649, 8.476), (−8.999, −67.625), (256.649, −67.625)
- **옆벽 체결**: X=−9/256.65, Y=−29.575 (2/4) / Y=−6.625 (3/4)
- **USB-C**: X=9.7, Z=7 (뒷벽)

---

## 🔨 케이스 빌드 순서 (case.ts)

### buildCaseTop (상판)
1. `outerShell` (사다리꼴 polygon extrude + R2 라운딩)
2. Z slicer로 Z ≥ bottomThickness 부분만
3. `steppedInnerCavity` subtract (plate top plane 기준 stepped)
4. `sideFastenerBosses` union (4개 옆벽 보스)
5. Subtract: `usbCutout`, `sideFastenerInsertHoles`, `plateMountHeadClearance`
6. 중간 `retessellate` 다중 호출

### buildCaseBottom (하판)
1. `floorSlab` (단순 roundedRectangle extrude, Z=0~2.4) — mesh 깔끔
2. `plateMountPillars` union (4개 수직 원기둥 Ø6, 상단 tilted plane clip, 0.5mm 관통)
3. Subtract: `plateMountInsertPockets` (tilted), `sideFastenerThroughs` (counterbore + through hole)
4. 최종 Z≥0 slicer clip (관통한 0.5mm 제거)
5. 중간 `retessellate` 다중 호출

### Plate 렌더링
- `loadPlateGeom()` — STL deserialize
- `plateBoundsFromGeom()` — bounds 자동 추출
- `applyPlateTransform()` — 8° tilt 적용

---

## 🧩 부품 (뷰어 토글)

| 부품 | 기본 | 비고 |
|------|------|------|
| Case Top | ON | |
| Case Bottom | ON | |
| Plate | ON | STL 로드 |
| Switches | ON | Cherry MX STL |
| LOLIN S3 Mini | ON | 양면폼 고정 가정 |
| Stabilizers | ON | STL |
| Keycaps | ON | 폭×R 매핑 |
| Foot Pads | ON | Ø6×2 × 4개, 코너 inset 5 |
| Phone | OFF | 크기 비교용 |
| WOBKEY Zen 65 | OFF | 크기 비교용 |

---

## 📦 Export (docs/export/)

```bash
bun run export
```

생성 파일:

| 파일 | 용도 |
|---|---|
| `1_case-top.stl` | 상판 |
| `2_case-bottom.stl` | 하판 (floor + 4 기둥) |

각 STL 생성 후 자동 `admesh -n -t 0.005 -i 5 -f -d -v` 적용.

---

## 🛒 부품 / 주문 상태

### ✅ JLC3DP 주문 (PA12)
- `1_case-top.stl`
- `2_case-bottom.stl`
- 재료: MJF PA12 또는 SLS PA12 Nylon
- Surface finish: 없음
- Insert 없음 (self-tap)

### ✅ 보유 부품
- LOLIN S3 Mini
- Cherry MX × 49, 키캡 STL
- MX Plate-mount 스태빌 (2u × 2 + 2.75u × 2)
- 1N4148 × 300, UEW 0.6mm × 10m, 만능보드 70×90
- M3×6 button head × 44 pack
- 고무발 Ø6×2
- HAKKO FX-600 + RS63 + 플럭스펜 + 캡톤 + 폼테이프
- 양면폼 테이프 (LOLIN 고정용)

### ❌ 별도 주문 필요
- **Plate 별도 주문** (keyboard-plate.stl)
- **Krytox 205g0** (스태빌 튜닝, 선택)

---

## 🔩 조립 순서

1. PA12 케이스 수령 → floor/기둥 확인
2. 하판 기둥 4개 위에 plate 얹기
3. M3×6 × 4개 위에서 plate 나사홀 → pillar pocket에 self-tap 체결
4. Plate에 Cherry MX 스위치 clip 장착
5. 스위치 핸드와이어 (UEW + 다이오드 + LOLIN S3 Mini)
6. LOLIN을 하판에 양면폼으로 고정
7. USB-C 연결 테스트 → RMK 펌웨어 플래시
8. 상판을 위에서 씌움 (기둥 피하면서)
9. M3×6 × 4개 하판 아래에서 → 상판 옆벽 self-tap 체결
10. 키캡 장착

---

## 🎨 개발 / 뷰어

```bash
bun run dev        # http://localhost:5173
bun run export     # STL + admesh repair 자동 실행
bun scripts/verify.ts   # 치수 검증 + plate STL alignment 확인
bun run build      # 프로덕션
```

### 외부 도구 의존성

- **admesh** (brew install admesh) — STL 메쉬 자동 repair
  - `bun run export`에서 각 STL 생성 후 자동 호출
  - 옵션: `-n -t 0.005 -i 5 -f -d -v -b output input`
    - `-n`: nearby facet 연결
    - `-t 0.005 -i 5`: 5μm 톨러런스, 5회 iteration
    - `-f`: hole fill
    - `-d -v`: normal direction / value 수정

**카메라 조작 (Blender/KiCad 스타일)**:
- LMB/MMB 드래그: 회전
- RMB or Shift+드래그: 이동
- 휠: 커서 위치 기준 줌
- F 키: 프레이밍 리셋

---

## 🌐 GitHub Pages 배포

- URL: **https://b-hs.github.io/keyboard/**

---

## 🔧 툴체인 버전

- **Vite 8.0.9**
- **React 19.2.5**
- **TypeScript 6.0.3**
- **Bun 1.3.0**

---

## ⏳ 남은 작업

- [ ] JLC3DP PA12 주문 + 배송 대기
- [ ] Plate 별도 주문
- [ ] RMK `keyboard.toml` 작성
- [ ] 핸드와이어 조립 + 테스트
- [ ] GitHub Pages 배포 확인

---

## 🐛 주요 수정 이력 (최신 순)

### SLA 포기 및 PA12 확정
- **SLA variant 전부 제거**: SLA_CASE_PARAMS, 뷰어 토글, insert-spec, @resvg/resvg-js 의존성 모두 제거
- **Tilted pocket 때문에 SLA의 기둥 wall이 최소 0.23mm로 너무 얇은 문제** → PA12는 self-tap Ø2.5 pilot이라 drift 0.56mm만 있어 훨씬 유리
- **PA12 기둥 Ø5 → Ø6** 승격: wall 0.69mm → 1.19mm (JLC 최소 0.8mm 초과)

### 주문 후 JLC 에러 대응
- **admesh 자동 repair 통합** (`bun run export` 내부) — "Bad edges / Near bad edges / Planar holes" 대응
- **Pillar floor 아래로 0.5mm 관통 + 최종 Z=0 clip** — coincident face 제거
- **중간 retessellate 다중 호출** (union/subtract 사이) — CSG 결과 메쉬 정리
- **Cylinder segments 48 → 32** — face 폭 0.39 → 0.59mm

### 구조 재설계
- **무선 관련 전면 제거**: 배터리 케이스·커버·자석·슬라이드 스위치·배터리·만능보드
- **샌드위치 구조 재설계**: plate를 하판 기둥에 직결, 상판은 뚜껑, 옆벽 2/4·3/4 체결 4개
- **플레이트 → STL 로드 방식**: 코드 generate 대신 사용자 파일 사용, 자동 bounds 추출
- **Case auto-scale to plate**: plate STL만 바꾸면 케이스 자동 맞춤

### 뷰어/카메라
- **Blender/KiCad 스타일 카메라**: LMB/MMB orbit, RMB pan, cursor zoom, F key framing

### 체결 규격 통일
- **M3×6 button head × 8개**로 완전 통일 (plate 4 + side 4)
- Self-tap: Ø2.5 pilot × 4mm in PA12

---

## 🔗 외부 참조

- LOLIN S3 Mini: https://www.wemos.cc/en/latest/s3/s3_mini.html
- RMK: https://rmk.rs/ / https://github.com/HaoboGu/rmk
- Vial: https://vial.rocks/
- JLC3DP: https://jlc3dp.com (MJF PA12 또는 SLS PA12 Nylon 3201PA-F 선택)

---

## 🎬 새 대화에서 시작

1. 이 파일 읽어 맥락 파악
2. `src/models/case.ts` 현재 상태 확인 (`DEFAULT_CASE_PARAMS`)
3. `bun run dev` (사용자 실행)
4. `bun run export` — STL + admesh repair 재생성
5. `bun scripts/verify.ts` — plate STL alignment 확인
6. JLC3DP PA12 배송 완료시 조립 시작
