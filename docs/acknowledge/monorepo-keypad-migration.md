# Monorepo 재편 + keypad 우선 도입 — 마이그레이션 계획

> 작성: 2026-06-27. 상태: **계획 확정·실행 대기**(사용자 승인 후 Phase 1 착수).
> 목적: split-65를 바로 출력/PCB 발주하기엔 손실이 크므로, **저손실 prototype인 split-keypad(17키 단일 플레이트)** 부터 검증한다. 이를 위해 저장소를 **공유 렌더러 + 프로젝트별(65 / keypad) 독립 구조**로 재편한다.

---

## 0. 확정된 결정 (사용자 선택)

| #   | 결정 항목                                             | 선택                                                                                            |
| --- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 1   | 폴더 구조                                             | **`src/renderer` 공유 + 루트 `65/` + `keypad/`**                                                |
| 2   | 케이스 지오메트리(parts·case-meshes·export) 공유 방식 | **프로젝트별 복사 — 완전 독립** (keypad는 65를 복사 후 자유 변형)                               |
| 3   | vite 뷰어 진입                                        | 초기안: 한 뷰어 + 드롭다운 → **확정: 65+keypad 한 화면 동시 렌더**(드롭다운 폐기, `b1bb12e`)    |
| 4   | 1차 작업 범위                                         | **구조 재편 + keypad 설정(config/layout) 스캐폴딩까지** (keypad 렌더·케이스·export는 다음 단계) |

추가 기본값(이의 없으면 적용):

- **git**: `v3`에서 분기한 새 브랜치(`refactor/monorepo-keypad`)에서 작업. 추적 파일은 `git mv`로 이력 보존. **사용자 요청 전 커밋·푸시 없음.**
- **docs**: 루트 `docs/`는 umbrella + 공유(Cherry MX) 유지, 65 전용 문서는 `65/docs/`로 이동, keypad는 `keypad/docs/` 신설.

---

## 1. split-keypad 사실 (raw 분석)

- KLE-NG 생성 단일 플레이트, **17키 넘패드**. 형식은 65의 `left/right.jscad`와 동일.
- 플레이트 외곽 `roundedRectangle [80.9, 101.95] r1` @ `[28.575, -39.1]` → 65(좌 143.35 / 우 162.4)보다 훨씬 작음.
- 스위치 컷아웃 **13.75mm**(KLE-NG `cherry-mx-basic` 기본). ⚠️ 65는 튜닝값 **13.95mm** — keypad config에서 별도 결정.
- 스태빌라이저 패드 6.75×14.75 r0.5. 2u 키 3곳(세로 2u ×2: switch_7·14, 가로 2u "0": switch_15).
- PCB: KiCad 풀세트(`split-keycad-pcb/keyboard/keyboard.kicad_pcb` + footprints + svg) — 65 PCB보다 완성도 높음.
- 현재 `split-keypad/`는 git **untracked**.

---

## 2. 목표 구조

```
split-65/  (git repo root — 이름 유지)
├─ package.json · bun.lock · vite.config.js(alias 추가) · prettier.config.js
├─ .gitignore(수정) · .prettierignore
├─ index.html              ← 공유 셸 (드롭다운 + 캔버스)
├─ README.md               ← umbrella
├─ assets/models/{switch,keycap,reference-49}   ← 공유 publicDir (이동 없음)
├─ keycaps/ · keyswitch_model/                   ← 공유 에셋 소스 (gitignored, 이동 없음)
├─ src/
│   ├─ main.js             ← NEW 공유 셸: createViewer + 프로젝트 드롭다운 + 동적 import + 투명도
│   └─ renderer/           ← 공유 렌더러 ("vite renderer")
│       ├─ scene.js              (이동, 무수정)
│       ├─ jscad-to-three.js     (이동, 무수정)
│       ├─ instancing.js         (이동, 무수정)
│       └─ models.js             (이동 + 파라미터화: config import 제거)
├─ 65/
│   ├─ project.js          ← NEW: 기존 main.js의 씬 빌드/토글/레퍼런스/카메라 로직
│   ├─ config/{dimensions,layout}.js
│   ├─ parts/{shapes,plate,bottom-plate,top-frame,spacer}.js
│   ├─ viewer/{case-meshes,reference-49,reference-keyboard}.js
│   ├─ export/{export,smoke}.js
│   ├─ raw/{left.jscad,right.jscad,leftplate/,rightplate/,leftplate.zip,rightplate.zip}
│   ├─ export-out/         (gitignored, 재생성)
│   └─ docs/               (65 전용 문서 이동)
├─ keypad/
│   ├─ config/{dimensions,layout}.js   ← NEW (raw에서 유도)
│   ├─ raw/{split-keypad.jscad, split-keycad-pcb/}
│   ├─ docs/PROCESS.md                 ← NEW
│   └─ (parts/viewer/export/project.js = 다음 단계)
└─ docs/   (umbrella + 공유)
    ├─ PROCESS.md(umbrella) · acknowledge/monorepo-keypad-migration.md(이 문서)
    ├─ memory/cherry-mx-dimensions.md · reference/cherry-mx-sources.md (공유 유지)
```

---

## 3. 파일 이동 매핑 (전수)

### 3.1 공유 렌더러 → `src/renderer/`

| from                           | to                               | 수정                   |
| ------------------------------ | -------------------------------- | ---------------------- |
| `src/viewer/scene.js`          | `src/renderer/scene.js`          | 없음(내부 import 없음) |
| `src/viewer/jscad-to-three.js` | `src/renderer/jscad-to-three.js` | 없음                   |
| `src/viewer/instancing.js`     | `src/renderer/instancing.js`     | 없음                   |
| `src/viewer/models.js`         | `src/renderer/models.js`         | **파라미터화**(§4.1)   |

### 3.2 65 전용 → `65/`

| from                                   | to                                | import 재작성                                                   |
| -------------------------------------- | --------------------------------- | --------------------------------------------------------------- |
| `src/config/dimensions.js`             | `65/config/dimensions.js`         | 없음                                                            |
| `src/config/layout.js`                 | `65/config/layout.js`             | 없음(`./dimensions.js` 유지)                                    |
| `src/parts/*.js` (5개)                 | `65/parts/*.js`                   | 없음(`../config`·`./shapes` 상대경로 보존)                      |
| `src/viewer/case-meshes.js`            | `65/viewer/case-meshes.js`        | **`./jscad-to-three.js` → `@renderer/jscad-to-three.js`** (1줄) |
| `src/viewer/reference-49.js`           | `65/viewer/reference-49.js`       | 없음                                                            |
| `src/viewer/reference-keyboard.js`     | `65/viewer/reference-keyboard.js` | 없음                                                            |
| `src/export/export.js`                 | `65/export/export.js`             | 없음(`../config`·`../parts` 보존, **bun 실행이라 alias 불가**)  |
| `src/export/smoke.js`                  | `65/export/smoke.js`              | 없음                                                            |
| `src/main.js`                          | `65/project.js`                   | **셸 분리 리팩토링**(§4.2)                                      |
| `left.jscad` `right.jscad`             | `65/raw/`                         | `git mv`                                                        |
| `leftplate/` `rightplate/` (각 70파일) | `65/raw/`                         | `git mv`                                                        |
| `leftplate.zip` `rightplate.zip`       | `65/raw/`                         | `git mv`                                                        |

### 3.3 keypad → `keypad/`

| from                              | to                                                                                   |
| --------------------------------- | ------------------------------------------------------------------------------------ |
| `split-keypad/split-keypad.jscad` | `keypad/raw/split-keypad.jscad` (untracked → `mv` + `git add`)                       |
| `split-keypad/split-keycad-pcb/`  | `keypad/raw/split-keycad-pcb/`                                                       |
| (신규)                            | `keypad/config/dimensions.js` · `keypad/config/layout.js` · `keypad/docs/PROCESS.md` |

### 3.4 이동 없음 (공유·gitignore)

- `assets/` 전체 — vite `publicDir`. `/models/...` 절대경로가 유지되어야 하므로 그대로. (reference-49는 65 전용 용도지만 물리적으로 공유 static 루트에 둠)
- `keycaps/` `keyswitch_model/` — 별도 `.git` 보유 에셋 소스, gitignored.
- `export-out/` `dist/` — gitignored 빌드 산출물. 65 export는 `65/export-out/`로 재생성.
- `package.json` `bun.lock` `vite.config.js` `prettier.config.js` `README.md` `index.html` — 루트 공유.

### 3.5 docs 분할

- **루트 유지(umbrella·공유)**: `PROCESS.md`(umbrella로 재작성), `memory/cherry-mx-dimensions.md`, `reference/cherry-mx-sources.md`, 이 마이그레이션 문서.
- **`65/docs/`로 이동**: `acknowledge/*`(8개 설계 문서), `history/*`(3개), `memory/project-overview.md`, `assets/*.png`. 현 `PROCESS.md`의 65 상세 내용은 `65/docs/PROCESS.md`로 이관.

---

## 4. 필요한 코드 변경 (단 2곳)

### 4.1 `src/renderer/models.js` 파라미터화

config 결합 제거. 현재 `Z.plateTop`, `KEY_PITCH`, `KEYCAP_GAP`, `KEYCAP_BOTTOM_Z`에 의존.

- `import { Z, KEY_PITCH, KEYCAP_GAP, KEYCAP_BOTTOM_Z } from '../config/dimensions.js'` **삭제**.
- `SWITCH_STEM_TOP_Z` 상수(=`Z.plateTop + 8.5`) → 호출자가 주입하는 `dims.switchStemTopZ`로.
- 시그니처: `buildSwitches(side, dims)` · `buildKeycaps(side, dims)` where `dims = { keyPitch, keycapGap, keycapBottomZ, switchStemTopZ }`.
- 각 프로젝트 `project.js`가 자기 config에서 `dims`를 만들어 전달.

### 4.2 `src/main.js`(셸) + `65/project.js`(로직) 분리

- **`src/main.js`(공유 셸)**: 캔버스 취득 → `createViewer` → 프로젝트 드롭다운(65 / keypad) → 선택 시 `import('@65/project.js' | '@keypad/project.js')` 동적 로드 → `createProject({ viewer })` 호출 → 전환 시 이전 그룹 dispose. 투명도 슬라이더(범용)도 셸 소유 가능.
- **`65/project.js`**: `export const createProject = ({ viewer }) => {...}` — 기존 main.js의 `LAYER_TOGGLES`·`buildInstance`·Zen/49 레퍼런스·카메라·토글 UI를 그대로 담고, `buildSwitches/Keycaps` 호출 시 65 config로 만든 `dims` 전달. 정리용 핸들 반환.
- Phase 1에서는 keypad 드롭다운 항목 선택 시 "설정만 존재 — 렌더는 다음 단계" 안내(graceful stub). **65 동작은 기존과 100% 동일 보장.**

### 4.3 `vite.config.js` alias 추가

```
resolve: { alias: { '@renderer': '/src/renderer', '@65': '/65', '@keypad': '/keypad' } }
```

⚠️ alias는 **vite 번들 코드에만** 적용. `bun run export/smoke`(node 실행)는 alias 미적용 → 해당 스크립트는 **상대경로만** 사용(현재도 renderer 미참조라 무관).

### 4.4 `.gitignore` 수정

`export-out/` → `**/export-out/` (또는 `65/export-out/` `keypad/export-out/`). `assets/models/reference-49/pcb.stl` 경로 유지.

---

## 5. keypad config 스캐폴딩 (1차 산출)

`keypad/raw/split-keypad.jscad`에서 유도:

- `keypad/config/dimensions.js`: 65 dimensions를 베이스로 복사하되 keypad 값으로 — `SWITCH_CUTOUT`(13.75 vs 13.95 결정 필요), 케이스 스택/마진은 keypad 케이스 설계 시 확정(1차엔 65 기본값 차용 + TODO 표기).
- `keypad/config/layout.js`: raw의 17개 switch 좌표 + 3개 stab을 `SWITCHES`/`STABS` 배열로 옮기고, 65 layout.js의 `computeBbox/expandedRect/computeMountHoles` 패턴 재사용해 단일 `SIDE`(또는 `SIDES={main}`) 유도. 단일 플레이트이므로 좌/우 분리 없음.
- `keypad/docs/PROCESS.md`: keypad 프로젝트 상태 문서 신설.

⚠️ keypad의 `parts/viewer/export/project.js`는 **다음 단계**(범위 4 결정). 1차엔 config/layout/docs 골격만.

---

## 6. Phase 체크리스트

**Phase 1 — 구조 재편 + keypad 설정 (완료, 2026-06-27, 브랜치 `v0.0.1`)**

- [x] 1-0. `v0.0.1` 브랜치 생성(v3 기준) + 버저닝 시작(package.json 0.0.1 · CHANGELOG)
- [x] 1-1. `src/renderer/` + scene·jscad-to-three·instancing·models `git mv`(models 파라미터화)
- [x] 1-2. `65/` + config·parts·viewer·export `git mv`
- [x] 1-3. raw(`left/right.jscad`·`leftplate`·`rightplate`·zip) → `65/raw/` `git mv`
- [~] 1-4. 65 docs → `65/docs/`: **보류**(cross-reference 보존 위해 별도 단계, 루트 docs는 umbrella 유지)
- [x] 1-5. 코드 변경: models 파라미터화 / `src/main.js` 셸 + `65/project.js` / case-meshes import / vite alias / .gitignore
- [x] 1-6. `split-keypad/` → `keypad/raw/` 이동 + `git add`
- [x] 1-7. keypad config/layout/docs/project(stub) 스캐폴딩
- [x] 1-8. **검증**: `smoke:65` 통과 · `export:65` DXF 10장 byte-identical · `vite build` 통과 (`bun run dev` 육안은 사용자)
- [x] 1-9. PROCESS.md umbrella 갱신

**Phase 2 — keypad 뷰어 렌더 (완료, dd7754f)**: 65 parts 복사(plate rot 스태빌·top-frame vSpan)·case-meshes·project.js 단일 플레이트 실렌더. smoke·build 통과. (이후 `b1bb12e`에서 드롭다운 폐기 → 65와 한 화면 동시 렌더로 통합)
**Phase 3 — keypad DXF export (완료, 690f2bf)**: 케이스=65 v3 동일. `keypad/export` → DXF 5장 + scripts.
**Phase 4 — keypad PCB 검증·발주 (준비 완료 9bad7a6 / 실행은 사용자)**: PCB 상태 점검(Edge.Cuts 0·컨트롤러 0·솔더식) + 발주 스펙(`keypad/docs/pcb-requirements.md`·`bom.md`·`quality-assurance.md`). CNC/PCB 물리 발주·실물 조립은 사용자.
**Phase 5 — split-65 반영 (대기)**: keypad 실물 검증값(컷아웃 끼움·볼트 길이·벽 강성)을 65에 반영 후 65 발주. 물리 prototype 검증 후 진행.

---

## 7. 리스크 · 검증 · 롤백

| 리스크                            | 완화                                                                                              |
| --------------------------------- | ------------------------------------------------------------------------------------------------- |
| import 경로 누락으로 65 빌드 깨짐 | 폴더 미러링으로 상대경로 보존 → 재작성은 **case-meshes 1줄 + main.js**뿐. §3 매핑대로 grep 재검증 |
| bun 스크립트에서 alias 깨짐       | export/smoke는 renderer 미참조·상대경로만 → 영향 없음(설계상 분리)                                |
| models.js 파라미터화 회귀         | smoke/dev로 스위치·키캡 위치 육안+치수 검증                                                       |
| `git mv` 대량 이동 후 이력 추적   | 추적 파일만 `git mv`, untracked(`split-keypad`)는 `mv`+`add`                                      |
| assets 경로(`/models/...`) 깨짐   | assets는 이동 없음 → 절대경로 그대로                                                              |

**검증 기준**: Phase 1 후 65의 `smoke`/`export`/`dev`/`build` 결과가 재편 **이전과 동일**해야 통과(특히 export DXF 10장 바이트 동일).

**롤백**: 전 작업이 단일 브랜치 → `git checkout v3` 또는 브랜치 폐기로 즉시 원복.
