# PROCESS — split-keyboards monorepo 현재 상태 (단일 출처)

> **새 세션은 이 문서를 먼저 읽는다.** 저장소 전체의 구조·뷰어·프로젝트별 상태·실행·남은 일을 정확히 담는다.
> 기준 룰: `~/.claude/CLAUDE.md` + 코딩 컨벤션(ai-process / common / comments / fsd …).
> 최종 갱신: 2026-07-10 · 브랜치 **`split`** · **top STL 틸트 export 버그 수정**(`ebfd2b5`): `buildTopFdm3D` 베젤이 `tiltGeom`으로 기운 채 export되어 베드 접촉이 146.3×0.8mm 모서리 띠뿐이던 문제 → CLI(`export-fdm.ts`)·웹(`stl-parts.ts`) 양쪽 top에 `untiltGeom` 적용(**untilt→flip 순서**), 베젤 면 전체(146.4×108.2) 베드 밀착·top 높이 26.8mm. 뷰어 렌더는 틸트 유지. 상세 `docs/bug/2026-07-10-top-stl-tilt-export.md`.
> 이전: 2026-07-07 배치(①65 FDM 7.5° 틸트 §4.2 ②프론트 전면 개편 §1.5 ③웹 STL Export·1/5 검증·사포 마감 ④65 PCB 라우팅 완결 ⑤ESP32-C3 통합)는 이후 전부 커밋 반영 — keypad TS 전환 `d3f3447` · 65 PCB 라우팅 `192ec67` · 문서 최신화 `d433119` · **JLCPCB 거버·드릴 생성+발주 사양 확정** `d4d1fd3`(`65/pcb/order/jlcpcb-{left,right}.zip`, pcb-build §6) · 뷰어 BASE_URL(GitHub Pages) `f14c200`. **65 PCB는 JLC 업로드·발주만 남음.** 그 이전: 2026-06-27 `0a3e649`.

---

## 0. 한 줄 정의

키보드 **케이스**를 JSCAD(@jscad/modeling)로 파라메트릭 모델링하고, three.js 실시간 뷰어로 보며 설계하고, CNC/레이저컷용 **2D DXF** + **FDM(A1 mini)용 3D STL** 두 경로로 export하는 **monorepo**. 런타임/패키지매니저 **Bun**, 번들러 **Vite**. **현재 65의 실제 제작 경로는 FDM STL**(`export:65-fdm`, 아크릴 DXF 경로는 병행 보존).

두 프로젝트가 **공유 렌더러** 위에 독립적으로 올라간다:

- **`65/`** — split-65: 좌(30키)·우(35키) = 65키 분리형 핫스왑 키보드. 케이스 설계 **확정(v3)**.
- **`keypad/`** — split-keypad: 17키 단일 플레이트 넘패드. split-65를 바로 발주하기엔 손실이 커, **저손실 prototype**으로 먼저 검증한다(같은 케이스 구조).

뷰어는 현재 **65만 렌더**한다(keypad는 2026-07-07 렌더 제외, 코드·export·CI는 유지 — §1.5).

---

## 1. 저장소 구조 (monorepo)

```
src/                    React 앱 + 공유 렌더러 (FSD, 상세 §1.5)
65/                     split-65 프로젝트 (아래 §4)
keypad/                 split-keypad 프로젝트 (상세: keypad/docs/PROCESS.md)
assets/models/          공유 정적 에셋(vite publicDir): switch/silent_alpaca.wrl · keycap/keycaps.json · reference-49/*.stl
keycaps/ · keyswitch_model/   외부 클론 에셋 소스(별도 .git, .gitignore) — 재클론: github.com/joric/keycaps · github.com/koktoh/keyswitch_model. 뷰어 사용분은 assets/models/에 커밋됨(유실 없음)
types/                  앰비언트 d.ts (jscad.d.ts, assets.d.ts)
docs/                   monorepo umbrella + 공유 지식(이 문서 §9)
```

각 프로젝트(`65/`·`keypad/`) 내부는 동일 패턴(전부 .ts):

```
config/dimensions.ts   치수 + Z스택 (SSOT)
config/layout.ts       스위치/스태빌 좌표 → bbox/caseOutline/opening/mountHoles 유도 → SIDES(Side 타입은 @renderer/types)
parts/shapes.ts        rect, mountHoleCuts(M2 Ø2.4)
parts/plate.ts         buildPlate2D/3D (보강판: 스위치컷+스태빌컷+볼트홀). keypad는 스태빌 rot 지원
parts/top-frame.ts     buildTopFrame2D/3D (베젤: 키 셀 union→외곽선→fillet 1.0, 마운트홀 0). keypad는 vSpan 셀 높이
parts/bottom-plate.ts  buildBottom2D/3D (평판 + Ø2.4 홀)
parts/spacer.ts        buildSpacers2D/3D (좌·우 벽, WALL_WIDTH 6)
parts/case-fdm.ts      (65 전용) FDM 3파츠 + 7.5° 틸트 (§4.2)
viewer/case-meshes.ts  buildCaseMeshes(Fdm)(side)→{group,layers} · buildBoxPreview(폴백). @renderer/jscad-to-three 사용
viewer/reference-*.ts  (65 전용) Zen 65·49키 비교 렌더
project.ts             createProject(onChange)→ProjectUnit{group,bounds,layerKeys,references,setLayerStyle}. DOM/카메라 부수효과 없음
export/export*.ts      레이어별 DXF/STL → <project>/export-out/
export/smoke.ts        부품 생성·치수 콘솔 검증
raw/                   원본 생성물(KLE-NG jscad + KiCad PCB). 좌표 출처
docs/                  프로젝트별 문서(keypad는 PROCESS·pcb-requirements·bom·quality-assurance)
```

- **Path alias(vite+tsconfig 동일)**: `@`/`@app`/`@widgets`/`@features`/`@entities`/`@shared`→`src/*`, `@renderer`→`src/shared/renderer`, `@65`→`65`, `@keypad`→`keypad`. bun이 tsconfig paths를 해석하므로 export/smoke 스크립트의 `import type '@renderer/types'`(타입 전용)도 안전. 런타임 값 import는 여전히 상대경로 원칙.
- **모듈 흐름**: `config` → `parts`(2D geom2 → extrudeLinear) → 갈래 A `viewer`(case-meshes + @renderer models) / 갈래 B `export`(DXF/STL). 같은 2D가 뷰어·export 양쪽 재사용.

### 1.5 프론트 스택 개편 (2026-07-07) — React + TypeScript

**전체 코드베이스 .js → .ts/.tsx 전환**(strict, noUncheckedIndexedAccess, `any` 0). JSCAD 타입은 `types/jscad.d.ts`(opaque Geom2/Geom3, 사용 API 표면만 선언).

```
src/
  app/              main.tsx(엔트리)·app.tsx(App)·globals.css(Tailwind 4 + 다크 토큰, radius 0)
  widgets/
    viewer/         viewer-canvas.tsx — three 마운트·프로젝트 배치·설정 적용(useEffect 외부 동기화)
    control-panel/  control-panel.tsx — 부품별 컨트롤 + 레퍼런스 토글 + 초기화
  features/
    layer-control/  layer-control-row.tsx — 순수 UI(visible·color·opacity·리셋 1행)
  entities/
    viewer-settings/ viewer-settings.ts — 설정 타입·기본값·localStorage load/save(버전 스키마 검증)
  shared/
    renderer/       scene.ts·models.ts·instancing.ts·jscad-to-three.ts·materials.ts·types.ts(계약)
    ui/             checkbox.tsx·slider.tsx (shadcn 스타일, Radix, radius 0)
    lib/cn.ts
```

- **계약 타입**(`@renderer/types`): `Side`/`ProjectUnit`/`LayerKey`/`LayerStyle`/`ReferenceToggle`. 65·keypad `project.ts`가 `createProject(onChange): ProjectUnit` 구현(비동기 모델 로드 완료 시 `onChange()`로 재렌더 요청).
- **렌더링 성능(핵심)**: 구 구조는 TAA 컴포저가 **조작 중 매 프레임 8x SSAA** → 스위치 로드 후 급락. 신 구조(`scene.ts`)는 ① dirty 프레임 = 단일 `renderer.render`(MSAA) ② idle = TAA 누적(sampleLevel 4)을 40프레임까지 진행 후 **렌더 완전 정지**(0 GPU) ③ `invalidate()`로만 재개.
- **하이브리드 투명도(그레인 제거)**: alphaHash는 조작 중 누적 불가라 원리적으로 자글자글 → `materials.ts`가 자동 전환: **조작 중(dirty) = 일반 알파 블렌딩**(그레인 0, 겹침 근사) / **idle = alphaHash + TAA 수렴**(정확). 재질에 `userData.translucent` 마킹, 모드 flip은 three 프로그램 캐시 재사용이라 저비용.
- **웹 STL Export**: 패널 하단 섹션 — scale 입력(0.05~1, 프리셋 1/5·1/2·1:1) + Export 버튼 → 브라우저에서 `65/export/stl-parts.ts`(CLI와 동일 배향: top은 untiltGeom→flip→dropToBed) 직렬화, **좌우 × top/bottom/mock-pcb = STL 6장** 개별 다운로드. mock-pcb = fdmOutline + Ø5.4 홀 6, 두께 1.6(스케일 적용) 확인용 대용판.
- **keypad 렌더 제거(2026-07-07)**: 뷰어는 65만 렌더(PROJECTS에서 제외). 패널은 프로젝트가 보고하는 `layerKeys`만 표시 → 스페이서 행 자동 제거(65 FDM은 벽 없음). keypad 코드·export·smoke·CI는 유지.
- **실모델 렌더 2종**: ① PCB = kicad-cli glb export(`assets/models/pcb/{left,right}.glb`, `65/viewer/pcb-model.ts`, rotateX90°+×1000+z=pcbBottom, 절차적→GLB 스왑) — **PCB 수정 시 glb 재export 필수**(명령: pcb-build §5). ② ESP32-C3 = SnapEDA STEP→더미보드 트릭 glb(`assets/models/esp32-c3.glb`), `65/viewer/esp32-model.ts`가 **색상별 지오메트리 병합**(938 드로우콜→~6, `mergeModelByColor` 재사용, 좌우 지오메트리 공유) 후 rotateX(π)(부품 위·USB 뒤)로 크래들 안착. esp32는 **독립 레이어**(패널 행·localStorage).
- **부품별 스타일**: 8개 레이어(상판/PCB/하판/**ESP32**/스페이서/볼트/스위치/키캡) 각각 **visible·opacity·color** 독립 제어(`applyLayerStyle` — 기본색은 material.userData에 보존, color null=기본색 복귀). 두 프로젝트에 통합 적용.
- **영속화**: `split-keyboards:viewer-settings:v1` localStorage 키에 레이어 스타일 + 레퍼런스 토글 저장, 새로고침 유지. 파싱 실패·스키마 불일치 시 기본값 폴백.
- **CI 신설**: `.github/workflows/ci.yml` — bun install → typecheck → format:check → smoke×2 → export×3 → build.
- **React Compiler** 활성(babel-plugin-react-compiler) — useCallback/useMemo 금지 컨벤션 전제 충족.
- 검증: `tsc --noEmit` 0에러 · smoke 65/keypad **baseline byte-identical** · DXF 10+5장·STL 6장 재생성 동일 · `vite build`(rolldown) 통과 · prettier clean(.prettierignore에 dist/keycaps/keyswitch_model/raw/export-out/pcb 추가).

---

## 2. 뷰어

- `src/widgets/viewer/viewer-canvas.tsx`가 `PROJECTS = [65]`(keypad 제외) 각각 `createProject(invalidate)`로 씬 유닛을 받아 **x축으로 나란히**(GAP_BETWEEN 80) 배치하고, 전체 bounds를 담는 카메라를 설정한다.
- **부품별 컨트롤(§1.5)**: 활성 레이어(상판·PCB·하판·볼트·스위치·키캡 — 65 FDM 기준, 스페이서 없음) 각각 visible·color·opacity + 비교 토글(Zen 65·49·49 PCB, 기본 off) + STL Export(scale 지정). 전부 localStorage 영속. **keypad는 렌더에서 제외**(코드·export는 유지).
- 기본색: 케이스 흰색(FDM PCB는 녹색)·볼트/스페이서 은색·스위치 하우징 검정/스템 파랑. color null = 기본색.
- **키캡 렌더(`@renderer/models.ts buildKeycaps`)**: 캡을 **폭=`u`, 세로=`vSpan`** 으로 스케일(회전 안 함). `pickCap`이 행 프로파일(R1~R4) 내 **가장 가까운 폭의 캡**을 고름 → 가로 2u "0"은 R4 평면형(스페이스바 아님), 세로 2u(+·Enter)는 vSpan=2로 세로로 늘어남.

---

## 3. keypad (현재 집중 대상)

19키 넘패드. 케이스는 **65 v3 구조 그대로**(일체형 상판+좌우 벽+M2 6볼트, 스택 18.1mm). 상세는 **`keypad/docs/PROCESS.md`**.

- 케이스 외곽 **86.2×105.25**(R1, cx 28.575·cy −38.1, 전 방향 여백 5). 사용자가 새 PCB/plate(19키, 세로2u 제거)를 제공해 raw 교체. 세로 스태빌이 없어져 우변중점 M2홀 충돌이 사라져 여백을 원래 5로 복원(이전 세로2u 레이아웃에선 좌우 7로 늘려 회피했었음). 65는 가로 스태빌만이라 원래부터 충돌 없음.
- 키 구성: 5행 19키. 우측 열 전부 1u(세로 2u 없음), 가로 2u **0**(`u:2`) 1개; 스태빌 2패드(가로, rot 0). 컷아웃 **13.75**(raw 기본; 65는 13.95).
- 산출: `bun run export:keypad` → `keypad/export-out/main-*.dxf` 5장.
- **PCB 발주본 `keypad/pcb`**(raw 복사·KiCad): Edge.Cuts 외곽 86.2×105.25·M2홀 6(Ø2.4 NPTH+키프아웃 Ø5)·다이오드 19 **손납땜 구멍만**(PCB는 외형·라벨 제거한 THT 구멍 + net 유지, 스키마틱은 심볼 삭제; 1N4148 직접 손납땜) 적용. 컨트롤러 **ESP32-S3-SuperMini 풋프린트 받음**(`keypad/docs/utils`) → PCB 추가 보류(스키마틱 배선→Update PCB 정석). 잔여: ROW 매트릭스 라우팅·솔더식 스위치. 좌표·재현은 `keypad/docs/pcb-requirements.md`·`docs/reference/1n4148-diode.md`·`keypad/docs/utils`.

---

## 4. split-65 케이스 설계 (확정 v3)

**stacked 적층, 위→아래** — PCB 제외 전부 cast 아크릴(CNC):

| 레이어               |  두께  | Z 범위(PCB상면=0) | 역할                                                                                                                                                   |
| -------------------- | :----: | :---------------: | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 🟡🔵 **일체형 상판** | 6.5 mm |   +3.5 ~ +10.0    | 베젤(5.0, +5.0~+10.0) + 보강판(1.5, +3.5~+5.0)을 **간격0 본딩**한 1유닛. 베젤=키 실루엣 개구부(솔리드, 마운트홀 0), 보강판=스위치 컷 13.95 + 인서트 홀 |
| (좌우 벽)            | 3.5 mm |     0 ~ +3.5      | 에어갭 벽(보강판↔PCB). 좌·우만, 앞뒤 개방                                                                                                              |
| 🟢 PCB               | 1.6 mm |     0 ~ −1.6      | 사용자 제작(핫스왑, 흰색 솔더마스크)                                                                                                                   |
| (좌우 벽)            | 5.0 mm |    −1.6 ~ −6.6    | 바텀갭 벽(PCB↔하판). 좌·우만                                                                                                                           |
| ⚫ 하판              | 1.5 mm |    −6.6 ~ −8.1    | 평판. 볼트 클리어런스 홀(Ø2.4)                                                                                                                         |

- **결착 = M2 관통 볼트(하단 진입)**: 마운트 6곳/측(코너4+좌우 변중점2)마다 M2 볼트가 하판 밑→위로 관통(bottom→벽5.0→PCB→벽3.5→일체형 상판)해 보강판의 **플랜지형 M2 인서트**에 체결. 베젤 윗면=무홀(솔리드), 하단 머리는 고무발 은닉.
- **간격재 = 좌·우 아크릴 벽 2개/갭**(에어갭 3.5 / 바텀갭 5.0): 앞·뒤 개방, 벽이 클램프 하중을 받음. 필드의 plate↔PCB 3.5는 스위치가 span.
- 케이스 외곽 좌 **143.35×105.25** / 우 **162.4×105.25**, 스택 **18.1mm**.

상세·이력: `acknowledge/fastening-stacked-redesign.md`(§9 v3), `acknowledge/case-construction.md`(§13).

### 4.1 확정 파라미터 (= `65/config/dimensions.js`, SSOT)

| 상수                                      | 65 값                            | keypad 값 | 비고                                                                                                  |
| ----------------------------------------- | -------------------------------- | --------- | ----------------------------------------------------------------------------------------------------- |
| KEY_PITCH                                 | 19.05                            | 19.05     | 1u                                                                                                    |
| SWITCH_CUTOUT                             | **13.95**                        | **13.75** | 65=geekhack 레이저 snug / keypad=KLE-NG 기본. CNC면 kerf 무관, 실측 끼움으로 확정                     |
| STAB_PAD                                  | 6.75×14.75 r0.5                  | 동일      | keypad는 rot 적용                                                                                     |
| PLATE / TOP_FRAME / BOTTOM                | 1.5 / 5.0 / 1.5                  | 동일      | 베젤 5.0(상단 z +10.0)                                                                                |
| PCB_THICKNESS                             | 1.6                              | 1.6       |                                                                                                       |
| LATERAL_CLEARANCE                         | 1.25                             | 1.25      | 키캡↔개구부                                                                                           |
| CASE_MARGIN                               | 5                                | 5         | 외곽 = 키 bbox + 5 (keypad 새 19키 레이아웃은 세로 스태빌 없어 충돌 없음)                             |
| KEYCAP_GAP                                | 1.05                             | 1.05      |                                                                                                       |
| OUTLINE_RADIUS                            | 1                                | 1         |                                                                                                       |
| MOUNT_HOLE_DIAMETER                       | 2.4                              | 2.4       | M2 클리어런스. 베젤은 무홀                                                                            |
| MOUNT_HOLE_INSET_FROM_EDGE                | 2.5                              | 2.5       | inset = CASE_MARGIN−2.5 = 2.5                                                                         |
| PLATE_BOTTOM_TO_PCB_TOP / BOTTOM_GAP      | 3.5 / **3.5**                    | 3.5 / 5.0 | 에어갭 / 바텀갭. **65는 틸트 도입으로 3.5 확정**(앞행 기준, §4.2 — 8.0 검토 후 축소). keypad 5.0 유지 |
| TILT_DEG / TILT_PIVOT_Y (65 FDM)          | **7.5°** / −76.2 (스페이스바 행) | 없음      | §4.2. `tiltRise(y)`·`tiltY(y)` 파생                                                                   |
| PCB_MOUNT_HOLE_FDM / PLATE_NECK_CLEARANCE | **5.4** / **3.4**                | 없음      | 틸트로 확대(구 5.0/3.2): 기운 판을 수직 핀이 관통(4.8/cos7.5+1.6·tan7.5≈5.05)                         |
| KEYCAP_BOTTOM_Z                           | plateTop+4.3=9.3                 | 동일      | 뷰어 키캡 base                                                                                        |

부품-로컬 상수: `top-frame.js` GAP_FILLET 1.0·ARC_SEGMENTS 8; `spacer.js` WALL_WIDTH 6; project `MODEL_DIMS.switchStemTopZ = Z.plateTop+8.5(=13.5)`; `case-meshes.js` 볼트 샤프트 r1.0·머리 r2.2·인서트 r1.6.

미사용 상수(참고): `MOUNT_KEEPOUT_DIAMETER`(5), `KEYCAP_BOTTOM_SIZE`(18), `Z.stemTop`/`PLATE_TOP_TO_STEM_TOP`. `@jscad/stl-serializer`는 `export-fdm.js`가 사용.

### 4.2 65 FDM 변형 — 7.5° 틸트 (현재 제작 경로, 2026-07-07)

> 정본: `65/docs/fdm-m1-case.md`. 배경·결정 이력: `acknowledge/typing-tilt-redesign.md` §7. 코드: `65/parts/case-fdm.js`·`config/dimensions.js`.

- **틸트 방식(A안, 사용자 스케치 확정)**: 하판 base는 **평평**(베드/책상 접지), 그 위 **지지 기둥·보스가 앞 짧고 뒤 길게**(수직 유지, 길이만 가변) → 기둥 꼭대기들이 7.5° 경사 평면을 이루고, **PCB·plate·베젤·키캡이 그 위에서 통째로 7.5° 기움**. 기둥 자체를 기울이는 방식 아님(기둥·볼트는 항상 수직).
- **피벗 = 스페이스바 행(y −76.2)**, 그 지점 바텀갭(PCB↔하판) = **3.5mm**. 갭은 뒤로 갈수록 쐐기: 맨위열 ~13.5, 케이스 뒷변 ~17.4. 앞행 핫스왑 소켓(1.8) 여유 1.7mm OK.
- **파생 유틸**(`dimensions.js`): `tiltRise(y) = (y−pivot)·sin7.5°`(상승량), `tiltY(y) = pivot+(y−pivot)·cos7.5°`(기울며 당겨지는 홀의 투영 XY — 수직 기둥·보스·나사 배치용).
- **기하 정합 3종**(겹침 버그 수정): ① 기둥·보스·인서트포켓·나사홀 XY = `tiltY` 보정 위치(무보정 시 PCB 홀과 어긋나 관통). ② 받침면(보스 top·칼라 밑/top·넥 끝)은 수평이 아니라 **7.5° 경사면 컷**(`above/belowTiltPlane`, `tiltGeom` 재사용) — PCB·plate와 면접촉. ③ 기운 판을 수직 핀이 지나는 관통홀 확대: PCB Ø5.0→**5.4**, plate 넥 클리어런스 Ø3.2→**3.4**.
- **PCB 외곽 = 케이스 파츠와 동일 `fdmOutline`**(caseOutline + FDM_MARGIN_EXTRA 1.5/변): 좌 **146.35×108.25** / 우 **165.40×108.25**. 홀 중심↔가장자리 4.0 > 칼라 r2.9·보스 r3.3(구 caseOutline 시절엔 2.5라 칼라가 PCB 밖으로 삐져나왔음). **PCB 드로잉 시 홀 좌표는 `SIDES[k].mountHoles` 원본 그대로**(PCB는 강체 — `tiltY`는 조립 공간 위치일 뿐 보드 로컬 좌표 아님).
- **비교 레퍼런스**: Zen 65 실측 반영(`reference-keyboard.js`) — 315×112, 옆면 앞 17.9 / 뒤 36(키캡 윗면 envelope), 틸트 9.18°. 케이스 바디 = envelope − 키캡높이 9.4. "Zen 높이만큼 허용" 판단의 비교 기준.
- **검증**: `smoke:65`·`export:65-fdm`(STL 6장, A1 mini 베드 내)·`vite build` 통과. 뷰어 육안 검증은 사용자 진행.
- **ESP32-C3 SuperMini 크래들(2026-07-07)**: 하판 뒤쪽 가장자리에 **슬라이드 크래들** 일체 프린트(`buildEsp32Cradle3D`, 상수 `ESP32_CRADLE`) — L자 레일 2개(립 0.5, 슬롯폭 18.3=보드18+0.3, 슬롯높이 1.8) + 앞 스톱벽 1.8, 레일높이 2.8. 모듈(22.52×18, 단면실장·바닥 평평, 데이터시트 `65/raw/`)을 **와이어 선납땜 후** 뒤에서 슬라이드 삽입(립 0.5는 핀홀 패드 밖 가장자리만 잡음 — 납땜 봉우리 비간섭, 슬롯 1.8 여유), 뒤끝 케이스 뒷변 플러시 → **USB-C가 개방부로 노출**. 그 지점 바텀갭 ~15mm ≫ 스택 ~6mm. J1 와이어 패드(pcb-build §7) 직하부라 배선 최단. 무서포트(립 브리지 0.8). 주의: 안테나가 앞끝(케이스 내부) — BLE 감도 실측 확인. **뷰어에 실물 모델 렌더**: SnapEDA STEP→kicad-cli 더미보드 트릭으로 GLB 변환(`assets/models/esp32-c3.glb`, 18×22.7×5.3), `65/viewer/esp32-model.ts`가 크래들 슬롯에 안착(하판 레이어 소속 — 토글·투명도 연동).
- **미결**: ① ~~plate STL 틸트 export~~ → **해결(2026-07-07)**: `untiltGeom`(−7.5° 역회전)으로 CLI export에서 평판(1.5mm) 복원. ② ~~top 파츠 배향~~ → **해결(2026-07-10, `ebfd2b5`)**: CLI·웹 export 양쪽 top에 `untiltGeom` 적용(untilt→flip 순) — 베젤 면 전체 베드 밀착(접촉 146.3×0.8 → 146.4×108.2), 기둥이 7.5° 기운 채 서는 무서포트 자세. 뷰어는 틸트 유지. `docs/bug/2026-07-10-top-stl-tilt-export.md`. ③ 배터리(AAA Ø10.5는 갭 3.5에 불가 — 무선화 시 LiPo 파우치 방향, 갭 재검토).
- **출력 마감 결정(2026-07-07, 사용자)**: **서포트 0 유지**(3파츠 전부 평평면 베드 배향 — 서포트 자국이 더 나쁨). textured PEI 무늬가 베드면에 전사되는 문제(특히 top 뒤집기라 **베젤 상면=베드면**)는 스무스 플레이트 구매 대신 **사포 후처리**(400→800→1000 물사포)로 확정. 1/5 검증 출력에선 무관. 윗면은 슬라이서 ironing, 측면은 레이어 0.12~0.15 + seam aligned.
- **검증 출력 확정(2026-07-07, 사용자)**: A1 mini에서 **1/5 스케일(SCALE=0.2)**로 끼움·조립 선검증(`export:65-fdm-mini`를 0.2로 변경). 1/5에서 가능: 기둥(Ø0.96)→보스 삽입, plate 안착, 틸트·비율. 불가: M1 포켓(Ø0.35), 실스위치 끼움, mock-pcb 0.32mm는 1~2레이어라 휨 주의.

---

## 5. 실행

```bash
bun install
bun run dev          # React 뷰어 (기본 5173). 65+keypad 한 화면 동시
bun run typecheck    # tsc --noEmit
bun run export:65    # 65 DXF 10장 → 65/export-out/ (측당 5: bezel/plate/bottom/spacer-airgap/spacer-bottomgap)
bun run export:65-fdm      # 65 FDM STL 6장 → 65/export-out/fdm/ (측당 3: top/plate/bottom, 7.5° 틸트)
bun run export:65-fdm-mini # 1/5(SCALE=0.2) 검증 모형 → 65/export-out/fdm-mini/ (끼움·조립 검증용, 사용자 결정)
bun run export:keypad# keypad DXF 5장 → keypad/export-out/
bun run smoke:65     # 65 부품·치수 콘솔 검증
bun run smoke:keypad # keypad 부품·치수 콘솔 검증
bun run build        # 뷰어 빌드(vite → dist). import/alias 검증 게이트
bun run format       # prettier (no-semi·4칸·single-quote)
```

`export-out/`·`dist/`는 `.gitignore`. raw 생성물은 `.prettierignore`(`**/raw/`).

---

## 6. Phase 상태 (브랜치 v0.0.1)

- [x] **Phase 1** — monorepo 재편 + 버저닝 + keypad 스캐폴딩 (`dab7ef3`). 65 동작 동일(export 10장 byte-identical).
- [x] **Phase 2** — keypad 뷰어 실렌더(parts 복사·plate rot·top-frame vSpan) (`dd7754f`).
- [x] **Phase 3** — keypad DXF export 5장 + scripts (`690f2bf`).
- [x] **Phase 4(준비)** — keypad PCB 점검 + 발주 스펙·BOM·검증 체크리스트 (`9bad7a6`).
- [x] **뷰어 통합 렌더**(드롭다운 제거, 65+keypad 동시) (`b1bb12e`) + **세로 2U 키캡 height 스트레치 수정** (`cbf2487`).
- [x] **Phase 4(PCB, 미커밋)** — keypad 새 PCB/plate(19키, 세로2u 제거) raw 교체. `keypad/pcb` 발주본: Edge.Cuts 외곽 86.2·M2홀(Ø2.4 NPTH+키프아웃)·다이오드 19 **1N4148 DO-35 THT**(PCB+스키마틱). 세로 스태빌 없어 여백 5(DRC hole_to_hole 0). 65는 원래 충돌 없어 미변경.
- [ ] **Phase 4(실행, 사용자)** — keypad PCB 핫스왑/컨트롤러·ROW 매트릭스 라우팅 반영 → CNC/PCB 발주 → 실물 조립·검증(`keypad/docs/quality-assurance.md`).
- [x] **65 PCB** — raw(kbplacer) 가공→핫스왑·DO-35·Ø5.4×6·JLC룰→사용자 라우팅 완결(DRC 0·미연결 0)→ESP32-C3(J1 와이어패드+하판 크래들) 통합(`192ec67`) → JLCPCB 거버·드릴 생성 + 발주 사양 확정(`d4d1fd3`, `65/pcb/order/jlcpcb-*.zip`). **JLC 업로드·발주만 남음.** 정본 `65/docs/pcb-build.md`.
- [ ] **Phase 5** — keypad 실물 검증값(컷아웃 끼움·볼트 길이·벽 강성) → split-65 반영 후 65 발주(케이스 1/5 선검증 + PCB 거버).
- [~] 65 전용 design docs의 `65/docs/` 재배치는 cross-reference 보존 위해 보류(루트 `docs/`가 65 design 문서 보유, umbrella 겸).

남은 사용자 작업: 65 PCB JLC 발주(거버 zip 생성 완료) / 케이스 1/5→1:1 출력 검증 / keypad PCB(ROW 라우팅·컨트롤러) / 부자재 구매. 컨트롤러 = **ESP32-C3 SuperMini 확정**(양측 각 1, 하판 크래들 + J1 와이어, 무선-BLE).

---

## 7. 핵심 결정 이력 (요약)

- 설계 진화: H빔 일체 → 스페이서 샌드위치 → 보강판 둘레벽 → 열간 인서트(폐기, 아크릴 크랙) → v2 관통볼트 클램프(M3, 2겹 카운터보어) → **v3 일체형 상판 + M2 하단진입 + 좌우 벽**(현재). 상세 `acknowledge/fastening-stacked-redesign.md`.
- 재질: PCB 제외 전부 아크릴 → export를 레이어별 DXF로.
- monorepo 재편(2026-06-27): 공유 렌더러 + 65/keypad 독립. keypad-first 저손실 검증. 뷰어는 한 화면 동시 렌더로 정착(드롭다운안 폐기).
- 키캡 세로 2U: 회전 대신 **height(세로) 스트레치**(vSpan)로 결정.
- 65 FDM 전환 + M1 기둥 체결(`fdm-m1-case.md`): 아크릴 DXF 경로 보존, 실제 제작은 A1 mini FDM STL.
- **틸트 재도입(2026-07-07)**: 6° 틸트는 아크릴 시절 "케이스 비대"로 폐기했었으나, FDM + "Zen 65 높이(뒤 36mm)까지 허용" 기준으로 **7.5° 채택**(A안 — 하판 평평 + 기둥 가변높이, 앞행 갭 3.5). AAA 배터리 수납 검토(갭 8.0)는 AAA Ø10.5 불가로 철회. → §4.2, `typing-tilt-redesign.md` §7.

---

## 8. 검증 상태

- `smoke:65`·`smoke:keypad` 통과. `export:65`(10장)·`export:keypad`(5장)·`export:65-fdm`(STL 6장) 생성. `vite build`·`prettier --check` 통과.
- **top STL 베드 밀착 검증(2026-07-10)**: z 0~0.1 슬랩 교집합 footprint — untilt 수정 전 146.3×0.8(모서리 띠) → 수정 후 146.4×108.2(베젤 면 전체). `typecheck`·`format:check`·`smoke:65`·`export:65-fdm` 재통과.
- 뷰어 육안: 65(좌+우)+keypad 한 화면 동시 렌더 확인(2026-06-27). 틸트(7.5°) 적용 후 육안 검증은 **사용자가 직접 진행**(기둥-PCB 겹침 1건 발견→수정 완료, 이후 재확인 사용자 몫).

---

## 9. docs/ 지도

| 경로                                                                     | 내용                                                 |
| ------------------------------------------------------------------------ | ---------------------------------------------------- |
| `docs/PROCESS.md`                                                        | (이 문서) monorepo 단일 출처                         |
| `docs/acknowledge/monorepo-keypad-migration.md`                          | 재편 계획·이동 매핑·Phase                            |
| `docs/acknowledge/fastening-stacked-redesign.md`                         | 65 결착 설계 진화·확정(v3 §9)                        |
| `docs/acknowledge/case-construction.md`                                  | 65 케이스 구조(§13 현재)                             |
| `docs/acknowledge/pcb-outline-requirements.md`                           | 65 PCB 요구사항                                      |
| `docs/acknowledge/bom-aliexpress.md`                                     | 65 구매 목록                                         |
| `docs/acknowledge/render-export-workflow.md`                             | 뷰어/렌더/export 작업 방식                           |
| `docs/acknowledge/open-questions.md`                                     | 미해결                                               |
| `docs/acknowledge/typing-tilt-redesign.md`                               | 틸트 검토(6° 폐기)→**7.5° FDM 재도입**(§7) 결정 이력 |
| `docs/bug/2026-07-10-top-stl-tilt-export.md`                             | top STL 틸트 export 버그(증상·원인·해결·검증)        |
| `65/docs/fdm-m1-case.md`                                                 | **65 FDM(A1 mini) + M1 + 7.5° 틸트 정본**            |
| `docs/memory/cherry-mx-dimensions.md` · `reference/cherry-mx-sources.md` | Cherry MX 표준(공유)                                 |
| `docs/memory/project-overview.md`                                        | 원본 생성물(KLE-NG/kbplacer)                         |
| `docs/history/2026-06-21-*`                                              | 초기 구현·인서트안(폐기) 이력                        |
| `keypad/docs/PROCESS.md`                                                 | **keypad 프로젝트 단일 출처**                        |
| `keypad/docs/pcb-requirements.md` · `bom.md` · `quality-assurance.md`    | keypad 발주 스펙·구매·검증                           |
| `CHANGELOG.md`                                                           | 버전별 변경(0.0.1~)                                  |
