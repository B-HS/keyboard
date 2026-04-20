# 49 Keyboard 프로젝트 Context

대화 재개용 요약. 이 파일 읽으면 전체 맥락 파악 가능.

---

## 🎯 프로젝트 개요

**목표**: 49키 커스텀 키보드 자체 제작 (핸드와이어드, USB-C 유선 + BLE 무선, 3D 프린팅 케이스)

**핵심 스펙**:
- 레이아웃: 49키 (Row 0: 14×1u / Row 1: 1.5+11×1u+1.5u / Row 2: 2+10×1u+2u / Row 3: 1u+2×1.25u+2×2.75u(split spacebar)+5×1u)
- 컨트롤러: **LOLIN S3 Mini** (ESP32-S3FH4R2)
- 펌웨어: **RMK (Rust)** — Vial 네이티브
- 연결: **USB-C 유선 + BLE 5.0 무선**
- 전원: **3×AAA 알카라인** (직렬 4.5V, **배터리 직결**, 양 끝 접점만)
- 플레이트: **3D 프린트 일체형** (case-top에 union 통합)
- 케이스: **3D 프린팅 상/하 분할** (JLC3DP SLS PA12 Nylon 추천, thocky 사운드)
- 타이핑 각도: **8° 틸트**
- 배터리 뚜껑: **자석식 평판** (네오디뮴 10×5×2mm × 4개)

---

## 📂 프로젝트 구조

`/Users/gkn/keyboard/` (Git: github.com/B-HS/keyboard)

```
keyboard/
├── src/
│   ├── app.tsx                  # HMR accept + model re-build 트리거
│   ├── vite-env.d.ts
│   ├── components/
│   │   ├── viewer.tsx           # @jscad/regl-renderer (grid/axis hidden)
│   │   └── controls.tsx         # 사이드바 체크박스/Orient 컨트롤
│   └── models/
│       ├── layout.ts            # 49.json 파싱 + DEFAULT_STAB
│       ├── plate.ts             # 플레이트 2D/3D (case에 union)
│       ├── case.ts              # 케이스 + 배터리 트레이 + 보스 + deck + 자석
│       ├── lolin.ts             # LOLIN S3 Mini 시각화
│       ├── switch.ts            # Cherry MX STL 로드
│       ├── keycap.ts            # Cherry MX 키캡 STL 로드 (폭×행)
│       ├── stabilizer.ts        # 스태빌 STL 로드
│       ├── accessories.ts       # perf board / slide switch / 고무발 / 커버 / 배터리 / 접점 / 자석
│       ├── reference.ts         # jscad 소스 파서 (49-final.jscad)
│       ├── defaults.ts          # 플레이트 파라미터 override (13.95 switchCut, R1 stab pad)
│       ├── build-params.ts
│       ├── build-solids.ts      # 조립 + 색상 + phone/WOBKEY 비교
│       └── index.ts             # public API
├── scripts/
│   ├── export.ts                # STL export → docs/export/
│   ├── load-defaults.ts
│   └── verify.ts
├── docs/
│   ├── models/
│   │   ├── 49-final.jscad       # 플레이트 소스
│   │   ├── 49.json              # KLE 레이아웃
│   │   ├── switch/cherry mx.*   # Cherry MX 3D
│   │   ├── keycap/STL/*.stl     # 36개 키캡 STL (폭 × R1-R4)
│   │   └── stabilizer/*.stl
│   ├── specs/
│   │   └── parts.md / parts_specification.md / dim_s3_mini_v1.0.0.pdf / sch_s3_mini_v1.0.0.pdf
│   └── export/                  # 주문용 산출물
│       ├── case-top.stl
│       ├── case-bottom.stl
│       └── battery-cover.stl
├── .github/workflows/deploy.yml # GitHub Pages 자동 배포
├── vite.config.ts               # base: '/keyboard/' (프로덕션)
├── tsconfig.json                # noEmit: true + types: [node, vite/client]
└── context.md
```

---

## 🔧 확정된 설계 결정 (최신)

1. **펌웨어 RMK** (Rust): Vial 네이티브 + BLE/USB 듀얼
2. **MCU ESP32-S3** (LOLIN S3 Mini)
3. **3×AAA 알카라인 직결**: 중간 접점 없이 배터리끼리 직접 맞닿음, 양 끝에 dome(+)/spring(-) 2개만
4. **케이스 상/하 분할** (Z=bottomThickness=2.4mm): seam이 foot pad 바로 위에 깔려 눈에 거의 안 보임
5. **플레이트 → case-top에 통합** (union, `screwHoleRadius: 0`)
6. **Top Deck (ㄱ자 꺾임)**: 측벽 plate top → 안쪽 1mm 수평 → 키캡 둘레 감쌈
7. **코너 보스 4개**: 6×6×5mm, M3 숏 힛셋 (Ø3.5×4mm)
8. **플레이트 8° 틸트**, 피벗 Y=plateBounds.minY
9. **4방향 마진 비대칭**: F=2, **B=0**, L=2, R=2 (tilt로 인한 deck strip 불균형 보정)
10. **벽 두께 2mm** (마진과 동일)
11. **배터리 뚜껑 = 자석식 평판**:
    - T-slot 폐지, opening 직사각형 (배터리 + 슬라이드 스위치 영역 포함)
    - 커버 1.5mm 두께, 케이스 외면과 flush
    - 중앙 Ø8mm finger hole로 당겨서 뗌
    - 자석 2개 위치 (좌/우 end wall 바로 옆 boss), 위치당 case+cover 각 1개씩 = 총 4개
12. **슬라이드 스위치 floor 마운트**: Z=3.5mm (body 바닥), 핸들 Z=2.0-3.5 (커버 위에 위치해 간섭 없음). 커버 제거 시 노출
13. **스위치 컷아웃 13.95mm** (MJF +0.1 오버 고려)
14. **스태빌 pad R1.0mm** (R0.5 → 1.0, 뾰족 포인트 둔화)
15. **UEW 에나멜선 0.6mm** / **RS63 0.6mm 유연납** / **캡톤 + 폼테이프**

---

## 📐 현재 케이스 파라미터 (`case.ts DEFAULT_CASE_PARAMS`)

```ts
caseMarginFront: 2, caseMarginBack: 0, caseMarginLeft: 2, caseMarginRight: 2
plateTiltDeg: 8
plateFrontBottomZ: 11.25

plateRecessWall: 7.5        // rim top = deck top
wallThickness: 2
bottomThickness: 2.4        // split Z (case top/bottom 경계)

topDeckThickness: 1.0
topDeckKeyClearance: 0.2

cornerBossSize: 6
cornerBossHeight: 5
cornerBossInsertRadius: 1.75  // M3 숏 힛셋 Ø3.5
cornerBossInsertDepth: 4.0
cornerBossThroughRadius: 1.7
cornerBossHeadRadius: 3.2
cornerBossHeadDepth: 1.6

// USB-C
usbCutoutWidth: 12.2, usbCutoutHeight: 5.5
usbCutoutCenterX: 9.7, usbCutoutCenterZ: 7.0
usbCutoutCornerRadius: 1.5, usbCutoutTaperExpand: 0.5

// 배터리 직결
batteryDiameter: 10.5, batteryLength: 44.5, batterySlotTolerance: 0.2
batteryGapLength: 2         // 1mm tolerance × 2 (배터리 3개 거의 맞닿음)
batteryTrayYCenter: 3, batteryTrayYWidth: 12
batteryTrayXStart: 73
batteryEndWallThickness: 2
batteryTrayUpperWall: 1.3
batteryTrayFloorFlangeThickness: 1.5

caseCornerRadius: 2

// 슬라이드 스위치
slideSwitchX: 47, slideSwitchY: 6, slideSwitchZ: 3.5
slideSwitchCutoutWidth: 8, slideSwitchCutoutHeight: 6

// 자석 (10×5×2mm 직사각)
MAGNET_SIZE_X: 10, MAGNET_SIZE_Y: 5, MAGNET_HEIGHT: 2
MAGNET_CLEARANCE: 0.2
MAGNET_POCKET_DEPTH_CASE: 2.1   // 완전 매립
MAGNET_POCKET_DEPTH_COVER: 1.1  // 부분 매립 (0.9mm 돌출)
magnetBossSizeX: 12, magnetBossSizeY: 7, magnetBossHeight: 4.1
```

**플레이트 override (defaults.ts)**:
- switchCutoutSize: 13.95 (MJF 오버사이즈 보정)
- stabilizer.padSize: [6.9, 14.9]
- stabilizer.padCornerRadius: 1.0

**최종 외곽 치수**:
- 전체: **275.65 × 85.15mm**
- 플레이트: 271.65 × 83.15mm (R1)
- 앞 높이: ~19.4mm / 뒤 높이: ~30.8mm
- Deck strip 너비: 좌/우/뒤 2.8mm, 앞 1.5mm

**배터리 트레이 X**:
- Start: 73, End: 208.5 (= 73 + 3×44.5 + 2×2)
- 자석 boss: 좌(X=68) + 우(X=214.5), Y=3 (tray center)
- 커버 opening X: 41~220.5 (슬라이드 스위치 + 배터리 트레이 + 자석 boss 전부 포함)

---

## 🔨 케이스 빌드 순서 (case.ts)

1. **outerShell**: 사다리꼴 polygon extrude + R2 라운딩
2. **innerCavity subtract**
3. **topDeck union** (플레이트 톱 ~ 벽 톱 영역, U 그리드 기반 single cutout)
4. **플레이트 통합** (`screwHoleRadius: 0` 오버라이드) union + tilt
5. **batteryTray union**: cradle × 3 (cylinder-intersect 원형) + 원호 end wall × 2 + 플랜지 × 2
6. **cornerBosses union** (4개 모서리 M3 힛셋용)
7. **magnetBosses union** (2개 end wall 옆, 자석용)
8. **Subtract**: USB 컷아웃 + 배터리 커버 사각 opening + 코너 보스 인서트홀 + 자석 포켓
9. **retessellate** (coplanar polygon 병합, 메시 정리)

**상/하 분할**:
- `sliceCuboid` Z=bottomThickness=2.4 기준
- Top: Z ≥ 2.4, Bottom: Z ≤ 2.4
- Bottom에 코너 보스 관통공/카운터보어 subtract

---

## 🧲 자석 시스템 상세

**구매 스펙**:
- 네오디뮴 **10×5×2mm N52** × 4개
- 자화 방향: 2mm 두께 방향 (Z axis)
- 쿠팡/AliExpress "10x5x2 네오디뮴 N52"
- 10개 팩 2~3천원

**위치 / Z 배치**:
- 위치당 2개 (case 자석 1 + cover 자석 1)
- Case 자석 Z=2.4~4.4 (boss 안에 완전 매립)
- Cover 자석 Z=0.4~2.4 (cover 안 + 0.9mm 돌출)
- Z=2.4 interface 에서 서로 접촉 → 최대 pull force

**접착**:
- 순간접착제 (Loctite 401) 또는 AXIA 투명 주사기 에폭시
- 극성 확인: 두 자석 맞물려 딸깍 붙는 방향으로 설치
- 실수로 N-N 으로 넣으면 밀어냄 → 경화 전 확인 필수

**Pull force**: 10×5×2 N52 pair = ~1.5 kgf × 2 = **3 kgf** (커버 4g 대비 750배)

---

## 🧩 배치된 부품 (뷰어 토글)

| 부품 | 위치 | 기본 |
|------|------|------|
| Case Top | 플레이트 통합 | ON |
| Case Bottom | | ON |
| Switches | Cherry MX STL | ON |
| LOLIN S3 Mini | X=9.7, Y=-7.15 | ON |
| Perf Board | 50×40, 좌측 벽 옆 | ON |
| Slide Switch | (47, 6, 3.5) floor mount | ON |
| Stabilizers | STL (DEFAULT_STAB 테이블) | ON |
| Keycaps | 폭×R 프로파일 매핑 | ON |
| Foot Pads | Ø6×2 × 4, inset 5 | ON |
| Battery Cover | 자석식 평판 + finger hole | ON |
| **Magnets** | 10×5×2mm × 4개 | ON |
| Batteries | 3×AAA | ON |
| Battery Contacts | 양 끝 dome/spring만 | OFF |
| Phone | 77.6×160.7×7.85 | OFF |
| WOBKEY Zen 65 | 315×112×28 | OFF |

**Orient 컨트롤** (Switch/Keycap/Stabilizer): Z Offset, Rot X/Y/Z
- Stabilizer 추가: spacingAdjust, yOffset, clipBottomZ

**Row → 키캡 프로파일**: OEM 스타일 (Row0 → R2, Row1 → R3, Row2 → R4, Row3 → R4 등 user config)

---

## 📦 Export (주문용)

```bash
bun run export   # → docs/export/ 에 3개 파일
```

- `case-top.stl` (~780KB)
- `case-bottom.stl` (~140KB)
- `battery-cover.stl` (~25KB)

**JLC3DP 조건**: 모든 벽 ≥ 1.2mm ✓, 인서트 주변 ≥ 1.25mm ✓

**추천 재질 순위**:
1. **SLS PA12 Nylon (3201PA-F)** — 최우선, MJF와 동일 재료, 저렴
2. MJF PA12
3. FDM PC
4. ❌ SLA Resin — 힛셋 인서트 불가 (열경화성)

---

## 🛒 부품 상태

### ✅ 보유
- LOLIN S3 Mini / TPS63020 / GVMRZ 슬라이드 스위치
- AA 스프링 접점 (콤비 세트), 하지만 직결 방식이라 **양 끝 2개만 사용**
- 1N4148 × 300, UEW 0.6mm × 10m, 만능보드 70×90
- Cherry MX × 49, 키캡 STL, MX Plate-mount 스태빌
- M3 하드웨어 + 고무발 Ø6×2
- HAKKO FX-600 + RS63 + 플럭스펜 + 캡톤 + 폼테이프
- AAA 알카라인

### ❌ 주문 필요
- **case-top/bottom/battery-cover STL** (JLC3DP SLS PA12 Nylon 추천)
- **M3 숏 힛셋 인서트 × 4** (Ø3.5×4mm)
- **네오디뮴 자석 10×5×2mm N52 × 4개**
- **순간접착제** (Loctite 401 or 시아노아크릴레이트) 자석 고정용
- **MX 스태빌 4세트** (2u × 2 + 2.75u × 2)
- **Krytox 205g0** (스태빌 튜닝, 선택)

---

## 🎨 개발 / 뷰어

```bash
bun run dev        # http://localhost:5173
bun run export     # STL 생성
bun scripts/verify.ts
bun run build      # 프로덕션
```

**조작**: 드래그(회전) · Shift+드래그(이동) · 휠(줌)

**뷰어 설정**: Grid/Axis 숨김, 색상 통일 `[0.07, 0.07, 0.1]` 블랙

**HMR**: `import.meta.hot.accept('./models/...')` 로 모델 파일 변경 시 자동 재렌더

---

## 🌐 GitHub Pages 배포

- `vite.config.ts`: `base: '/keyboard/'` (build 시만)
- `.github/workflows/deploy.yml`: main push → 자동 배포
- Settings → Pages → Source: **GitHub Actions**
- URL: **https://b-hs.github.io/keyboard/**

---

## 🔧 툴체인 버전

- **Vite 8.0.9**
- **React 19.2.5**
- **@vitejs/plugin-react 6.0.1**
- **TypeScript 6.0.3**
- **Bun 1.3.0** (런타임)
- `tsconfig.json`: `noEmit: true` + `types: [node, vite/client]`

---

## ⏳ 남은 작업

- [ ] JLC3DP 주문 (SLS PA12 Nylon 추천, 3 파일)
- [ ] M3 숏 힛셋 인서트 × 4 주문
- [ ] 네오디뮴 자석 10×5×2 × 4 주문
- [ ] MX 스태빌 4세트 주문
- [ ] 순간접착제 준비
- [ ] RMK `keyboard.toml` 작성 (Row/Col 핀 매핑, Vial 키맵)
- [ ] 핸드와이어 조립 + 테스트
- [ ] GitHub Pages 배포 확인

---

## 🐛 주요 수정 이력 (최신 순)

- **Vite 5 → 8, React 18 → 19, TS 5 → 6** 업그레이드
- **Stale .js 파일 대량 삭제** (`tsc -b` 잔재, 16개 삭제) → HMR 정상화
- **tsconfig `noEmit: true`** 추가 (더 이상 .js 안 만들어짐)
- **HMR accept** app.tsx 에 명시적 추가 (models/* 변경 감지)
- **자석식 배터리 커버 재설계**: T-slot 완전 폐지 → 평판 + 4개 자석 (10×5×2mm N52)
- **자석 pocket 깊이 분리**: CASE 2.1mm (완전 매립), COVER 1.1mm (부분 매립) → 커버 flush 가능
- **커버 중앙 Ø8mm finger hole** (외부 돌출 grip 제거)
- **커버 두께 1.5mm** (이전 2.4 → 얇게)
- **커버 opening X 연장**: 슬라이드 스위치 영역까지 (X=41~220.5)
- **배터리 직결**: 중간 4개 접점 제거, 양 끝 dome/spring 2개만
- **배터리 gap 7 → 2mm** (tolerance 만)
- **슬라이드 스위치 위치**: floor Z=3.5mm (핸들 Z=2.0-3.5, 커버 Z=0-1.5 위)
- **배터리 트레이 크래들 = 원형** (cylinder-intersect 복구)
- **배터리 upperWall 1.75 → 1.3** (얇게)
- **retessellate 추가** (CSG 결과 메시 정리)
- **스위치 컷아웃 14.0 → 13.95** (MJF 오버사이즈 보정)
- **스태빌 pad R0.5 → R1.0** (뾰족 포인트 둔화)
- **코너 보스 인서트 Ø4 → Ø3.5** (보스 벽 1.25mm)
- **플레이트 case-top 통합** (union, screwHoleRadius: 0)
- **중앙 나사 포스트 제거**
- **코너 보스 4개 + 아래 M3 체결** 추가 (상/하 조립)
- **케이스 상/하 분할** (Z=2.4 seam)
- **Top Deck** 추가: world frame (Y,Z) polygon
- **4방향 마진 비대칭** (F=2, B=0, L=2, R=2)
- **wallThickness 3 → 2**
- **USB-C 컷아웃 Z 6.25 → 7.0**, taperExpand 1.0 → 0.5
- **스위치/키캡/스태빌 STL 로더** (import.meta.glob)
- **스태빌 시각화 버그 fix** (DEFAULT_STAB.spacingByWidth 테이블 사용)

---

## 🔗 외부 참조

- LOLIN S3 Mini: https://www.wemos.cc/en/latest/s3/s3_mini.html
- RMK: https://rmk.rs/ / https://github.com/HaoboGu/rmk
- Vial: https://vial.rocks/
- ESP32-S3: https://www.espressif.com/sites/default/files/documentation/esp32-s3_datasheet_en.pdf
- 참고 디자인: WOBKEY Zen 65, Keychron Q1, GMMK Pro

---

## 🎬 새 대화에서 시작

1. 이 파일 읽어 맥락 파악
2. `src/models/case.ts` 현재 상태 확인 (`DEFAULT_CASE_PARAMS`)
3. `bun run dev` (사용자가 직접 실행)
4. `bun run export` 로 최신 STL 생성
5. 필요 시 `bun scripts/verify.ts` 로 플레이트/스태빌 위치 재확인
