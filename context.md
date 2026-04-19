# 49 Keyboard 프로젝트 Context

대화 재개용 요약. 이 파일 읽으면 전체 맥락 파악 가능.

---

## 🎯 프로젝트 개요

**목표**: 49키 커스텀 키보드 자체 제작 (핸드와이어드, USB-C 유선 + BLE 무선, 3D 프린팅 케이스)

**핵심 스펙**:
- 레이아웃: 49키 (Row 0: 14×1u, Row 1: 1.5+11×1u+1.5u, Row 2: 2+10×1u+2u, Row 3: 1u+2×1.25u+2×2.75u(split spacebar)+5×1u)
- 컨트롤러: **LOLIN S3 Mini** (ESP32-S3FH4R2)
- 펌웨어: **RMK (Rust)** — Vial 네이티브 (vial.rocks)
- 연결: **USB-C 유선 + BLE 5.0 무선**
- 전원: **3×AAA 알카라인** (직렬 4.5V)
- 플레이트: **PC 1.5mm 레이저컷**
- 케이스: **3D 프린팅** (JLC3DP PETG/SLA 주문 예정)
- 타이핑 각도: **8° 틸트**

---

## 📂 프로젝트 구조

`/Users/hyunseokbyun/keyboard/` (Git main)

```
keyboard/
├── src/
│   ├── app.tsx
│   ├── components/
│   │   ├── viewer.tsx          # @jscad/regl-renderer
│   │   └── controls.tsx        # 사이드바 체크박스/파라미터
│   └── models/
│       ├── layout.ts           # 49.json 파싱
│       ├── plate.ts            # 플레이트 2D/3D
│       ├── case.ts             # 케이스 + 배터리 트레이
│       ├── lolin.ts            # LOLIN S3 Mini 배치
│       ├── switch.ts           # Cherry MX STL 로드
│       ├── accessories.ts      # 만능보드, 슬라이드 스위치, 스태빌라이저,
│       │                       # 키캡, 고무발, 배터리 뚜껑, 배터리, 접점
│       ├── reference.ts        # jscad 소스 파서
│       ├── defaults.ts
│       ├── build-params.ts
│       ├── build-solids.ts     # 조립 + 색상
│       └── assets/cherry-mx.stl
├── scripts/
│   ├── export.ts               # STL/DXF 분리 export → docs/export/
│   └── verify.ts
├── docs/
│   ├── models/
│   │   ├── 49-final.jscad      # 플레이트 소스 (KLE-NG)
│   │   ├── 49.json             # KLE 레이아웃
│   │   └── switch/cherry mx.*  # Cherry MX 3D 원본
│   ├── specs/
│   │   ├── parts.md
│   │   ├── parts_specification.md
│   │   ├── dim_s3_mini_v1.0.0.pdf
│   │   └── sch_s3_mini_v1.0.0.pdf
│   └── export/                 # 주문용 산출물
│       ├── case.stl
│       ├── battery-cover.stl
│       └── plate.dxf
```

---

## 🔧 확정된 설계 결정

1. **펌웨어 RMK**: QMK+BT+VIA 조합 불가. RMK는 Vial 네이티브 + BLE/USB 듀얼 지원
2. **MCU ESP32-S3**: 국내 구매 용이, USB-C 네이티브, RMK 공식 지원
3. **LOLIN S3 Mini**: 공식 Wemos 제품, 25.4×34.3mm, USB-C
4. **3×AAA 알카라인**: 리튬이온 대비 수명 반영구, 장기 미사용 시 분리 안전
5. **배터리 end-to-end + 같은 방향 + 콤비 접점**: 리모컨식, 4접점 직렬 자동 연결
6. **배터리 Y 위치 = +6**: Row 0 뒷쪽, 핀 없는 영역
7. **배터리 뚜껑**: 하판 슬라이드 + T자 레일 (립 걸림 구조)
8. **케이스 형태**: 사다리꼴 (쐐기형) + Tray mount
9. **플레이트 8° 틸트**: WOBKEY Zen 65 참고, 피벗 Y=-71.15
10. **케이스 rim**: 플레이트 위 3.5mm (스위치 본체는 노출)
11. **케이스 마진**: 4방향 분리 (F=4, B=3, L=4, R=4). plate outline Y 비대칭 보정
12. **UEW 에나멜선 0.6mm**: Row/Col 단일 종류 배선
13. **RS63 0.6mm 유연납**: 희성, 가성비
14. **캡톤 + 폼테이프**: 열수축튜브/순간접착제 대체

---

## 📐 현재 케이스 치수 (case.ts `DEFAULT_CASE_PARAMS`)

```ts
// 4방향 마진
caseMarginFront: 4, caseMarginBack: 3, caseMarginLeft: 4, caseMarginRight: 4

plateTiltDeg: 8             // 8° 틸트
plateFrontBottomZ: 10.5     // 앞 엣지 플레이트 바닥 Z

plateRecessWall: 6.5        // 플레이트 위 rim
wallThickness: 3
bottomThickness: 2.4        // JLC 벽 기준 + 뚜껑 립 공간
caseCornerRadius: 2         // 수직 엣지 라운딩 (plate와 일치)

screwPostOuterDiameter: 6
screwPostInsertHoleDiameter: 1.5   // 가이드 마킹용
screwPostInsertDepth: 1.0

// USB-C 컷아웃 (테이퍼 구조)
usbCutoutWidth: 12.2
usbCutoutHeight: 6.5
usbCutoutCenterX: 9.7       // 나사 포스트 회피
usbCutoutCenterZ: 6.25
usbCutoutCornerRadius: 1.5
usbCutoutTaperExpand: 1.0   // 외측 1mm 추가 확장

// 배터리
batteryDiameter: 10.5       // AAA
batteryLength: 44.5
batterySlotTolerance: 0.2
batteryGapLength: 7         // 콤비 접점 수용
batteryTrayYCenter: 6
batteryTrayYWidth: 12
batteryTrayXStart: 73
batteryEndWallThickness: 2
batteryTrayUpperWall: 1.2
batteryTrayFloorFlangeThickness: 1.2

// 슬라이드 스위치 (핸들 아래로)
slideSwitchX: 47
slideSwitchY: 6
slideSwitchCutoutWidth: 8
slideSwitchCutoutLength: 6
```

**도출 치수**:
- 케이스 앞 높이: ~14.44mm
- 케이스 뒤 높이: ~27.79mm
- 스위치 핀 최하단 Z (Row 0): 14.26mm (cradle top과 여유 0.5mm+)

---

## 🔨 케이스 구성 (case.ts)

1. **외곽 쉘**: 사다리꼴 polygon extrude + 수직 엣지 R2 라운딩
2. **내부 캐비티**: 벽 두께만큼 안쪽, 상단 관통, 내부도 라운딩
3. **나사 포스트 4개**: 상단이 플레이트 바닥 평면으로 8° 깎임 (큰 cuboid subtract)
4. **가이드 홀**: 포스트 상단 정중앙 Ø1.5×1mm (수직 원통, 약간 overshoot)
5. **USB-C 컷아웃**: 2단 구조 (내부 12.2×6.5×R1.5, 외부 테이퍼 14.2×8.5×R2.5)
6. **배터리 트레이**: 원호 클리핑 cradle × 3 + 원형 끝벽 × 2 + 바닥 플랜지 × 2
7. **배터리 바닥 T자 컷아웃**: 외부(Y=13) 좁음, 내부(Y=15) 넓음 → 뚜껑 립 걸림
8. **슬라이드 스위치 바닥 컷아웃**: 핸들이 아래로 노출
9. **배선 관통 구멍**: 좌/우 끝벽 Ø1.5 각 1개 (Z=14, 선 연결용)

**플레이트 틸트** (build-solids.ts):
```ts
plate = translate([0, -pivotY, 0], plate)
plate = rotateX(tiltAngle, plate)
plate = translate([0, pivotY, liftZ], plate)
```
pivot Y=-71.15, tiltAngle=8°, liftZ=10.5

---

## 🧩 배치된 부품 (뷰어 토글)

| 부품 | 파일 | 비고 |
|------|------|------|
| Plate | plate.ts | 49-final.jscad 기반 |
| Case | case.ts | |
| Switches | switch.ts | Cherry MX STL 49개 배치 (Z 오프셋 -7.7) |
| Keycaps | keycap.ts | Cherry MX 키캡 STL 49개, Z 오프셋 6, Rot Z 270° |
| LOLIN S3 Mini | lolin.ts | standoff 1mm (폼테이프 0.8mm + 0.2 공차) |
| Perf Board | accessories.ts | 50×40×1.6mm |
| Slide Switch | accessories.ts | GVMRZ, 핸들 Z- 방향 |
| Stabilizers | accessories.ts | 2u×2, 2.75u×2 |
| Foot Pads | accessories.ts | Ø6×2 4개 |
| Battery Cover | accessories.ts | T자 립 + 스냅훅 + 그립 + ridge 2개 |
| Batteries | accessories.ts | 3×AAA + 꼭지 |
| Battery Contacts | accessories.ts | 돔/스프링/판 조합 |
| Phone | build-solids.ts | 77.6×160.7×7.85 비교용 |

---

## 📦 Export (주문용)

```bash
bun run export   # → docs/export/ 에 3개 파일 생성
```

- `case.stl` — 3D 프린팅 (JLC3DP)
- `battery-cover.stl` — 3D 프린팅 (같이 출력)
- `plate.dxf` — 레이저컷 (PC 1.5mm)

**JLC3DP 조건 충족**: 벽 ≥1.2mm (측벽 3, 바닥 2.4, 트레이 상단 1.2, 플랜지 1.2), 부품 최소 ≥0.8mm (뚜껑 본체 1.1, 립 1.1, 그립 1.0)

---

## 🛒 부품 상태 (parts.md 요약)

### ✅ 보유
- LOLIN S3 Mini / TPS63020 / GVMRZ 슬라이드 스위치
- AA 스프링 접점 세트 (콤비 A 21×9, B 24×9, C 20×9 / 단자 8~9.5×9)
- 1N4148 다이오드 300개, UEW 0.6mm 10m, 만능보드 70×90
- Cherry MX 49개, 키캡, MX Plate-mount 스태빌라이저
- M3 하드웨어 + 열 인서트, 고무발 Ø6×2
- HAKKO FX-600 + 희성 RS63 + 플럭스펜 + 캡톤 + 폼테이프
- **AAA 알카라인** (AA에서 변경)

### ❌ 주문 필요
- 케이스 + 배터리 뚜껑 (JLC3DP STL)
- 플레이트 (SendCutSend / 국내 레이저컷 DXF)

---

## 📝 주요 참고 파일

- 플레이트 소스: `docs/models/49-final.jscad`
- 레이아웃: `docs/models/49.json`
- 부품: `docs/specs/parts.md`, `parts_specification.md`
- LOLIN 치수: `docs/specs/dim_s3_mini_v1.0.0.pdf`
- Cherry MX 3D: `docs/models/switch/cherry mx.STL`

---

## 🎨 뷰어 사용

```bash
bun run dev        # http://localhost:5173 (사용자가 직접 실행)
bun run export     # STL + DXF 생성
bun scripts/verify.ts
```

**조작**: 드래그(회전) · Shift+드래그 or 우클릭(이동) · 휠(줌)

**사이드바**: 부품별 체크박스 + 플레이트 파라미터 + 스위치 Orient (Z offset, 회전)

---

## ⏳ 남은 작업

**3D 설계 완료.** 이후는 주문 + 조립.

- [ ] JLC3DP 주문 (`case.stl` + `battery-cover.stl`, PETG 또는 SLA)
- [ ] 레이저컷 주문 (`plate.dxf`, PC 1.5mm)
- [ ] RMK `keyboard.toml` 작성 (Row/Col 핀 매핑, VIAL 키맵)
- [ ] 핸드와이어 조립 + 테스트

---

## 🐛 주요 수정 이력

- 케이스 천장 버그: innerCavity 상단 Z 맞춤 → 관통
- 배터리 Y: -6 → +6 (Row 0 핀 회피 후 방향 재조정)
- 배터리 트레이: 위에서 감싸는 inverted-U, 위쪽 원호 클리핑
- 원호 끝벽: 사각형 → intersect로 원형 클리핑
- 플레이트 틸트: 7° → 8°, plateFrontBottomZ 8 → 10.5
- caseMargin 스칼라 → 4방향 분리 (plate Y 비대칭 보정)
- bottomThickness 2 → 2.4 (JLC 기준 + 뚜껑 립 공간)
- USB-C 컷아웃 10×4 → 12.2×6.5, 2단 테이퍼 구조, R1.5
- 나사 포스트 상단 각도 맞춤 (plate 바닥 평면 cuboid subtract)
- 가이드 홀 Ø3.8×4 → Ø1.5×1 (인서트용 → 마킹용)
- 케이스 수직 엣지 R2 라운딩 (외곽+내부)
- 배터리 접점 실물 형상 (돔 + 스프링 코일 + 판)
- 뚜껑 ridge + 끝벽 배선 관통 구멍
- 키캡 cuboid → Cherry MX STL 로드 (Rot Z 270°, Z 오프셋 6)
- plateRecessWall 3.5 → 6.5 (rim 더 올림)

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
3. `src/models/case.ts` 현재 상태 확인
4. `bun run dev` (사용자가 직접 실행)
5. `bun run export` 로 최신 STL/DXF 생성
