# keypad PCB 요구사항 / 작업 상태

> keypad는 저손실 prototype. 발주용 편집본은 **`keypad/pcb/`** (raw 원본 `keypad/raw/split-keycad-pcb`는 좌표 SSOT로 보존, SMD 다이오드 그대로).
> 케이스 전제: 65 v3와 동일(일체형 상판 + 좌우 아크릴 벽 + M2 관통볼트 하단진입). 치수 SSOT: `keypad/config/dimensions.js`·`keypad/config/layout.js`.
> KiCad 좌표는 SW1=원점, 문서좌표의 Y 부호를 반전한다.

## 0. 작업 상태 (2026-06-27 최신)

레이아웃: 사용자 제공 새 PCB/plate — **19키**(우측 열 전부 1u, 세로 2u 없음), 가로 2u "0" 1개 + 가로 스태빌 1개.

`keypad/pcb` 발주본 현재 상태:

- **외곽** Edge.Cuts 라운드 사각 **86.2×105.25 R1** (§1).
- **M2 마운트홀 6개** Ø2.4 NPTH + 구리 키프아웃 Ø5 (§3).
- **다이오드 19개** — SMD(`D_SOD-123`) 제거 → **손납땜 구멍만** 남김(§5). PCB는 D0-35 풋프린트의 **외형·기호·실크·라벨을 전부 제거하고 THT 구멍(패드 2개, Ø0.8) + net(ROWx·Net-Dx-A)만** 유지. **스키마틱에서는 다이오드 심볼 삭제.** 1N4148을 그 구멍에 직접 손납땜.
- **스위치 19개** 솔더식(`SW_Cherry_MX`) 유지.

보류(사용자 작업):

- **컨트롤러 ESP32-S3-SuperMini** — 풋프린트 받음(`keypad/docs/utils/ESP32-S3-SuperMini.kicad_mod`). PCB 추가는 **보류**. 추가 방법은 §6.
- ROW 매트릭스 라우팅 / CNC·PCB 발주.

## 1. 외곽 (Edge.Cuts) = 케이스 외곽

| 항목           | 값                                    |
| -------------- | ------------------------------------- |
| 외곽 크기      | **86.2 × 105.25 mm** (전 방향 여백 5) |
| 코너 라운드    | R 1 mm                                |
| 중심(SW1=원점) | cx 28.575, cy −38.1 (문서좌표)        |

SSOT: `keypad/config/layout.js` `SIDES.main.caseOutline`.

## 2. 좌표 원점 / 키 (19키)

- SW1 = (0,0), 19.05 피치. 5행: 1~4행 각 4키(1u), 5행 가로 2u "0"(SW17) + 1u 2개(SW18·SW19). 우측 열 전부 1u.

## 3. M2 마운팅 홀 (6개, Ø2.4 NPTH)

| #   | X       | Y       | 위치      |
| --- | ------- | ------- | --------- |
| 1   | −12.025 | 12.025  | 좌상      |
| 2   | 69.175  | 12.025  | 우상      |
| 3   | −12.025 | −88.225 | 좌하      |
| 4   | 69.175  | −88.225 | 우하      |
| 5   | −12.025 | −38.1   | 좌 변중점 |
| 6   | 69.175  | −38.1   | 우 변중점 |

SSOT: `SIDES.main.mountHoles`. 세로 스태빌 없어 우 변중점 충돌 없음(DRC hole_to_hole 0).

## 4. 스태빌라이저 (가로 2u 1곳)

| 패드     | X      | Y     | rot |
| -------- | ------ | ----- | --- |
| 가로2u-a | −2.413 | −77.7 | 0   |
| 가로2u-b | 21.463 | −77.7 | 0   |

## 5. 다이오드 (1N4148, 손납땜 구멍)

- **PCB**: 다이오드 자리(D1~D19)에 **THT 구멍 2개**(드릴 Ø0.8, 패드 Ø1.6, 7.62mm 간격)만 남김. 외형·기호·레퍼런스·값 텍스트는 제거. net(pad1=ROWx, pad2=Net-Dx-A)은 유지 — 매트릭스 배선이 구멍에 살아 있음.
- **스키마틱**: 다이오드 심볼 삭제(부품으로 두지 않음).
- 사용자가 1N4148(DO-35)을 그 구멍에 직접 손납땜. 부품 사양: `docs/reference/1n4148-diode.md`.
- 빌드 재현: `keypad/docs/utils/strip-diode-silk.py`(D0-35 교체 후 외형 graphic 제거 + 필드 숨김).

## 6. 컨트롤러 ESP32-S3-SuperMini (보류)

풋프린트만 받은 상태(`keypad/docs/utils/ESP32-S3-SuperMini.kicad_mod`, 18핀: GPIO1~13 + 3V3·5V·GND·RX·TX). 정석 절차:

1. KiCad **스키마틱 에디터**에서 ESP32 심볼 배치(Footprint를 `ESP32-S3-SuperMini`로 지정).
2. GPIO 핀에 매트릭스 net 라벨 연결: **GPIO1~~5 = ROW0~~4, GPIO6~~9 = COL0~~3** (스키마틱에 ROW0~~4·COL0~~3 global label 이미 있음).
3. **Update PCB from Schematic** → 정상 net + ratsnest 생성 → 라우팅.

> ⚠️ 스키마틱 회로(심볼 배치·배선)는 KiCad 에디터에서 하는 게 정석이다. PCB에서 net을 직접 주는 방식은 `Update PCB from Schematic` 시 사라지므로 쓰지 않는다.

## 7. 발주 전 체크리스트

- [x] Edge.Cuts 외곽 86.2×105.25 R1
- [x] M2 홀 Ø2.4 NPTH 6개 + 키프아웃 Ø5
- [x] 다이오드 → 손납땜 구멍(외형 제거, net 유지) + 스키마틱 심볼 삭제
- [ ] ESP32 스키마틱 배치 + GPIO 배선(§6) → Update PCB → 라우팅
- [ ] 컨트롤러 전원(5V/3V3/GND)·USB 배선
- [ ] 엣지 클리어런스 ≥0.5mm 재확인

## 8. 재현 (PCB 빌드 스크립트)

`keypad/docs/utils/`:

```bash
bun run keypad/docs/utils/dump-layout.mjs > /tmp/keypad_layout.json
KICAD_PY=/Applications/KiCad/KiCad.app/Contents/Frameworks/Python.framework/Versions/3.9/bin/python3
"$KICAD_PY" keypad/docs/utils/build-pcb.py     # 외곽·M2홀·다이오드 D0-35 교체
"$KICAD_PY" keypad/docs/utils/strip-diode-silk.py  # 다이오드 외형 제거 → 구멍만
# 스키마틱 다이오드 심볼 삭제는 괄호깊이 파서로 처리(이력: docs/history)
```
