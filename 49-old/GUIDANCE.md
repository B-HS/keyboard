# Keyboard Project — GUIDANCE.md

새 키보드를 만들 때 참고할 종합 가이드. 49키 핸드와이어드 프로젝트(USB-C 유선, JLC3DP SLA Resin 주문)에서 얻은 교훈·치수·파이프라인을 정리.

> **이 문서의 위치**: 다음 프로젝트는 이 문서를 첫 단계에 읽고 시작할 것. 코드/치수가 아니라 **결정의 근거**를 우선 본다.

---

## 0. 한 줄 요약

- **샌드위치(직선판 적층) 구조 우선** — 일체형 케이스는 한 군데만 틀려도 전체 재인쇄.
- **공차는 편측 0.5~0.75mm (총 1.0~1.5mm)** — 8228 Resin 기준 0.25mm는 마이너스 공차에 가깝다.
- **레이아웃은 KLE → JSON 단일 진실 원천** — 모든 치수는 여기서 파생.
- **Plate STL을 truth로** — 직접 생성하지 말고 KLE-NG 등으로 받아 import, bounds 자동 추출.
- **컨트롤러는 케이스 마운트홀 없음 가정** — 양면폼/만능보드 + 핀헤더.

---

## 1. 핵심 교훈 (49 프로젝트 출력 후)

### 1.1 공차 — 절대 0.25mm 그대로 가지 말 것

| 위치 | 49 프로젝트 값 | 실제 결과 | 권장값 (다음) |
|---|---|---|---|
| `plateClearance` (plate ↔ case XY) | 0.25mm | **너무 빡빡함, plate가 case에 짓눌려 휨** | **0.5~0.75mm 편측** |
| `caseMargin` 사방 | 2mm | OK | 2~3mm 유지 |
| Threaded insert pocket (Ø) | 1.8 (Ø3.6) | OK (JLC 사양) | M3 insert OD 4.0 → 홀 Ø3.6 (-0.4 압입) |
| Self-tap pilot | 1.25 (Ø2.5) | 미검증 | PA12에선 Ø2.5 유지, resin엔 self-tap 비추 |
| 코너 라운딩 | 1~2mm | OK | 외부 라운딩은 resin이 더 잘 살림 |

**원칙**: resin은 후경화 시 수축(약 0.5%) + 표면 거칠기 + 서포트 자국이 남는다. 직진 공차 0.25mm는 사실상 0mm. **편측 0.5mm 이상**을 기본으로 두고, 빡빡해야 할 곳만 따로 줄인다.

**예외 (압입/체결)**: 인서트가 들어가는 홀은 오히려 **언더사이즈** (-0.05~-0.1mm)로. 빡빡해야 압입이 된다.

### 1.2 Plate가 휘는 문제 — resin 1.5mm는 49키에 부족

스위치 클립을 하나씩 끼울 때 plate가 측면으로 늘어나며 변형됨 (8228 Resin). 원인은 **얇은 brittle resin의 굽힘 강성 부족**. 해결책은 셋 중 하나:

1. **두께 ↑**: 2.0~2.4mm로 두껍게 (resin 그대로 가야 한다면)
2. **재질 변경**: PC 1.5mm (레이저컷) / FR4 1.6mm / 알루미늄 — 강성·소리 모두 우위
3. **보강 리브**: plate 아래 중앙 길이방향 리브 1~2개 추가 (샌드위치 구조 시 mid spacer가 자연스럽게 받쳐줌)

**다음 프로젝트 기본**: PC 1.5mm 외주 레이저컷 + 샌드위치 구조.

### 1.3 일체형 케이스의 함정

49 프로젝트의 `case.ts`는 **틸트 + 외벽 + USB 컷아웃 + side fastener boss + plate mount pillar + 코너 라운딩**이 한 솔리드에 다 얽혀 있다. 결과:

- 한 치수 (예: `plateClearance`) 만 틀려도 **전체 재인쇄**.
- 공차 누적이 외벽-내벽-기둥-인서트로 전파되어 디버깅이 어렵다.
- JSCAD boolean 연산이 무거워져 mesh가 자주 깨짐 (`floorSlab`을 외부 셸 slice → 단순 extrude로 단순화한 이력).

**원칙**: 다음 프로젝트는 처음부터 **샌드위치(층별 독립 빌드)** 로 시작.

---

## 2. 권장 구조 — 샌드위치 (직선판 적층)

### 2.1 4장 구조

```
[Keycaps]
─── Top frame  (옆벽 + 키캡 가이드 컷아웃)        2~3mm
─── Switch plate (사용자 STL, 14×14 컷아웃)       1.5~2.0mm
─── Mid spacer (스위치 핀/배선/MCU 공간)           5~10mm  ← 틸트는 앞↓/뒤↑
─── Bottom plate (바닥 + 고무발 + USB 컷아웃)      2~3mm
[Foot pads]
```

각 층은 **독립 STL/DXF**. 한 장만 다시 뽑으면 되므로 반복 비용 ↓.

### 2.2 체결 — M2 황동 스페이서 우선

| 부품 | 규격 | 비고 |
|---|---|---|
| 표준 체결 나사 | **M2×6 또는 M3×6 button head** | 49 프로젝트는 M3×8개. M2가 컴팩트 |
| 황동 스페이서 (메인보드용 기성품) | M2/M3, F-F 또는 M-F, 5~15mm | ±0.05mm 정밀, 공차 누적 없음 |
| 인서트 (resin 외주 시) | M3×4×5 황동 (JLC "Threaded Insert" 옵션) | OD 4.0 → 홀 Ø3.6 |

**틸트 8°를 만드는 법**: Mid spacer를 앞쪽 짧게(예: 5mm) / 뒤쪽 길게(예: 11mm) 하면 자연스럽게 8° 기울임. 별도 케이스 틸트 코드 불필요.

### 2.3 옆벽

전 둘레 옆벽 대신, **Top frame이 옆벽 역할**을 겸하도록 설계. 외부 단차/모서리는 자연스럽게 층 사이에 생기는 0.2~0.5mm gap이 흡수.

---

## 3. 표준 치수 (재사용 가능)

### 3.1 키 / Cherry MX

| 항목 | 값 | 출처 |
|---|---|---|
| 키 피치 (1u) | **19.05 mm** | MX 표준 |
| 스위치 컷아웃 | **14.0 × 14.0 mm**, R0.5 | `plate.jscad` / 표준 |
| 스위치 본체 | 15.6 × 15.6 mm | top housing |
| Plate 두께 수용 | 1.5 mm | MX 표준 클립 |
| Plate 위 높이 | ~11 mm | 키캡 마운트까지 |
| Plate 아래 높이 | ~5 mm | 핀 + 클립 |

### 3.2 스태빌라이저 (Plate-mount)

| 폭 | spacing (±) | 비고 |
|---|---|---|
| 2u / 2.25u / 2.5u / 2.75u / 3u | **11.938 mm** | 동일 |
| 6.25u | **50.0 mm** | Spacebar |
| 7u | 57.15 mm | 풀사이즈 spacebar |

- 패드 크기: **7 × 15 mm**, R0.5
- 패드 Y offset: **−1.5 mm** (키 중심 기준 앞쪽)

### 3.3 나사·인서트

| 항목 | 값 |
|---|---|
| M3 관통홀 | Ø3.4~3.5 mm |
| M3 button head | Ø5×H2 |
| M3 황동 열인서트 (4×5) | OD 4.0, 홀 Ø3.6, depth 7mm (5mm insert + 2mm 여유) |
| M3 self-tap pilot (PA12) | Ø2.5, depth 4mm |
| M2 관통홀 | Ø2.2~2.4 mm |
| M2 황동 열인서트 (3×3) | OD 3.0, 홀 Ø2.6 |

### 3.4 USB-C 컷아웃

| 항목 | 값 |
|---|---|
| 폭 × 높이 | **12.2 × 5.5 mm** (커넥터 여유 포함) |
| 코너 R | 1.5 mm |
| 케이블 헤드 통과 (외경 큰 케이블 대비) | 폭 14 × 높이 7 mm 권장 |
| 깊이 | 벽 두께 + 2mm taper |

### 3.5 케이스 외곽 (49키 기준 참고)

| 항목 | 값 |
|---|---|
| Plate 외곽 | 271.65 × 83.15 mm (KLE 기반) |
| Case 외곽 (margin 2mm 사방) | 275.65 × 87.15 mm |
| 코너 R | 1~2 mm |
| 앞 높이 (8° 틸트) | ~18.5 mm |
| 뒤 높이 (8° 틸트) | ~30.6 mm |
| 바닥 두께 | 2.4~3.2 mm |
| 옆벽 두께 | 2~3 mm |

---

## 4. 컨트롤러 선택

### 4.1 49 프로젝트: LOLIN S3 Mini (ESP32-S3FH4R2)

| 항목 | 값 |
|---|---|
| PCB | 25.4 × 34.3 mm, 1.6mm 두께 |
| GPIO | 27개 (스트랩 IO0/3/45/46 회피) |
| USB | IO19/20 (D−/D+) |
| BLE 안테나 | 우측 상단, Ø2 mm 클리어런스 필요 |
| 마운트 홀 | **없음** → 만능보드/양면폼 고정 |
| 전원 | 3.3V |
| 펌웨어 | RMK (Rust, Vial 네이티브) |

### 4.2 다음 후보 (메모 기반)

- **STM32F411 직접 탑재**: PCB 설계 + webvia.app 키맵 (자세한 건 `49guidence.md` 참조)
- ESP32-S3 모듈을 직접 SMT는 금지 (PCB 관통홀 충돌 — `feedback_esp32_size`)
- **Pro Micro 및 호환 모듈(Liatris/Elite-Pi 등) 절대 사용 금지** (`feedback_no_promicro`)

### 4.3 펌웨어

| 펌웨어 | 장점 | 단점 |
|---|---|---|
| **RMK** (Rust) | Vial 네이티브, BLE/USB 듀얼, ESP32-S3 공식 지원 | Rust 빌드 필요 |
| QMK | 자료 풍부 | BLE+VIA 동시 어려움 |
| ZMK | BLE 우수 | VIA 미지원 (자체 Studio) |

### 4.4 매트릭스 권장

49키는 **7×7** 또는 6×9. 핸드와이어드 시 다이오드 1N4148 × 키 수, UEW 0.6mm. 다이오드 극성: 검은 띠 = Cathode (−).

---

## 5. CAD / 모델링 파이프라인 (재사용)

### 5.1 데이터 흐름

```
KLE (keyboard-layout-editor.com)
   ↓ JSON export
docs/models/<name>.json    ← truth source #1
   ↓ KLE-NG (editor.keyboard-tools.xyz)
docs/models/plate.jscad    ← truth source #2 (plate 치수)
   ↓ JSCAD export
docs/models/plate.stl      ← truth source #3 (실제 발주 파일)
   ↓ src/models/plate.ts:loadPlateGeom()
plateBounds (자동 추출)
   ↓ src/models/case.ts
케이스 layout 자동 스케일
```

**핵심**: 어떤 단계에서 시작하든 **bounds는 자동 파생**되도록 코드를 짠다. 49 프로젝트의 `plateBoundsFromGeom()`이 좋은 예 — plate STL만 바꾸면 케이스가 자동 따라감.

### 5.2 JSCAD 코딩 패턴 (재사용)

**(a) STL 자동 발견** — `import.meta.glob` + eager + `?url`

```ts
// 49 프로젝트 src/models/plate.ts 패턴
const stlUrlMap = import.meta.glob('../../docs/models/plate/*.{stl,STL}', {
    query: '?url',
    import: 'default',
    eager: true,
}) as Record<string, string>
```

**(b) 레퍼런스 JSCAD에서 정규식으로 치수 추출** — `src/models/reference.ts`

원본 plate.jscad가 단일 진실. 코드는 그걸 파싱해서 padding / cornerRadius / screwHole 위치를 자동 도출.

**(c) Plate 틸트 — 피벗 변환 헬퍼**

```ts
// case.ts의 applyPlateTiltToLocal 패턴 — 재사용 가치 높음
const applyPlateTilt = (geom, plateBounds, tiltDeg, liftZ) => {
    const pivotY = plateBounds.minY
    const angle = (tiltDeg * Math.PI) / 180
    let t = translate([0, -pivotY, 0], geom)
    t = rotateX(angle, t)
    t = translate([0, pivotY, liftZ], t)
    return t
}
```

**(d) Boolean 후 retessellate** — 무거운 subtract 다음엔 항상 `modifiers.retessellate()`로 mesh 정리. JLC unprintable 에러 예방.

**(e) HMR로 실시간 반영** — `app.tsx`

```ts
import.meta.hot.accept('./models/case', () => setHmrTick(n => n + 1))
```

모델 파일 저장 즉시 뷰어 재렌더. 수치 튜닝 워크플로의 핵심.

### 5.3 뷰어 (regl-renderer + Blender 카메라)

`src/components/viewer.tsx`의 카메라 패턴은 그대로 재사용 가능:
- LMB/MMB → orbit
- RMB / Shift+drag → pan
- 휠 → cursor 위치 기준 zoom (NDC → world ray 변환 포함)
- F → 모든 솔리드에 맞춰 framing 리셋

### 5.4 Export 파이프라인

```
bun run export    → docs/export/*.stl 생성 (binary STL)
bun scripts/verify.ts → 치수 검증 + STL alignment 확인
bun run dev       → 사용자가 직접 실행 (Claude는 실행 금지, feedback_dev_server)
```

---

## 6. 출력 / 외주 선택

### 6.1 케이스 (3D 프린팅)

| 옵션 | 매끈함 | 강도 | 공차 | 인서트 | 비고 |
|---|---|---|---|---|---|
| **JLC3DP SLA Resin (8228 등)** | ★★★★★ | ★★ (brittle) | ±0.2mm | "Threaded Insert" 옵션 (M3*4*5 자동 설치) | **1순위**. 49 프로젝트 채택 |
| JLC3DP SLS PA12 | ★★ | ★★★★ | ±0.3mm | self-tap (Ø2.5 pilot) | 견고. 표면 거침 |
| FDM PETG/ABS | ★★ | ★★★ | ±0.4mm | 수동 인서트 압입 | 빠르고 쌈 |

**결정 기준**: 매끈함 우선 → SLA. 견고함 우선 → PA12. 빠르고 싼 것 → FDM.

**SLA 주의**: 1.5mm 이하 얇은 판은 휘기 쉬움. 두꺼운 셸·강한 코너 필요. 비용은 SLS보다 비쌈.

### 6.2 Plate (얇은 판)

| 옵션 | 사운드 | 비용 | 기간 |
|---|---|---|---|
| **PC 1.5mm 레이저컷 (국내)** | Deep thocky, 마쉬멜로우 | 저 | 1주 |
| FR4 1.6mm (PCB 업체) | Crisp | 저 | 2주 |
| Alu 1.5mm CNC | Sharp | 중-고 | 2주 |
| SLA Resin 1.5mm | (휨 위험) | 저 | 1주 |

**다음 기본**: PC 1.5mm 레이저컷. DXF 파일만 보내면 됨.

### 6.3 케이블 / 기타

- USB-C 데이터 케이블 (충전전용 X)
- 1N4148 다이오드, UEW 0.6mm 에나멜선
- M3 button head × 키트, 황동 인서트 키트
- 고무발 Ø6×2 자가접착

---

## 7. 빌드 / 조립 순서 (샌드위치 기준)

1. Plate STL 발주 (PC 또는 FR4)
2. 3D 프린팅 발주 (Top frame / Mid spacer / Bottom plate, 각각 STL)
3. (Resin SLA) 인서트 사전 설치 확인 → M3 시험 체결
4. Switch plate에 스위치 49개 클립 → **스태빌라이저 먼저** 끼우고 윤활(Krytox 205g0 선택)
5. 다이오드 + UEW 배선 (Row/Col)
6. MCU 모듈에 핀헤더 → 만능보드 위에 배선
7. Bottom plate에 MCU 만능보드 양면폼 고정
8. Mid spacer 얹고 USB-C 위치 확인
9. Switch plate 얹고 옆에서 핸드와이어 정리
10. Top frame 위에서 씌움
11. 4코너 M2/M3 나사로 전체 관통 체결
12. 펌웨어 플래시 + Vial/webvia.app에서 키맵 테스트
13. 고무발 부착

---

## 8. 새 프로젝트 시작 체크리스트

### Phase 0. 결정
- [ ] 키 수 / 레이아웃 (KLE에서 만들고 JSON 저장)
- [ ] 컨트롤러 (LOLIN S3 / STM32 직접 탑재 / 기타)
- [ ] 펌웨어 (RMK / QMK)
- [ ] 연결 (USB-C only / +BLE 듀얼)
- [ ] Plate 재질 (PC / FR4 / Alu / Resin)
- [ ] 케이스 재질 (SLA / SLS / FDM)
- [ ] 인서트 방식 (열압입 / JLC threaded insert / self-tap)
- [ ] 틸트 각도 (0° / 6° / 8°)

### Phase 1. CAD
- [ ] `docs/models/<name>.json` (KLE → JSON)
- [ ] `docs/models/<name>.jscad` (KLE-NG → JSCAD)
- [ ] `docs/models/<name>.stl` (plate STL 발주용)
- [ ] `src/models/layout.ts` (49 프로젝트 그대로 재사용)
- [ ] `src/models/sandwich.ts` (또는 `case.ts`) — 4장 빌드
- [ ] `bun scripts/verify.ts` 치수 검증 PASS
- [ ] `bun run export` STL 4개 생성

### Phase 2. 발주
- [ ] Plate (DXF/STL → 레이저컷 또는 PCB 업체)
- [ ] 케이스 4장 (STL → JLC3DP)
- [ ] MCU + 부품
- [ ] M2/M3 나사 + 황동 스페이서 + 인서트

### Phase 3. 조립
- [ ] 인서트 검수 (resin 외주 시)
- [ ] 스태빌라이저 윤활 (선택)
- [ ] 스위치 클립 + 핸드와이어
- [ ] MCU 배선 + 양면폼 고정
- [ ] 4장 적층 + 나사 체결
- [ ] 펌웨어 플래시 + 키맵 테스트
- [ ] 고무발

### Phase 4. 마감
- [ ] 키캡 장착
- [ ] 장기 사용 테스트
- [ ] 발견된 치수 문제 → 본 GUIDANCE.md에 추가 기록

---

## 9. 절대 하지 말 것 (Anti-pattern)

1. **plateClearance 0.25mm 그대로 두기** — 8228 resin 기준 마이너스 공차. 최소 0.5mm 편측.
2. **1.5mm resin plate에 49키 다 박기** — 휨 발생. PC 또는 두께 ↑.
3. **케이스 일체형으로 처음부터 시작** — 한 군데 틀리면 전체 재인쇄.
4. **컨트롤러를 케이스에 직접 마운트홀로 고정 시도** — LOLIN S3 Mini는 마운트홀 없음. 양면폼/만능보드.
5. **Pro Micro / Liatris / Elite-Pi 사용** — 메모리 기록상 절대 금지 (`feedback_no_promicro`).
6. **ESP32-S3-MINI-1 모듈을 PCB에 직접 SMT** — 관통홀 충돌 (`feedback_esp32_size`).
7. **MCP KiCad 쓰기 도구로 Python 편집한 파일 덮어쓰기** — 캐시 문제 (`feedback_mcp_kicad_cache`).
8. **`bun run dev`를 Claude가 실행** — 사용자가 직접 띄움 (`feedback_dev_server`).
9. **plate STL 없이 케이스부터 모델링** — bounds 미정으로 전체 다시 짜야 함.
10. **무선 BLE 듀얼 + 배터리 케이스 무리하게 추가** — 49 프로젝트도 결국 USB-C only로 단순화.

---

## 10. 툴체인 (49 프로젝트 기준, 재사용)

```
Bun 1.3.0
Vite 8.0.9
React 19.2.5
TypeScript 6.0.3 (strict, noEmit)

@jscad/modeling 2.13
@jscad/regl-renderer 2.6 (뷰어)
@jscad/stl-deserializer / -serializer 2.1
@resvg/resvg-js 2.6 (SVG → PNG, insert-spec 도면)
```

`vite.config.ts`의 `base: '/keyboard/'`는 빌드 시에만 적용 (GitHub Pages용).

---

## 11. 참조 링크

- **KLE**: https://www.keyboard-layout-editor.com/
- **KLE-NG (plate 생성)**: https://editor.keyboard-tools.xyz/
- **JSCAD docs**: https://openjscad.xyz/docs/
- **RMK 펌웨어**: https://rmk.rs/
- **QMK**: https://docs.qmk.fm/
- **Vial**: https://vial.rocks/
- **webvia.app**: https://webvia.app/
- **JLC3DP**: https://jlc3dp.com/ (SLA + Threaded Insert M3*4*5)
- **LOLIN S3 Mini**: https://www.wemos.cc/en/latest/s3/s3_mini.html
- **ESP32-S3 datasheet**: https://www.espressif.com/sites/default/files/documentation/esp32-s3_datasheet_en.pdf

---

## 12. 변경 이력

| 날짜 | 내용 |
|---|---|
| 2026-04-30 | 초안. 49키 SLA Resin 출력 후 공차/구조 문제 반영. |
