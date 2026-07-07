# 작업 방식 — three.js 실시간 렌더 + Export

> 작업 시작 시 적용할 합의 사항. JSCAD를 편집하며 **three.js로 실시간 3D 렌더**해 케이스 형상을 보면서 진행한다.

> ## ⚠️ 현재 구현 상태 (2026-06-27, monorepo)
>
> - **구조**: monorepo — 공유 렌더러 `src/renderer/`(scene·jscad-to-three·instancing·models·opacity) + `src/main.js` 셸 + 프로젝트 `65/`·`keypad/`. 코드/치수 단일 출처: `docs/PROCESS.md` + `<project>/config/dimensions.js`.
> - **렌더**: `bun run dev` → localhost:5173. **65(좌+우)와 keypad를 한 화면에 동시** 렌더(드롭다운 없음, x축으로 나란히). 통합 토글 7개(상판/PCB/하판/스페이서/볼트/스위치/키캡) + 비교(Zen 65·49, 기본 off) + 투명도 슬라이더(80%). 색: 전부 흰색(PCB 포함)·볼트/스페이서 은색·스위치 하우징 검정/스템 파랑.
> - **65 구조(위→아래)**: 일체형 상판(베젤5.0+보강판1.5, 6.5mm) / 에어갭 좌우벽(3.5) / PCB(1.6) / 바텀갭 좌우벽(5.0) / 하판(1.5). 총 스택 18.1mm. 결착 = M2 관통볼트 하단진입 6/측(코너4+좌우 변중점2), 보강판 플랜지 인서트 체결, 베젤 무홀. 케이스 외곽 좌 143.35×105.25 / 우 162.4×105.25. keypad도 동일 구조(17키, 외곽 86.2×105.25).
> - **스위치/키캡 실제 모델**(InstancedMesh). 키캡(`@renderer/models.js`): **폭=u·세로=vSpan 스케일**(세로 2U +·Enter는 height로 늘림, 회전 안 함), `pickCap`이 행 프로파일(R1~R4) 내 **근접 폭 캡** 선택(가로 2U "0"은 평면 R4). 폴백 = 박스(vSpan 반영).
> - **Export = 2D DXF**(STL 아님): `bun run export:65` → `65/export-out/` **10장**(측당 5: bezel-5.0/plate-1.5/bottom-1.5/spacer-airgap-3.5/spacer-bottomgap-5.0), `bun run export:keypad` → `keypad/export-out/` **5장**.
> - **아래 §1~7은 작업 방식 합의·진화 기록(역사)** — Z·베젤·체결 수치(프레임 +15.0, 베젤 10mm, M3 관통볼트 클램프·스탠드오프 등)와 키캡 선택 로직(R4&2u→R1)은 **옛 값/옛 로직**. 현재는 본 ⚠️ 블록 + `docs/PROCESS.md` + 코드(`src/renderer/models.js`)를 본다.

## 1. 목표

- `left.jscad` / `right.jscad`(보강판) + 신규 상판 프레임 / 하판 JSCAD를 편집하면 **브라우저 three.js 뷰어에서 즉시** 케이스 적층을 본다.
- 부자재(스위치·키캡) 3D 모델을 함께 올려 **실제 조립 스택업**(확정 Z값)으로 미리본다.

## 2. 제안 스택 (기본값 — 확정 필요)

- **Bun + Vite + three.js** (프로젝트 런타임 Bun 기준).
- **JSCAD → three.js 메시 변환**: `@jscad/modeling`로 geom 생성 → polygon을 `THREE.BufferGeometry`로 변환해 렌더. (JSCAD 공식 `@jscad/regl-renderer`는 regl 기반이라, three.js 고정 요구에 맞춰 변환 방식 채택)
- 파일 변경 감지 → Vite HMR로 핫리로드.

## 3. 부자재 모델 — assets/ 로 가져와 활용

> 사용자가 git clone 해 둔 모델을 `assets/`로 가져와 렌더에 사용.

| 부자재        | 소스(이미 clone됨)                             | 포맷          | three.js 로더  |
| ------------- | ---------------------------------------------- | ------------- | -------------- |
| 스위치 (MX)   | `keyswitch_model/mx/silent_alpaca/KiCad/*.wrl` | WRL(VRML)     | `VRMLLoader`   |
| (대안) 스위치 | `keyswitch_model/socket`, `choc/*`             | WRL           | VRMLLoader     |
| 키캡          | `keycaps/models/keycaps.json` (DCS/DSA/SA/G20) | three.js JSON | `ObjectLoader` |

- `assets/models/switch/`, `assets/models/keycap/` 로 필요한 파일만 복사.
- 스위치는 cherry-mx-basic → MX(silent_alpaca) WRL 사용. STEP은 three.js가 직접 못 읽으므로 **WRL 우선**.
- 키캡 프로파일은 Cherry가 이상적이나 keycaps.json엔 없음 → DCS(근사)로 대체하거나 단순 박스 플레이스홀더.

## 4. 렌더 레이어 배치 (확정 Z, PCB 상면=0)

| 레이어      | Z                               | 소스                                   |
| ----------- | ------------------------------- | -------------------------------------- |
| 상판 프레임 | +15.0 (하면)                    | 신규 JSCAD                             |
| 보강판      | +3.5~+5.0                       | `left/right.jscad`                     |
| 스위치      | plate에 마운트 (stem top +16.6) | WRL                                    |
| 키캡        | stem 위                         | keycaps.json                           |
| PCB         | 0 ~ −1.6                        | 플레이스홀더 판 (실 PCB는 사용자 별도) |
| 하판        | −7.6 (상면)                     | 신규 JSCAD                             |

## 5. Export 2종 (부품별)

> **CNC 출력 + 3D 프린트 출력 둘 다 가능하게 export를 2개** 만든다.

| 용도          | 포맷(기본)                         | 비고                                 |
| ------------- | ---------------------------------- | ------------------------------------ |
| **CNC**       | DXF(2D 윤곽) **또는** STEP/3MF(3D) | 가공 업체/CAM에 맞춤 — **확정 필요** |
| **3D 프린트** | **STL**                            | `@jscad/io` stlSerializer            |

- JSCAD 모듈에서 `@jscad/io`(dxfSerializer / stlSerializer)로 직렬화.
- 평판이라 CNC는 2D 윤곽(DXF)이 일반적이나, 카운터보어/단차가 있으면 3D(STEP/3MF) 필요.

## 6. 확정 (2026-06-21)

- 렌더 스택: **Bun + Vite + three.js 신규** (JSCAD geom → THREE.BufferGeometry, Vite HMR).
- 모델: 스위치 = `keyswitch_model` MX WRL(VRMLLoader), 키캡 = `keycaps/models/keycaps.json`(ObjectLoader).
- CNC export = **DXF 2D 윤곽**, 3D 프린트 export = **STL** (둘 다 부품별).
- 두께: 상판 프레임 3mm, 하판 3mm. 베젤 스페이서 10mm(깊은 well).

## 7. 실제 모델 렌더 — 구현 결과 (`src/viewer/models.js`, `instancing.js`)

> 실제 스위치·키캡을 **기본 렌더**. 성능을 위해 전부 InstancedMesh.

### 스위치 (silent_alpaca.wrl)

- 원본 WRL = **926 메시 / 113,682 tris** (StepUp가 면별로 분리). 35개 클론 시 32,410 draw call → **심각한 렉**.
- 해결: KiCad 스케일 **×2.54** 적용 후 **색상별 병합**(distinct 5색) → 5 merged geometry → **색상별 InstancedMesh(count=키수)**. = 측당 **5 draw call**.
- 배치: 스템 top Z = `plateTop + 8.5`(=13.5)에 모델 max-z 정렬 → 하우징이 plate에, 스템이 키캡 안에.

### 키캡 (keycaps.json, joric)

- 포맷: `data={...}` 전역(io_three Object v4.4). fetch→`data=` 제거→`ObjectLoader().parse`.
- 메시: `DCS R1~R4` + 폭변형(`DCS R4 2.75` 등) + `DCS SPACE`. `materials:[]` 비어 있어 **MeshStandardMaterial 직접 부여 + computeVertexNormals** (안 하면 unlit 흰색).
- 선택 로직(joric `add_keycap` 복제, DCS·rows=5 `[1,2,3,4,4]`): row=`round(-y/19.05)`, 폭 규칙(R4&2u→R1, 1.5u→R2, 1.75u→R3), 없으면 `DCS R3` fallback.
- `geometry.scale(-1,-1,1)` + XY 센터링, base Z = `KEYCAP_BOTTOM_Z = plateTop + 4.3`(=9.3, 현재값) → 가장 낮은 R3도 스템 덮음. 이름별 InstancedMesh.

### 성능 결과

- 측당 draw call: 정적 5(plate/frame/pcb/bottom/spacers) + 스위치 5 + 키캡 ~9 = **약 19**. 렉 없음.
- 실패 시 `buildBoxPreview` 박스 폴백.

### 좌+우 동시 + 스페이서 (2026-06-21)

- **양쪽 동시 렌더**: `main.js`가 left·right 인스턴스를 X축으로 GAP 40mm 띄워 나란히 배치. 토글은 양쪽에 동시 적용.
- **스페이서 렌더**(`case-meshes.js buildSpacers`): 각 M3 홀에 황동 hex 스탠드오프(radius 2.8, 6각). 상단(plate top→frame bottom, 6mm) + 하단(PCB bottom→bottom top, 6mm).
- **낮은 베젤**: BEZEL_SPACER 10→6 → 프레임 윗면 +14. 키캡(top ~~16~~18)이 위로 노출, 프레임은 하단만 감쌈.
