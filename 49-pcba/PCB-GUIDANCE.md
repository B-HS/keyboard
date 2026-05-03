# 49-pcba PCB 제작 가이드

현재 케이스 (3D 출력본, CBY 레진) 기준 PCB 설계 시 주의 사항.
모든 수치는 `shared/config/keyboard.ts` 의 `KEYBOARD_GEOMETRY` 와 일치해야 한다.

---

## 1. 외곽 치수

| 항목 | 값 | 비고 |
|---|---|---|
| PCB 가로 (X) | **271.65 mm** | `plateWidth` |
| PCB 세로 (Y) | **81.15 mm** | `plateDepth` |
| PCB 두께 | **1.6 mm** | `pcbThickness` (FR-4 표준) |
| 4 코너 round | **R 1.0 mm** | `pcbCornerRadius` |
| 외곽 좌표 | plate outline 과 동일 | `keyboard-plate-extended.jscad` 의 polygon points 참조 |

**PCB 외곽 = plate 외곽** (둘 다 `PLATE_W × PLATE_D`). DXF 발주 시 `49-pcba/export/keyboard-plate-extended.dxf` 의 outline 그대로 사용.

### 좌표계
- jscad coord 기준: x ∈ [-12, 259.65], y ∈ [-69.15, 12]
- plate y_min (= 앞쪽 가장자리) = -69.15
- plate center = (123.825, -28.575)

---

## 2. 마운팅 / 받침 영역

PCB는 case 의 **supportRing 위에 안착** (4면 둘러싸기).

| 항목 | 값 |
|---|---|
| supportRing 외곽 | `PLATE_W × PLATE_D` (= PCB 외곽과 동일) |
| supportRing 폭 | **3 mm** (`supportRingWidth`) |
| supportRing 안쪽 외곽 | `265.65 × 75.15 mm` (= 외곽 - 6) |
| ring 윗면 (PCB 받침면) | **z = 5.4 mm** (= `pcbFrontBottomZ`, tilt=0 기준) |

### ⚠ PCB 둘레 3mm 영역 — 부품 / 회로 회피
PCB 가장자리에서 **안쪽 3mm 폭 영역** 에 다음 둘 수 없음:
- 표면 부품 (저항, 캐패시터 등)
- 라우팅이 노출되면 안 됨 (받침면과 직접 접촉)
- via, hole

**자유 영역**: PCB 가장자리에서 안쪽 3mm 떨어진 영역 (`265.65 × 75.15 mm`).

### PCB 마운트 홀 없음
케이스에 별도 PCB 마운트 인서트가 없다. PCB 는 **무 나사 (gravity + 측벽 fit)** 로 안착되며 plate 가 위에서 lip 으로 누름. PCB 자체에 마운트 홀 만들지 말 것 (case 와 호환 없음).

---

## 3. 스위치 / 스태빌라이저 풋프린트

### 스위치 위치 (49 키)
정확한 좌표는 `keyboard-plate-extended.jscad` 의 `switch_0 ~ switch_48` 참조.

| 핵심 정보 | 값 |
|---|---|
| 스위치 cutout 사이즈 | 13.9 × 13.9 mm (Cherry MX basic) |
| stem 위치 | switch cutout 중심 |
| 1u key spacing | 19.05 mm |

### Cherry MX 핀 위치 (스위치 중심 기준 mm)
- 중앙 stem hole: (0, 0)
- 본체 위치 핀: (5.08, 0), (-5.08, 0)
- 단자 핀: (3.81, 2.54), (-2.54, 5.08)

### 스태빌라이저 (4개)
| Switch ID | Key | Stab spacing | 좌표 (cutout 중심) |
|---|---|---|---|
| switch_27 | "2,0" 2u | ±11.94 mm | (9.525, -38.1) |
| switch_38 | "2,12" 2u | ±11.94 mm | (238.125, -38.1) |
| switch_42 | "3,4" 2.75u | ±11.94 mm | (83.344, -57.15) |
| switch_44 | "3,8" 2.75u | ±11.94 mm | (154.781, -57.15) |

스태빌라이저 풋프린트 (Cherry MX wire stab): 양쪽 wire hole + housing pad. plate 의 `stab_pad` (6.9 × 14.9) 와 정렬.

### Hot-swap vs. Solder
- 핫스왑 (Kailh / Gateron) 권장: 케이스 무 나사 결합이라 PCB 분해 자주.
- 핫스왑 소켓 풋프린트는 PCB **하면**. PCB 하면 z = 5.4 mm, floor 위 3.9 mm 여유라 일반 핫스왑 소켓 (높이 1.8 mm) 충분히 들어감.
- 솔더링 시 PCB 상면 핀 잘라낼 것 (plate-PCB 갭 3.5 mm 안에 핀 끝 들어가야).

---

## 4. 자석 위치 (간섭 / EMI 회피)

| 항목 | 값 |
|---|---|
| 자석 사양 | 네오디뮴 N52, 10 × 5 × 2t mm |
| 자석 개수 | 8 (top 4 + bottom 4) |
| 위치 | case 4 코너 측벽 안 |

### 자석 좌표 (PCB 외곽 기준, ± 약간 — case 외곽에서 안쪽 inset)
- 코너 X inset = 6.6 mm (case 외곽 기준)
- 코너 Y inset = 2.65 mm (case 외곽 기준, 측벽 두께 절반)
- PCB 외곽 (= plate 외곽) 기준으로 자석은 **PCB 가장자리에서 X 방향 ~3 mm 안쪽 + Y 방향 ~3 mm 안쪽 외측** 에 위치

### ⚠ EMI / 자기 영향
N52 자석 자력 강함. PCB 가장자리에서 자석까지 거리 약 **3 mm**. 다음 부품은 PCB 자석 영역 (가장자리 6 mm 폭 × 4 코너) 에 두지 말 것:
- Hall 센서 / 자기 센서
- 정밀 인덕터 / RF 회로
- 자력에 약한 부품 (HDD 메모리 등 — 이 PCB엔 없을 것)

일반 디지털 회로 (MCU, 저항, 캐패시터) 는 영향 무시.

---

## 5. PCB 상하면 클리어런스

### PCB 상면 (z = 7.0 mm)
- ↔ plate 하면 (z = 10.5 mm) 사이 **3.5 mm**
- 이 영역엔 **스위치 본체 외 부품 두지 말 것**
- 부품 높이 ≤ 3.5 mm 절대 한계 (LED, SMD)
- 추천: 표면 부품 ≤ 1.5 mm (안전 마진)

### PCB 하면 (z = 5.4 mm)
- ↔ floor top (z = 1.5 mm) 사이 **3.9 mm**
- supportRing 안쪽 영역 (xy 외곽 265.65 × 75.15) 에서 부품 자유
- 부품 높이 ≤ 3.9 mm
- 핫스왑 소켓 (1.8 mm) + 다이오드 (1.0 mm) 충분히

---

## 6. USB / 커넥터

### 현재 케이스에 USB cutout 없음
case 측벽 (앞/뒤/좌/우) 어디에도 USB-C / Micro USB cutout이 없다. PCB에 USB 커넥터 추가 시 다음 중 하나:

1. **case 수정** (`housing-top.ts` 에 USB cutout 추가, X 또는 Y 측벽). 추천 위치: PCB 뒤 (Y_max 측벽).
2. **무선** (BLE / 2.4 GHz): MCU 에 무선 모듈 + 배터리. case 수정 불필요.

USB 커넥터 위치는 PCB 가장자리 부근 (가장자리에서 안쪽 0~3 mm). supportRing 영역과 겹칠 수 있어 supportRing 외측 (PCB 외곽 가장자리) 에 받쳐지는 부분이라면 USB 커넥터의 metal shell 부분이 supportRing 위에 닿을 수 있음 (간섭). 보통 USB-C 본체가 PCB 가장자리에서 안쪽 4~5 mm 들어가니 supportRing (3 mm) 과 1~2 mm 떨어짐. OK.

---

## 7. PCB 두께 변경 시

PCB 두께 1.6 mm 에서 변경하려면 case 의 z 스택도 같이 조정:

```
plateFrontBottomZ - pcbFrontBottomZ = 5.1 mm
  = pcbThickness (1.6) + plate-PCB 갭 (3.5)
```

PCB 1.0 mm 로 줄이려면 `pcbThickness: 1.0` 변경. 또는 `pcbFrontBottomZ` 변경 (PCB 하면 z 위치 그대로 두고 두께만).

---

## 8. 공차 / 사포질 fitting

| 항목 | 값 | 비고 |
|---|---|---|
| `plateClearance` | 0.05 mm | PCB ↔ case inner 면 갭 |
| CBY 레진 출력 오차 | ±0.2 mm | case 가 -0.2 시 PCB 와 -0.15 mm = 안 들어감 |
| **사포질 finish** | case inner 면 0.1~0.2 mm 갈아냄 | plate / PCB 빡빡 시 |

PCB 발주 시 routing 공차도 함께 고려. 일반 PCB 제작사 외곽 ±0.2 mm. PCB 가 +0.2 mm 라면 case 가 -0.2 mm 와 합쳐 0.4 mm 빡빡. 사포질로 처리.

---

## 9. 디자인 체크리스트

PCB 발주 전 검증:
- [ ] 외곽 치수 271.65 × 81.15 mm, 코너 R 1.0 mm
- [ ] 두께 1.6 mm
- [ ] 외곽에서 안쪽 3 mm 폭 영역에 부품 / 노출 트레이스 없음
- [ ] 스위치 풋프린트 위치 plate cutout 과 정확히 일치 (KLE 좌표 사용)
- [ ] 스태빌라이저 풋프린트 4 위치 (2u × 2 + 2.75u × 2)
- [ ] 핫스왑 소켓이면 PCB 하면 풋프린트
- [ ] PCB 상면 부품 높이 ≤ 1.5 mm 권장 (≤ 3.5 mm 한계)
- [ ] PCB 하면 부품 높이 ≤ 3.9 mm
- [ ] PCB 4 코너 부근에 자력 민감 부품 없음
- [ ] USB 커넥터 위치 결정 (또는 무선)
- [ ] PCB 마운트 홀 없음 (case 에 호환 X)

---

## 10. 검증 방법

1. **3D 출력 (case 3 부품) + PCB 도착** 후
2. PCB 를 bottom housing 안 supportRing 위에 안착 시도
3. 빡빡하면 case inner 측면을 사포 (#400 → #800) 로 0.1 mm 단위 다듬음
4. PCB 안착 → top housing 결합 (자석 흡착)
5. plate 위에 스위치 끼워 PCB 핀 들어가는지 확인
6. 모든 49 키 스위치 정상 작동 확인 (멀티미터 OR firmware)

---

## 11. 케이스 부품 STL 위치

```
49-pcba/export/
├── 49-pcba-housing-top.stl       (top case, 자석 4 pocket)
├── 49-pcba-housing-bottom.stl    (bottom case, 자석 4 pocket + supportRing)
├── keyboard-plate-extended.stl   (plate, switch + stab cutout)
└── keyboard-plate-extended.dxf   (plate 레이저 커팅용)
```

---

## 부록: 핵심 수치 일괄 표

| 변수 | 값 (mm) |
|---|---|
| PCB 외곽 | 271.65 × 81.15 |
| PCB 두께 | 1.6 |
| PCB 코너 R | 1.0 |
| supportRing 폭 | 3 |
| PCB ↔ plate 갭 | 3.5 |
| PCB ↔ floor 갭 | 3.9 |
| plate 두께 | 1.5 |
| 자석 사양 | 10 × 5 × 2t × 8개 |
| case 외곽 | 282.35 × 91.85 × 20.0 |
| 출력 레진 | JLC3DP CBY (Shore D 76-85, ±0.2 mm) |
