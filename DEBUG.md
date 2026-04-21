# DEBUG.md — JLC3DP 주문 후 메쉬 디버깅 세션 기록

다른 컴퓨터에서 이어서 작업하기 위한 스냅샷.
**상태**: JLC3DP SLA 주문 완료 상태에서, preview에 나타난 yellow/red 경고 추적 및 대응 중.

---

## 🎬 세션 시작점

"README.md 업데이트하라" 요청 이후부터의 작업 전부.

---

## 📝 1단계: README.md 업데이트 완료

기존 README는 BLE/무선 언급 등 구 설계 내용 많았음. 전면 재작성:
- 무선 관련 표현 제거 → USB-C 유선 전용
- 샌드위치 구조 ASCII art 추가
- PA12 self-tap vs SLA insert 변형 테이블
- Blender/KiCad 스타일 카메라 조작 명시
- `bun run export` 명령어 + admesh 자동 repair 언급
- 조립 순서 9단계
- 구조 트리 현재 파일에 맞게 갱신

파일: `README.md`

---

## 🚨 2단계: JLC3DP 파일 오류

**첫 업로드 시 발생한 에러**:
```
Bad edges detected
Near bad edges detected
Planar holes detected
```

plate STL은 OK. case-top / case-bottom STL (PA12 / SLA 모두)에서 발생.

**원인**: CSG boolean 연산 결과가 non-manifold edges / floating-point precision 이슈 / 미세한 coplanar artifacts 발생. JSCAD CSG의 한계.

---

## 🔧 3단계: 코드 레벨 메쉬 개선 시도

### 3.1 Pillar 아래로 관통 + 최종 Z=0 clip

Pillar가 floor와 Z=0에서 coincident face 공유하는 게 "bad edges" 원인 추정.

`src/models/case.ts`:
```ts
const plateMountPillars = (...) => {
    const overlap = 0.5  // 추가
    const pillars = positions.map(([xLocal, yLocal]) => {
        ...
        const height = zCaseTop + 2 + overlap
        return translate(
            [xLocal, yCase, height / 2 - overlap],  // Z 범위 [-overlap, zCaseTop+2]
            cylinder({ radius: r, height, segments: 32 }),
        )
    })
    ...
}
```

그리고 `buildCaseBottom`에서 최종 `intersect(bottom, sliceCuboid(0, 500))` 추가로 Z<0 삐져나온 부분 clip.

### 3.2 중간 retessellate 다중 호출

`buildCaseTop` / `buildCaseBottom` 내부 `union`/`subtract` 사이사이에 `retessellate` 추가:
```ts
bottom = retessellate(union(floor, pillars))
bottom = retessellate(subtract(bottom, pockets, throughs))
bottom = intersect(bottom, sliceCuboid(...))
return retessellate(bottom)
```

---

## 🔨 4단계: admesh 자동 repair 통합

사용자가 `brew install admesh` 완료. 자동 실행하도록 export 스크립트에 통합.

### 4.1 옵션 시행착오

**시도 1** (실패): `-u` = "fill holes"로 오해했으나 실제는 "remove unconnected" — option 이름 틀림.
```
admesh -u -f -t 0.001 -b output input
```

**시도 2** (실패): `--fix-all-connected` 같은 없는 option 사용 → `admesh: unrecognized option` 에러.

**시도 3 (최종)**: `admesh --help`로 정확한 이름 확인:
```
admesh -n -t 0.005 -i 5 -f -d -v -b output input
```
- `-n`: nearby facet 연결 (within tolerance)
- `-t 0.005 -i 5`: 5μm 톨러런스, 5 iterations (점진적 증가)
- `-f`: fill holes
- `-d`: fix normal directions
- `-v`: fix normal values

### 4.2 구현

`scripts/export.ts`:
```ts
import { spawnSync } from 'node:child_process'

const repairStlWithAdmesh = (stlPath: string) => {
    const tmpPath = `${stlPath}.tmp`
    try {
        const result = spawnSync('admesh', [
            '-n', '-t', '0.005', '-i', '5',
            '-f', '-d', '-v',
            '-b', tmpPath,
            stlPath,
        ], { encoding: 'utf8' })
        if (result.status === 0 && existsSync(tmpPath)) {
            renameSync(tmpPath, stlPath)
            // log size before/after
        }
    } catch (e) {
        // admesh 없어도 export는 정상 종료
    }
}
```

`writeStl()`에서 각 STL 생성 직후 `repairStlWithAdmesh(path)` 호출.

`try/catch`로 admesh 없어도 워크플로우 안 깨짐 (그냥 경고만 출력).

### 4.3 효과

각 STL 용량 증가 (hole fill + face 정리):
- `1_case-top.stl`: 141.9 → 145.2 KB
- `2_case-bottom.stl`: 213.8 → 230.2 KB (segments 48일 때) / 183.5 → 203.6 KB (segments 32일 때)
- `1_case-top_SLA.stl`: 141.9 → 145.2 KB
- `2_case-bottom_SLA.stl`: 216.8 → 233.5 KB (48) / 183.5 → 203.6 KB (32)

---

## 📸 5단계: JLC preview 재검토 (admesh 적용 후)

admesh 적용 후에도 preview에 여전히 yellow/red 영역 남음. 사용자가 이미지 4장 공유:

### Image 17 — TOP-SLA, 옆벽 4개 보스 주변 노란 삼각형
- 위치: 상판 내부 옆벽에 있는 체결 보스(6×6×8mm)의 insert pocket(Ø3.6) 주변
- 원인: 보스 cap(8−7=1mm)이 pocket ceiling 근처에 생긴 얇은 평면
- **판정: 인쇄 정상**, JLC가 보수적으로 flagging

### Image 18 — BOTTOM-SLA, 기둥 4개에 빨간 세로줄 🔴
- 위치: 기둥 측면 (Ø6 vertical cylinder)
- **원인 1**: Cylinder segments 48 → 각 face 폭 = 6π/48 ≈ **0.39mm** → SLA 얇은 feature 임계값 근처
- **원인 2 (핵심)**: **Tilted pocket 편심** — pocket 축이 plate tilt 8° 따라감. 7mm 깊이 × sin(8°) = **0.97mm drift**. 기둥 Ø6 내에서 pocket Ø3.6이 밀려나 wall이 가장 얇은 지점에서:
  ```
  wall_thin = (6-3.6)/2 - 0.97 = 1.2 - 0.97 = 0.23mm
  ```
- **판정**: **실제로 얇음**. SLA 자체는 0.23mm 인쇄 가능하지만 황동 insert 열압입 시 **crack 가능성**.

### Image 19 — BOTTOM 바닥면 아래쪽, 수평 노란 스트라이프
- 위치: case-bottom 밑면에 긴 수평 라인 2개 (기둥 연결하는 형태)
- **원인**: `retessellate`가 큰 평면 merge → STL 출력 시 fan triangulation → 기둥 정점 사이로 long thin triangles 생성
- **판정: 인쇄 정상**, 메쉬 시각화 artifact

### Image 20 — BOTTOM 바닥 X 대각선 노랑
- 위치: 바닥 평면 전체를 대각선 2개로 분할한 삼각형들
- **원인**: 275×86mm 평면이 retessellate 후 2-4개 거대 삼각형으로 분할됨. JLC가 "unusually large" flagging.
- **판정: 인쇄 정상**

---

## 🛠 6단계: 추가 수정

### 6.1 Cylinder segments 감소 48 → 32

`src/models/case.ts`:
```ts
// plateMountPillars 등
segments: 32  // was 48
```

변경 효과:
- Ø6 기둥 face 폭: 0.39 → **0.59mm** (얇은 feature flagging 완화)
- Bottom STL 용량: 213 → **183KB**

### 6.2 SLA_CASE_PARAMS 유지

`plateMountPostRadius: 3.0` 유지 (Ø6). Ø7 이상 키우려 했으나 하부 cavity(caseMarginBack=2, wallT=2)에 안 들어감 → caseMargin 확장 필요 → 케이스 커짐 → 주문 다시 해야.

현재 주문 이미 나간 상태이므로, **segments 감소만 적용**. 근본 해결은 차기 재주문시.

---

## 📋 현재 상태 (세션 종료 시점)

### 주문 상태
- JLC3DP에 `1_case-top_SLA.stl`, `2_case-bottom_SLA.stl` + `keyboard-plate.stl` 업로드 완료
- SLA Resin + Threaded Insert M3*4*5 × 8 (각 파일 4개)
- Preview 경고: yellow 다수, red 일부 (기둥 측면)
- **배송 대기 중**

### 코드 상태
- `DEFAULT_CASE_PARAMS`: PA12 self-tap용 (Ø5 기둥, Ø2.5 pilot)
- `SLA_CASE_PARAMS`: SLA insert용 (Ø6 기둥, Ø3.6 × 7mm pocket)
- Cylinder segments: 모두 32 (일관)
- `bun run export`: STL 생성 → admesh 자동 repair → 완료
- `scripts/generate-spec.ts`: SVG + PNG 참조 도면 자동 생성 (부품별 2개)

### 파일
```
docs/export/
├── 1_case-top.stl              (PA12 self-tap)
├── 2_case-bottom.stl           (PA12 self-tap)
├── 1_case-top_SLA.stl          (SLA insert, 주문본)
├── 2_case-bottom_SLA.stl       (SLA insert, 주문본)
├── insert-spec-case-top.svg/png
└── insert-spec-case-bottom.svg/png
```

---

## ⏭ 다음 단계 (배송 이후)

### Scenario A: 프린트 성공, 인서트 정상
- 조립 진행 (README 참조)

### Scenario B: 기둥 insert 설치 시 crack
**근본 원인**: Tilted pocket 편심에 의한 얇은 wall (0.23mm)

**Option 1 (추천)**: 기둥 Ø8 + caseMargin 확장
```ts
// src/models/case.ts
export const SLA_CASE_PARAMS: CaseParams = {
    ...DEFAULT_CASE_PARAMS,
    caseMarginBack: 4,         // was 2
    caseMarginFront: 4,        // 대칭 유지 원하면
    plateMountPostRadius: 4,   // Ø8, was 3
    plateMountInsertRadius: 1.8,
    plateMountInsertDepth: 7.0,
    sideFastenerInsertRadius: 1.8,
    sideFastenerInsertDepth: 7.0,
    sideFastenerHeight: 8.0,
}
```
- Wall at drift 지점: (8-3.6)/2 - 0.97 = **1.23mm** ✓
- 단점: 케이스 4mm 커짐

**Option 2**: 수직 pocket + plate 홀 Ø3.2 재생성
- `plateMountInsertPockets` 를 tilt 안 적용되게 수정
- 기둥 Ø6 유지, wall 1.2mm 일정 ✓
- **필요**: KLE-NG에서 plate hole radius 1.6 (Ø3.2)로 재생성
- 사용자가 plate 재주문해야 함

**Option 3**: 짧은 insert (M3*4*3, hole Ø3.6 × 5mm)
- Drift = 5 × sin(8°) = 0.70mm
- Wall: 1.2 - 0.70 = **0.50mm** — 여전히 경계

---

## 🔗 참고 링크

- JLC3DP: https://jlc3dp.com (SLA + Threaded Insert M3*4*5 선택)
- netfabb online repair: https://service.netfabb.com/ (백업 수단)
- admesh 매뉴얼: `admesh --help`

---

## 🎯 TL;DR

1. README.md 최신 설계 반영 완료
2. JLC 업로드시 "Bad edges" 에러 → `admesh -n -t 0.005 -i 5 -f -d -v` 자동 통합으로 해결
3. 이후 preview에 yellow/red 잔존 — yellow는 정보성 경고, red는 SLA 기둥 tilted pocket 편심으로 인한 얇은 wall (0.23mm)
4. **SLA 완전 포기 결정** — JLC 최소 wall 0.8mm 규격에 SLA tilted pocket 구조가 못 맞춤
5. **PA12 SLS 확정**: self-tap Ø2.5 pilot이라 drift 0.56mm만, 기둥 Ø6으로 올려 wall 1.19mm 확보
6. SLA 로직 전부 제거 (SLA_CASE_PARAMS, viewer 토글, insert-spec, @resvg/resvg-js 의존성 삭제)
7. JLC 재주문: `1_case-top.stl` + `2_case-bottom.stl`, **MJF PA12 또는 SLS PA12**, insert 없음

---

## 🧹 7단계: SLA 완전 제거 + PA12 기둥 강화

### 7.1 PA12 기둥 Ø5 → Ø6

`src/models/case.ts` DEFAULT_CASE_PARAMS:
```ts
plateMountPostRadius: 3.0,   // was 2.5 (Ø5 → Ø6)
```

Wall 계산:
- Pocket drift = 4 × sin(8°) = 0.557mm
- Wall 최소 = (6-2.5)/2 - 0.557 = **1.19mm** ✓ (JLC 최소 0.8mm 초과)

기둥 Ø6이 기존 caseMargin=2 cavity에 정확히 맞음 (case 크기 변화 없음).

### 7.2 SLA 관련 전부 제거

제거된 것:
- `src/models/case.ts`: `SLA_CASE_PARAMS` export 제거
- `src/models/build-solids.ts`: `SLA_CASE_PARAMS` import, `sla` visibility 토글 제거
- `src/components/controls.tsx`: SLA checkbox 제거
- `src/app.tsx`: `sla: false` 초기 상태 제거
- `scripts/export.ts`: SLA STL 생성 제거, insert-spec 호출 제거
- `scripts/generate-spec.ts`: 파일 삭제
- `@resvg/resvg-js`: npm 의존성 제거
- `docs/export/`: SLA STL, insert-spec SVG/PNG/MD 전부 삭제

### 7.3 현재 export 출력

```
docs/export/
├── 1_case-top.stl          (145KB, admesh 적용됨)
└── 2_case-bottom.stl       (199KB, admesh 적용됨)
```

JLC 재주문 옵션:
- Material: **MJF PA12** 또는 **SLS PA12 Nylon (3201PA-F)**
- Surface finish: 없음
- Insert: 없음 (self-tap 직접)
- Tolerance: ±0.2mm

---

## 🎯 최종 TL;DR

1. SLA는 tilted pocket 구조상 JLC 규격(wall ≥ 0.8mm) 못 맞춤 → **포기**
2. **PA12 SLS**로 변경, self-tap 방식 채택, 기둥 Ø6으로 승격 (wall 1.19mm)
3. SLA 관련 코드/파일/의존성 전부 제거 (단일 PA12 파이프라인)
4. `1_case-top.stl` (145KB) + `2_case-bottom.stl` (199KB) 두 파일만 JLC에 업로드
5. 이전 SLA 주문 **취소 후 PA12 재주문** 예정

---

## 💻 다른 PC에서 이어서 시작

```bash
git pull
bun install
brew install admesh      # (Mac 전용, 없으면 스킵 가능)

bun run dev              # 뷰어로 형상 확인
bun scripts/verify.ts    # 치수/alignment 재검증
bun run export           # STL + spec 재생성 (admesh 포함)
```

`context.md`와 `DEBUG.md` 읽고 현재 상태 파악.
`src/models/case.ts`의 `SLA_CASE_PARAMS` 부분이 위 Option 1/2/3 수정 지점.
