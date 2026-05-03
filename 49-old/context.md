# 49 Keyboard 프로젝트 Context

대화 재개용 요약. 이 파일 읽으면 전체 맥락 파악 가능.

**상태: JLC3DP 주문 완료 (SLA Resin + Threaded Insert)**

---

## 🎯 프로젝트 개요

**목표**: 49키 커스텀 키보드 자체 제작 (핸드와이어드, USB-C 유선, 3D 프린팅 케이스)

**핵심 스펙**:
- 레이아웃: 49키 (Row 0: 14×1u / Row 1: 1.5+11×1u+1.5u / Row 2: 2+10×1u+2u / Row 3: 1u+2×1.25u+2×2.75u(split spacebar)+5×1u)
- 컨트롤러: **LOLIN S3 Mini** (ESP32-S3FH4R2)
- 펌웨어: **RMK (Rust)** — Vial 네이티브
- 연결: **USB-C 유선 전용** (무선·배터리 완전 제거)
- 플레이트: **사용자 제공 STL** (`docs/models/plate/keyboard-plate.stl`)
- 케이스: **3D 프린팅 상/하 분할 + 샌드위치 구조**
- 타이핑 각도: **8° 틸트**
- 체결: **M3×6 button head × 8개** (모두 통일)

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
│   │   └── controls.tsx         # 사이드바 + SLA toggle
│   └── models/
│       ├── layout.ts            # 49.json 파싱
│       ├── plate.ts             # buildPlate + loadPlateGeom (STL)
│       ├── case.ts              # 메인 케이스 빌더 (DEFAULT/SLA params)
│       ├── lolin.ts             # LOLIN S3 Mini 시각화
│       ├── switch.ts            # Cherry MX STL 로드
│       ├── keycap.ts            # Cherry MX 키캡 STL 로드
│       ├── stabilizer.ts        # 스태빌 STL 로드
│       ├── accessories.ts       # 고무발 / 스태빌 geometry
│       ├── reference.ts         # 49-final.jscad 파서
│       ├── defaults.ts          # 플레이트 파라미터 override
│       ├── build-params.ts
│       ├── build-solids.ts      # 조립 + SLA/default 선택
│       └── index.ts             # public API (loadPlateGeom 포함)
├── scripts/
│   ├── export.ts                # STL export + insert-spec 생성
│   ├── generate-spec.ts         # SVG/PNG spec 생성 (resvg-js)
│   ├── load-defaults.ts
│   └── verify.ts                # 치수 검증
├── docs/
│   ├── models/
│   │   ├── 49-final.jscad       # 레퍼런스 (fallback용)
│   │   ├── 49.json              # KLE 레이아웃 (truth source)
│   │   ├── plate/
│   │   │   ├── keyboard-plate.stl   # ⭐ 사용자 제공 plate (source of truth)
│   │   │   └── plate.jscad          # KLE-NG 출처
│   │   ├── switch/cherry mx.*
│   │   ├── keycap/STL/*.stl
│   │   └── stabilizer/*.stl
│   └── export/                  # JLC 주문용 산출물
│       ├── 1_case-top.stl               # PA12 self-tap
│       ├── 2_case-bottom.stl            # PA12 self-tap
│       ├── 1_case-top_SLA.stl           # SLA insert ⭐
│       ├── 2_case-bottom_SLA.stl        # SLA insert ⭐
│       ├── insert-spec-case-top.svg/png
│       └── insert-spec-case-bottom.svg/png
├── .github/workflows/deploy.yml
├── vite.config.ts               # base: '/keyboard/'
├── tsconfig.json                # noEmit: true
└── context.md
```

---

## 🏗 샌드위치 구조 (현재 설계)

```
위
│   [Keycaps]           ← 키캡 (외부)
│┌─────────────────────┐
││  Top Case           │ ← 상판 (뚜껑 역할, 옆벽 체결 4 insert)
││  ┌───────────────┐  │
││  │    Switches   │  │
││  ├───────────────┤  │
││  │     Plate     │  │ ← plate (사용자 STL, 기둥 위에 얹힘)
││  ┌─┴────────┐┌──┴┐  │
││  │          ││   │  │ ← 4 기둥 (하판에서 솟음, 상단 tilted)
││  │  LOLIN   ││   │  │
││  └──────────┘└───┘  │
│└──╧═══════════════╧──┘ ← 하판 (floor + pillars + 옆벽 체결 관통)
아래
```

**핵심 특징**:
- Plate은 하판의 4개 수직 기둥 위에 얹힘 (tilted pocket으로 8° 정렬)
- Top case는 뚜껑처럼 씌워져 옆벽 2/4·3/4 Y 위치에서 하판과 체결
- 조립 순서: 하판 → plate 장착 → 스위치/핸드와이어 → 상판 씌움

---

## 🔧 확정된 설계 결정 (최종)

1. **무선·배터리 완전 제거** → USB-C 유선 전용
2. **펌웨어 RMK** (Rust): Vial 네이티브, USB-C only
3. **MCU ESP32-S3** (LOLIN S3 Mini, 양면폼으로 하판 고정)
4. **케이스 샌드위치**: 하판(floor+기둥) + plate + 상판(뚜껑)
5. **Plate은 사용자 STL**: `keyboard-plate.stl`, 케이스가 자동으로 bounds에 맞춰 스케일
6. **8° 틸트**, pivot Y=plateBounds.minY, plateFrontBottomZ=10
7. **벽 두께 2mm**, case margin 2mm 사방
8. **Upper wall inset**: X=2, Y=2 (키캡-벽 gap: 좌우 1mm, 앞 2.48mm, 뒤 0.48mm)
9. **옆벽 체결**: Y=2/4, 3/4 위치, 좌우 총 4개 (6×6×6mm 보스)
10. **기둥**: 4개, plate 나사홀 위치, 수직 원기둥 (top만 tilted)
11. **Plate mount head clearance hole**: 상판 upper wall에 Ø5.2×3mm, tilted 정렬
12. **USB-C cutout 단순화**: 단일 관통홀 (Ø12.2×5.5 × depth 4mm, no taper)
13. **나사 통일**: M3×6 button head (head Ø5×H2, thread Ø3×L6) × 8개

---

## 📐 현재 케이스 파라미터 (case.ts)

### DEFAULT_CASE_PARAMS (PA12 SLS self-tap)

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
sideFastenerHeight: 6.0      // 보스 높이
sideFastenerInsertRadius: 1.25   // Ø2.5 self-tap pilot
sideFastenerInsertDepth: 4.0
sideFastenerThroughRadius: 1.7   // Ø3.4 하판 관통
sideFastenerHeadRadius: 2.6      // Ø5.2 counterbore
sideFastenerHeadDepth: 2.0       // M3 button head 높이
sideFastenerYRatios: [0.5, 0.75]

// Plate mount pillar (하판 기둥, 4개)
plateMountPostRadius: 2.5        // Ø5 기둥
plateMountInsertRadius: 1.25     // Ø2.5 self-tap
plateMountInsertDepth: 4.0
plateMountHeadRadius: 2.6        // 상판 head clearance
plateMountHeadHeight: 2.5

// USB-C
usbCutoutWidth: 12.2, usbCutoutHeight: 5.5
usbCutoutCenterX: 9.7, usbCutoutCenterZ: 7.0
usbCutoutCornerRadius: 1.5

caseCornerRadius: 2
```

### SLA_CASE_PARAMS (SLA Resin + brass insert) — **주문한 버전**

```ts
...DEFAULT_CASE_PARAMS,
plateMountPostRadius: 3.0        // Ø6 (insert 주변 1.2mm wall)
plateMountInsertRadius: 1.8      // Ø3.6 (M3*4*5 insert용)
plateMountInsertDepth: 7.0       // 5mm insert + 2mm 여유
sideFastenerInsertRadius: 1.8    // Ø3.6
sideFastenerInsertDepth: 7.0
sideFastenerHeight: 8.0          // 7mm pocket + 1mm cap
```

### 최종 외곽 치수 (사용자 plate STL 기준)

- **Plate**: 271.65 × 82.10 × 1.5mm (사용자 STL)
- **Case outer**: 275.65 × 86.10mm
- **앞 높이**: ~18.5mm / **뒤 높이**: ~30.6mm

### 주요 위치 (case 좌표)

- **Plate 나사홀 (= 기둥 XY)**: (−8.999, 8.476), (256.649, 8.476), (−8.999, −67.625), (256.649, −67.625)
- **옆벽 체결**: X=−9/256.65, Y=−29.575 (2/4) / Y=−7.05 (3/4)
- **USB-C**: X=9.7, Z=7 (뒷벽)

---

## 🔨 케이스 빌드 순서 (case.ts)

### buildCaseTop (상판)
1. `outerShell` (사다리꼴 polygon extrude + R2 라운딩)
2. Z slicer로 Z ≥ bottomThickness 부분만
3. `steppedInnerCavity` subtract (plate top plane 기준 stepped)
4. `sideFastenerBosses` union (4개 옆벽 보스)
5. Subtract: `usbCutout`, `sideFastenerInsertHoles`, `plateMountHeadClearance`
6. `retessellate`

### buildCaseBottom (하판)
1. `floorSlab` (단순 roundedRectangle extrude, Z=0~2.4) — mesh 깔끔
2. `plateMountPillars` union (4개 수직 원기둥, 상단은 tilted plane으로 clip)
3. Subtract: `plateMountInsertPockets` (tilted), `sideFastenerThroughs` (counterbore + through hole)
4. `retessellate`

### Plate 렌더링
- `loadPlateGeom()` (src/models/plate.ts) — STL deserialize
- `plateBoundsFromGeom()` — bounds 자동 추출
- `applyPlateTransform()` — 8° tilt 적용

**상/하 분리**: 별도 함수 (slice 방식 버림). 완전히 독립된 빌드.

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
| **SLA Variant** | **OFF** | 체크하면 SLA_CASE_PARAMS 사용 |

**제거된 부품** (무선 관련): Battery Cover, Magnets, Batteries, Battery Contacts, Perf Board, Slide Switch

---

## 📦 Export (docs/export/)

```bash
bun run export
```

생성 파일:

| 파일 | 용도 |
|---|---|
| `1_case-top.stl` | PA12 SLS self-tap (대안) |
| `2_case-bottom.stl` | PA12 SLS self-tap (대안) |
| **`1_case-top_SLA.stl`** | **SLA Resin + M3*4*5 insert ⭐** |
| **`2_case-bottom_SLA.stl`** | **SLA Resin + M3*4*5 insert ⭐** |
| `insert-spec-case-top.svg/png` | JLC 참조 도면 (부품별) |
| `insert-spec-case-bottom.svg/png` | JLC 참조 도면 (부품별) |

Insert spec 자동 생성: `scripts/generate-spec.ts` + `@resvg/resvg-js`.

---

## 🛒 부품 / 주문 상태

### ✅ JLC3DP 주문 완료
- **1_case-top_SLA.stl** (SLA Resin + Threaded Insert M3*4*5 × 4)
- **2_case-bottom_SLA.stl** (SLA Resin + Threaded Insert M3*4*5 × 4)
- **Insert 총 8개** 자동 설치되어 배송
- JLC preview 노란 경고는 있지만 붉은 오류(unprintable) 없음

### ✅ 보유 부품
- LOLIN S3 Mini
- Cherry MX × 49, 키캡 STL
- MX Plate-mount 스태빌 (2u × 2 + 2.75u × 2)
- 1N4148 × 300, UEW 0.6mm × 10m, 만능보드 70×90
- M3×6 button head × 44 pack
- 고무발 Ø6×2
- HAKKO FX-600 + RS63 + 플럭스펜 + 캡톤 + 폼테이프
- 양면폼 테이프 (LOLIN 고정용)

### ❌ 추가로 필요할 수 있음
- **Plate 별도 주문** (keyboard-plate.stl — 사용자 파일 그대로)
- **Krytox 205g0** (스태빌 튜닝, 선택)

---

## 🔩 조립 순서

1. SLA 케이스 수령 (insert 8개 기 설치됨)
2. Insert에 M3 나사 시험 삽입 → 헛돌거나 안 박히면 JLC에 컴플레인
3. 하판 기둥 4개 위에 plate 얹기
4. **M3×6 × 4개** 위에서 plate 나사홀 → pillar insert 체결 (tilted 축)
5. Plate에 Cherry MX 스위치 clip 장착
6. 스위치에 다이오드 + UEW 에나멜선 핸드와이어
7. LOLIN S3 Mini에 와이어 납땜, 하판에 양면폼으로 고정
8. USB-C 연결 테스트
9. 상판을 위에서 씌움 (기둥 피하면서)
10. **M3×6 × 4개** 하판 아래에서 → 옆벽 insert 체결
11. 키캡 장착

---

## 🎨 개발 / 뷰어

```bash
bun run dev        # http://localhost:5173
bun run export     # STL + insert-spec 자동 생성
bun scripts/verify.ts   # 치수 검증 + plate STL alignment 확인
bun run build      # 프로덕션
```

**카메라 조작 (Blender/KiCad 스타일)**:
- LMB/MMB 드래그: 회전 (orbit)
- RMB or Shift+드래그: 이동 (pan)
- 휠: 커서 위치 기준 줌
- F 키: 모든 솔리드에 맞춰 프레이밍

**HMR**: `import.meta.hot.accept('./models/...')` — 모델 파일 변경시 자동 재렌더

---

## 🌐 GitHub Pages 배포

- `vite.config.ts`: `base: '/keyboard/'` (build 시만)
- `.github/workflows/deploy.yml`: main push → 자동 배포
- URL: **https://b-hs.github.io/keyboard/**

---

## 🔧 툴체인 버전

- **Vite 8.0.9**
- **React 19.2.5**
- **TypeScript 6.0.3**
- **Bun 1.3.0**
- `@resvg/resvg-js 2.6.2` (SVG→PNG 렌더링)

---

## ⏳ 남은 작업

- [ ] JLC3DP 배송 대기
- [ ] Plate 별도 주문 (`keyboard-plate.stl`)
- [ ] 배송 후 insert 품질 체크
- [ ] RMK `keyboard.toml` 작성 (Row/Col 핀 매핑, Vial 키맵)
- [ ] 핸드와이어 조립 + 테스트
- [ ] GitHub Pages 배포 확인

---

## 🐛 주요 수정 이력 (최신 순)

### 주문 직전 최종 수정
- **floorSlab** 단순화: `outerShell` slice → `roundedRectangle` extrude (JLC zigzag unprintable 에러 해결)
- **Pillar 수직화**: tilted cylinder → vertical cylinder + tilted top clip (mesh 깔끔)
- **SLA pocket**: Ø4×5 → **Ø3.6×7mm** (JLC 실제 hole 요구사항 반영)
- **SLA pillar** Ø5→Ø6 (Ø3.6 insert 주변 wall 1.2mm 확보)
- **플레이트 나사머리 clearance** 상판에 추가 (Ø5.2×3mm, tilt 정렬)
- **upperWallInsetY** 3 → 2 (back 음수 gap → 양수로)
- **plateFrontBottomZ** 9.75 → 10 (stab clip 여유)

### 구조 재설계
- **무선 관련 전면 제거**: 배터리 케이스·커버·자석·슬라이드 스위치·배터리·만능보드
- **샌드위치 구조 재설계**: plate를 하판 기둥에 직결, 상판은 뚜껑, 옆벽 2/4·3/4 체결 4개
- **플레이트 → STL 로드 방식**: 코드 generate 대신 사용자 파일 사용, 자동 bounds 추출
- **Case auto-scale to plate**: plate STL만 바꾸면 케이스 자동 맞춤

### 뷰어/카메라
- **Blender/KiCad 스타일 카메라**: LMB/MMB orbit, RMB pan, cursor zoom, F key framing
- **SLA toggle**: 뷰어에서 PA12 / SLA 전환

### 체결 규격 통일
- **M3×6 button head × 8개**로 완전 통일 (plate 4 + side 4)
- PA12 self-tap: Ø2.5 pilot × 4mm
- SLA insert: Ø3.6 × 7mm depth, M3*4*5 황동 insert

### Export 파이프라인
- **insert-spec SVG/PNG 자동 생성**: `scripts/generate-spec.ts` + resvg-js
- 부품별 2개 spec 파일 분리 (case-top / case-bottom)

### 초기 무선 제거 세션
- `case.ts`에서 battery tray, slide switch cutout, magnet boss/pocket, battery cover opening 코드 제거
- `accessories.ts`에서 `buildPerfBoard`, `buildSlideSwitch`, `buildBatteries`, `buildBatteryContacts`, `buildCaseMagnets`, `buildCoverMagnets`, `buildBatteryCover` 제거
- `build-solids.ts` · `controls.tsx` · `app.tsx`에서 관련 PartVisibility 전부 제거

---

## 🔗 외부 참조

- LOLIN S3 Mini: https://www.wemos.cc/en/latest/s3/s3_mini.html
- RMK: https://rmk.rs/ / https://github.com/HaoboGu/rmk
- Vial: https://vial.rocks/
- JLC3DP Threaded Insert: https://jlc3dp.com (SLA + Surface finish: Threaded Insert, type M3*4*5)

---

## 🎬 새 대화에서 시작

1. 이 파일 읽어 맥락 파악
2. `src/models/case.ts` 현재 상태 확인 (`DEFAULT_CASE_PARAMS` / `SLA_CASE_PARAMS`)
3. `bun run dev` (사용자 실행)
4. `bun run export` — STL + insert-spec 재생성
5. `bun scripts/verify.ts` — plate STL alignment 확인
6. JLC3DP 배송 완료시 insert 삽입 상태 검수
