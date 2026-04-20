# 49 Keyboard 프로젝트 Context

대화 재개용 요약. 이 파일 읽으면 전체 맥락 파악 가능.

---

## 🎯 프로젝트 개요

**목표**: 49키 커스텀 키보드 자체 제작 (핸드와이어드, USB-C 유선 + BLE 무선, 3D 프린팅 케이스)

**핵심 스펙**:
- 레이아웃: 49키 (Row 0: 14×1u / Row 1: 1.5+11×1u+1.5u / Row 2: 2+10×1u+2u / Row 3: 1u+2×1.25u+2×2.75u(split spacebar)+5×1u)
- 컨트롤러: **LOLIN S3 Mini** (ESP32-S3FH4R2)
- 펌웨어: **RMK (Rust)** — Vial 네이티브 (vial.rocks)
- 연결: **USB-C 유선 + BLE 5.0 무선**
- 전원: **3×AAA 알카라인** (직렬 4.5V)
- 플레이트: **3D 프린트 일체형** (케이스 상단 피스에 통합) — 과거 PC 1.5mm 레이저컷 계획에서 변경
- 케이스: **3D 프린팅 상/하 분할** (JLC3DP MJF PA12 Nylon 또는 FDM PC 추천, thocky 사운드)
- 타이핑 각도: **8° 틸트**

---

## 📂 프로젝트 구조

`/Users/gkn/keyboard/` (Git: github.com/B-HS/keyboard)

```
keyboard/
├── src/
│   ├── app.tsx
│   ├── vite-env.d.ts
│   ├── components/
│   │   ├── viewer.tsx          # @jscad/regl-renderer (grid/axis hidden)
│   │   └── controls.tsx        # 사이드바 체크박스/Orient 컨트롤
│   └── models/
│       ├── layout.ts           # 49.json 파싱 + DEFAULT_STAB
│       ├── plate.ts            # 플레이트 2D/3D (case에 union됨)
│       ├── case.ts             # 케이스 + 배터리 트레이 + 코너 보스 + top deck
│       ├── lolin.ts            # LOLIN S3 Mini 시각화
│       ├── switch.ts           # Cherry MX STL 로드 (import.meta.glob)
│       ├── keycap.ts           # Cherry MX 키캡 STL 로드 (폭×행 매핑)
│       ├── stabilizer.ts       # 스태빌 STL 로드 (import.meta.glob)
│       ├── accessories.ts      # 만능보드, 슬라이드 스위치, 키캡 폴백, 고무발, 배터리 뚜껑, 배터리, 접점
│       ├── reference.ts        # jscad 소스 파서 (49-final.jscad)
│       ├── defaults.ts
│       ├── build-params.ts
│       ├── build-solids.ts     # 조립 + 색상 + 비교용 phone/WOBKEY Zen 65
│       └── index.ts            # public API
├── scripts/
│   ├── export.ts               # STL export → docs/export/
│   ├── load-defaults.ts
│   └── verify.ts
├── docs/
│   ├── models/
│   │   ├── 49-final.jscad      # 플레이트 소스 (KLE-NG)
│   │   ├── 49.json             # KLE 레이아웃
│   │   ├── switch/cherry mx.*  # Cherry MX 3D 원본 (STL 포함)
│   │   ├── keycap/STL/*.stl    # 36개 키캡 STL (폭 1~6.25u × R1~R4)
│   │   └── stabilizer/*.stl    # Cherry MX Stabilizers.stl
│   ├── specs/
│   │   ├── parts.md
│   │   ├── parts_specification.md
│   │   ├── dim_s3_mini_v1.0.0.pdf
│   │   └── sch_s3_mini_v1.0.0.pdf
│   └── export/                 # 주문용 산출물
│       ├── case-top.stl
│       ├── case-bottom.stl
│       └── battery-cover.stl
├── .github/workflows/deploy.yml  # GitHub Pages 자동 배포
├── vite.config.ts                # base: '/keyboard/' (프로덕션)
└── context.md
```

---

## 🔧 확정된 설계 결정 (최신)

1. **펌웨어 RMK** (Rust): QMK+BT+VIA 조합 불가. RMK는 Vial 네이티브 + BLE/USB 듀얼 지원
2. **MCU ESP32-S3** (LOLIN S3 Mini): 국내 구매 용이, USB-C 네이티브, RMK 공식 지원
3. **3×AAA 알카라인**: 리튬이온 대비 수명 반영구, 장기 미사용 안전
4. **배터리 end-to-end + 같은 방향 + 콤비 접점**: 리모컨식, 4접점 직렬 자동 연결
5. **케이스 상/하 분할** (Z=bottomThickness=2.4mm): seam이 foot pad 바로 위에 깔려 눈에 거의 안 보임
6. **플레이트 → case-top에 통합** (union): 별도 PC 플레이트 주문 불필요. `screwHoleRadius: 0` 로 빌드 (나사홀 제외)
7. **Top Deck (ㄱ자 꺾임)**: 측벽이 plate top까지 올라간 뒤 안쪽으로 1mm 수평으로 뻗어 키캡 둘레를 둘러쌈. Single big cutout (U grid 기반) + innerRadius 라운드
8. **코너 보스 4개**: 상부 내부 모서리에 6×6×5mm 네모 보스, M3 숏 힛셋 (Ø3.5×4mm) 인서트. 하부는 Ø3.4 관통공 + Ø6.4 카운터보어. 중앙 나사 포스트는 제거 (플레이트 통합 후 불필요)
9. **플레이트 8° 틸트**: WOBKEY Zen 65 (7°)보다 살짝 가파름. 피벗 Y=plateBounds.minY
10. **4방향 마진 비대칭**: F=2, **B=0**, L=2, R=2. 뒤는 tilt 보정용 0, 앞은 2 (deck strip 너비 균형)
11. **벽 두께 2mm** (기존 3mm에서 축소, 마진과 align)
12. **배터리 뚜껑**: 하판 슬라이드 + T자 레일 (립 걸림 구조)
13. **UEW 에나멜선 0.6mm** / **RS63 0.6mm 유연납** / **캡톤 + 폼테이프** (기존 유지)

---

## 📐 현재 케이스 파라미터 (`case.ts DEFAULT_CASE_PARAMS`)

```ts
caseMarginFront: 2, caseMarginBack: 0, caseMarginLeft: 2, caseMarginRight: 2
plateTiltDeg: 8
plateFrontBottomZ: 11.25

plateRecessWall: 7.5        // rim top = deck top
wallThickness: 2            // 마진과 동일
bottomThickness: 2.4        // split Z

topDeckThickness: 1.0       // 안쪽으로 꺾인 수평 부분
topDeckKeyClearance: 0.2    // U 그리드 + 0.2mm (cap 주변 0.7mm 여유)

cornerBossSize: 6           // 6×6 square
cornerBossHeight: 5         // above bottomThickness
cornerBossInsertRadius: 1.75  // M3 숏 힛셋 Ø3.5
cornerBossInsertDepth: 4.0
cornerBossThroughRadius: 1.7  // M3 clearance
cornerBossHeadRadius: 3.2     // 카운터보어
cornerBossHeadDepth: 1.6

// USB-C 컷아웃 (LOLIN USB 중앙에 맞춤)
usbCutoutWidth: 12.2
usbCutoutHeight: 7.5
usbCutoutCenterX: 9.7
usbCutoutCenterZ: 6.65
usbCutoutCornerRadius: 1.5
usbCutoutTaperExpand: 1.0

// 배터리 (뒤쪽 안으로 당김)
batteryDiameter: 10.5, batteryLength: 44.5, batterySlotTolerance: 0.2
batteryGapLength: 7
batteryTrayYCenter: 3, batteryTrayYWidth: 12  // Y: -3 ~ 9 (wall inner 10 앞쪽 1mm)
batteryTrayXStart: 73
batteryEndWallThickness: 2, batteryTrayUpperWall: 1.2, batteryTrayFloorFlangeThickness: 1.2

caseCornerRadius: 2

// 슬라이드 스위치 (핸들 아래로)
slideSwitchX: 47, slideSwitchY: 6
slideSwitchCutoutWidth: 8, slideSwitchCutoutLength: 6
```

**최종 외곽 치수**:
- 전체: **275.65 × 85.15mm**
- 플레이트: 271.65 × 83.15mm (R1)
- 앞 높이: ~19.4mm / 뒤 높이: ~30.8mm
- Deck strip 너비: 좌/우/뒤 2.8mm, 앞 1.5mm (tilt 영향)

---

## 🔨 케이스 구성 (case.ts 빌드 순서)

1. **outerShell**: 사다리꼴 polygon extrude + 수직 엣지 R2 라운딩 (rounded rect intersect)
2. **innerCavity subtract**: 벽 두께만큼 안쪽, 내부 코너 라운딩
3. **topDeck union** (조건: `topDeckThickness > 0`):
   - (Y,Z) polygon extrude 방식 (wall과 동일 틸트 수식)
   - 슬랩 Z range: plate top ~ wall top (= plateRecessWall 7.5mm 영역)
   - Key cutout: single big cuboid (U 그리드 기반 bounding box + extra), plate-local → tilt
   - Cutout 2D는 roundedRectangle (innerRadius 1mm) 로 내부 모서리 라운드
4. **플레이트 통합 union**: `buildPlate(keys, screwHoleRadius=0)` → plate tilt transform 적용
5. **batteryTray union**: cradle × 3 + 원호 끝벽 × 2 + 바닥 플랜지 × 2
6. **cornerBosses union**: 4개 모서리 6×6×5mm 네모 보스
7. **Subtract**: USB 컷아웃 (2단 테이퍼) + 배터리 T자 바닥 컷아웃 + 슬라이드 스위치 바닥 컷아웃 + 코너 보스 인서트홀

**상/하 분할** (`buildCaseTop`, `buildCaseBottom`):
- `sliceCuboid` 로 Z=bottomThickness 기준 절단
- Top = Z ≥ 2.4, Bottom = Z ≤ 2.4
- Bottom에 코너 보스 관통공/카운터보어 추가 subtract

---

## 🧩 배치된 부품 (뷰어 토글)

| 부품 | 파일 | 비고 |
|------|------|------|
| Case Top | case.ts | 플레이트 통합, 기본 ON |
| Case Bottom | case.ts | 기본 ON |
| Switches | switch.ts | Cherry MX STL (docs/models/switch/*.stl) |
| LOLIN S3 Mini | lolin.ts | X=9.7, Y=-7.15, standoff 1mm |
| Perf Board | accessories.ts | 50×40×1.6mm, 좌측 벽 옆 (보스 회피 위치) |
| Slide Switch | accessories.ts | GVMRZ 시각화, 핸들 Z- 방향 |
| Stabilizers | stabilizer.ts | STL + `DEFAULT_STAB.spacingByWidth` 참조 |
| Keycaps | keycap.ts | 폭 × 행 프로파일 매핑 (1x{w} R{profile}.stl) |
| Foot Pads | accessories.ts | Ø6×2 4개, inset 5mm |
| Battery Cover | accessories.ts | T자 립 + 그립 + ridge 2개 |
| Batteries | accessories.ts | 3×AAA + 꼭지 |
| Battery Contacts | accessories.ts | 돔/스프링/판 조합 (기본 OFF) |
| Phone | build-solids.ts | 77.6×160.7×7.85, case 왼쪽 비교용 (기본 OFF) |
| WOBKEY Zen 65 | build-solids.ts | 315×112×28mm, case 오른쪽 비교용 (기본 OFF) |

**기본 체크**: caseTop ~ batteryCover + batteries 까지 ON. batteryContacts/phone/wobkeyZen65 만 기본 OFF.

**Orient 컨트롤** (Switch/Keycap/Stabilizer): Z Offset, Rot X/Y/Z. 스태빌은 `spacingAdjust`, `yOffset`, `clipBottomZ` 추가.

**Row → 키캡 프로파일 매핑** (OEM 스타일):
- Row 0 → R1 (또는 R2, user config 가능), Row 1 → R2/R3, Row 2 → R3/R4, Row 3 → R4

---

## 📦 Export (주문용)

```bash
bun run export   # → docs/export/ 에 3개 파일 생성
```

- `case-top.stl` (~755KB) — 상부 (플레이트 + deck + 측벽 + 보스 + 트레이 + USB 컷아웃)
- `case-bottom.stl` (~145KB) — 하부 (바닥판 + T-slot + 슬라이드 컷아웃 + 관통공)
- `battery-cover.stl` (~5KB) — 배터리 슬라이드 커버

**JLC3DP 조건**:
- 벽 ≥ 1.2mm (측벽 2, 바닥 2.4, 플랜지/트레이 1.2) ✓
- 부품 최소 ≥ 0.8mm (뚜껑 본체/립 ≥ 1.1) ✓
- 인서트 주변 벽 1.25mm (Ø3.5 인서트 × 6mm 보스) ✓

**추천 재질** (thocky 사운드 순):
1. **MJF PA12 Nylon** (최우선 실용): 매트 균일, 밀도 1.0g/cm³, 키보드 커뮤니티 정석
2. **FDM Polycarbonate (PC)**: 플레이트 원래 재질 그대로
3. FDM ABS: 가성비
- ❌ PETG/PLA/일반 SLA 레진: 사운드 톤 이상

---

## 🛒 부품 상태

### ✅ 보유
- LOLIN S3 Mini / TPS63020 / GVMRZ 슬라이드 스위치
- AA 스프링 접점 세트 (콤비 A 21×9, B 24×9, C 20×9)
- 1N4148 다이오드 300개, UEW 0.6mm 10m, 만능보드 70×90
- Cherry MX 49개, 키캡(전체 프로파일 STL 보유), MX Plate-mount 스태빌라이저
- M3 하드웨어 + 열 인서트, 고무발 Ø6×2
- HAKKO FX-600 + 희성 RS63 + 플럭스펜 + 캡톤 + 폼테이프
- AAA 알카라인

### ❌ 주문 필요
- **case-top.stl + case-bottom.stl + battery-cover.stl** (JLC3DP MJF PA12 또는 FDM PC)
- **M3 숏 힛셋 인서트 × 4** (Ø3.5×4mm)
- **MX 스태빌라이저 4세트** (2u × 2 + 2.75u 용, Durock V2 / Everglide / C³ 등)
- **Krytox 205g0** (스태빌 튜닝, 선택)
- 플레이트/DXF 레이저컷 주문은 **불필요** (통합됨)

---

## 🎨 뷰어 사용

```bash
bun run dev        # http://localhost:5173 (사용자가 직접 실행)
bun run export     # STL 생성
bun scripts/verify.ts
bun run build      # 프로덕션 빌드 (dist/)
```

**조작**: 드래그(회전) · Shift+드래그 or 우클릭(이동) · 휠(줌)

**렌더 설정**: Grid/Axis 숨김 (투명 배경), 키캡/하우징/케이스/스위치 전부 `[0.07, 0.07, 0.1]` 블랙 통일.

---

## 🌐 GitHub Pages 배포

- `vite.config.ts`: 프로덕션 빌드 시 `base: '/keyboard/'`
- `.github/workflows/deploy.yml`: main 브랜치 push → 자동 배포
- 레포 설정: Settings → Pages → Source: **GitHub Actions**
- URL: **https://b-hs.github.io/keyboard/**

번들 크기: JS 467KB (gzip 154KB), STL 에셋 ~6MB (지연 fetch).

---

## ⏳ 남은 작업

**3D 설계 완료.** 이후는 주문 + 조립 + 펌웨어.

- [ ] JLC3DP 주문 (MJF PA12 Nylon 추천)
- [ ] MX 스태빌라이저 4세트 주문
- [ ] M3 숏 힛셋 인서트 × 4 주문
- [ ] RMK `keyboard.toml` 작성 (Row/Col 핀 매핑, Vial 키맵)
- [ ] 핸드와이어 조립 + 테스트
- [ ] GitHub Pages 배포 확인

---

## 🐛 주요 수정 이력 (최신 순)

- 코너 보스 인서트 Ø4 → Ø3.5 (보스 벽 1.25mm 확보, M3 숏 힛셋)
- `plate.dxf` export 제거 (플레이트 통합됨)
- **플레이트 case-top에 union 통합** (`screwHoleRadius: 0` 오버라이드)
- 플레이트 토글 제거 (중복 렌더 z-fighting 방지)
- 중앙 나사 포스트 4개 + 관련 홀 제거 (플레이트 통합 후 불필요)
- **코너 보스 4개 + 아래에서 M3 체결** 추가 (상/하 조립)
- 배터리 트레이 Y center 6 → 3 (뒤벽에서 1mm 당김)
- Foot pad inset 8 → 5
- `caseMarginFront: 2`, `caseMarginBack: 0` 비대칭 (tilt로 인한 deck strip 불균형 보정)
- `wallThickness: 3 → 2` (마진과 동일)
- **Top Deck** 추가: wall과 동일 (Y,Z) polygon 방식 → world frame 정확 정렬
- Deck cutout = U 그리드 기반 single big cutout + rounded corners
- 스위치/키캡/스태빌 STL 로더 (import.meta.glob + `?url`)
- 스태빌 시각화 버그 fix: `11.938/2` → `DEFAULT_STAB.spacingByWidth` 테이블 사용
- **케이스 상/하 분할** (Z=2.4mm seam, foot pad 위)
- USB-C 컷아웃 Z 6.25 → 6.65 (LOLIN USB 정렬)
- 키캡/스태빌/케이스/스위치 색상 전부 `[0.07, 0.07, 0.1]` 블랙 통일
- Grid/Axis 숨김, WOBKEY Zen 65 비교 블록 추가

---

## 🔗 외부 참조

- LOLIN S3 Mini: https://www.wemos.cc/en/latest/s3/s3_mini.html
- RMK 문서: https://rmk.rs/
- RMK GitHub: https://github.com/HaoboGu/rmk
- Vial 웹: https://vial.rocks/
- ESP32-S3 Datasheet: https://www.espressif.com/sites/default/files/documentation/esp32-s3_datasheet_en.pdf
- 참고 디자인: WOBKEY Zen 65, Keychron Q1, GMMK Pro

---

## 🎬 새 대화에서 시작

1. 이 파일 읽어 맥락 파악
2. `docs/specs/parts.md`, `parts_specification.md` 확인
3. `src/models/case.ts` 현재 상태 확인 (`DEFAULT_CASE_PARAMS`)
4. `bun run dev` (사용자가 직접 실행)
5. `bun run export` 로 최신 STL 생성
6. 필요 시 `bun scripts/verify.ts` 로 플레이트 bounds / 스태빌 위치 재확인
