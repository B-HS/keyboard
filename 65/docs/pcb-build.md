# 65 PCB 제작 — 발주본 가공 사양 (left/right)

> kbplacer(KLE-NG) 생성 원본(`65/raw/pcb-left.zip`·`pcb-right.zip`)을 `65/pcb/left`·`65/pcb/right`로 전개하고, 발주 가능하게 가공한다. keypad PCB(`keypad/pcb`) 선례와 동일 방법론(파일 직접 편집 + kicad-cli 검증). KiCad 10.0.3.
> 라우팅(배선)은 사용자가 GUI에서 직접. 이 문서는 그 전 단계(구멍·net·외곽·패드) 사양의 정본.

## 0. 원본 상태 (2026-07-07 수령)

|          | left                                       | right     |
| -------- | ------------------------------------------ | --------- |
| 스위치   | 30 (`SW_Cherry_MX_PCB_*`, THT 핀 Ø1.5 PTH) | 35        |
| 다이오드 | 30 (`Diode_SMD:D_SOD-123`, B.Cu)           | 35        |
| 스태빌   | 1 (2u)                                     | 4         |
| 넷       | COL0~~6 / ROW0~~4 / Net-(Dx-A)             | 동일 구조 |

- **좌표계**: SW1 = (0,0), x는 jscad와 동일, **y는 부호 반전**(KiCad y-down = −jscad y). 행 y = 0/19.05/38.1/57.15/76.2. 스위치 풋프린트 전부 **rot 180**.
- 매트릭스: 스위치 pad1=COLx, pad2=Net-(Dx-A)(다이오드 anode), 다이오드 pad1(cathode)=ROWx.

## 1. 다이오드 — SOD-123 제거 → DO-35 손납땜 구멍 2개 (keypad 선례 재현)

- SMD `D_SOD-123` 풋프린트 전량 제거, **`D_DO-35_SOD27_P7.62mm_Horizontal` 스타일 THT 구멍 2개**로 교체(1N4148 DO-35 직접 손납땜, `docs/reference/1n4148-diode.md`).
- 홀: **패드 Ø1.6 / 드릴 Ø0.8**, 피치 **7.62mm**, B.Cu 기준 rot 180.
- 위치(keypad와 동일 오프셋): 다이오드 원점 = **스위치 중심 + (0.89, −4)** → pad1(cathode)=(swX+0.89, swY−4), pad2(anode)=(swX−6.73, swY−4). 스위치 풋프린트 하부(중심핀 Ø4·소켓 배럴과 간섭 없음, keypad 검증됨).
- **net 유지(라우팅 편의 핵심)**: pad1 = `ROWx`(해당 행), pad2 = `Net-(Dx-A)`(해당 스위치 pad2와 동일 net). 매핑은 ref 번호가 아니라 **net으로 검증**(스위치 pad2의 Net-(Dx-A) ↔ 다이오드 anode).
- 리드 스펙(구매 이미지, `docs/reference/1n4148-axial-dimensions.png`): 바디 4mm, 리드 각 27mm × Ø0.4 → 드릴 0.8이면 여유 2배.

## 2. 외곽 (Edge.Cuts) — mock-pcb와 동일 (`fdmOutline`)

기존 Edge.Cuts 전체 교체. 케이스 §4.2 / `pcb-outline-requirements.md` §0과 동일:

|                  | left                | right               |
| ---------------- | ------------------- | ------------------- |
| 외곽             | **146.35 × 108.25** | **165.40 × 108.25** |
| 중심(KiCad 좌표) | (57.150, 38.100)    | (66.675, 38.100)    |
| 코너             | R1 (라인4 + 아크4)  | 동일                |

## 3. 기둥 관통 구멍 — 6개/측, Ø5.4 NPTH (사용자 확인: 6개)

`SIDES[k].mountHoles` → KiCad 좌표(y 부호 반전):

| 위치        | left                                    | right                                   |
| ----------- | --------------------------------------- | --------------------------------------- |
| 코너 상단   | (−12.025, −12.025) · (126.325, −12.025) | (−12.025, −12.025) · (145.375, −12.025) |
| 코너 하단   | (−12.025, 88.225) · (126.325, 88.225)   | (−12.025, 88.225) · (145.375, 88.225)   |
| 좌우 변중점 | (−12.025, 38.100) · (126.325, 38.100)   | (−12.025, 38.100) · (145.375, 38.100)   |

- **NPTH Ø5.4**(도금 없음, 기둥 Ø4.8이 7.5° 기울어 관통) + **keepout 표시 실크 원 Ø7**(칼라 Ø5.8·보스 Ø6.6 면접촉 — 반경 3.5 부품·트레이스 금지).

## 4. 핫스왑 (Kailh MX 소켓, ai03 표준 지오메트리)

스위치 풋프린트별 수술(THT 핀 → 소켓):

- 기존 핀 PTH(Ø2.5패드/드릴1.5, pad1·pad2) → **NPTH Ø3.05**(소켓 배럴 안착 구멍, net 제거).
- **B.Cu SMD 사각 패드 2개 추가**(소켓 접점 납땜 자리 = "네모난 부분"): 로컬 **(−7.035, −2.54)·(5.765, −5.08), 크기 2.9 × 2.5**. net = 기존 핀 net 승계(pad1 자리=COLx, pad2 자리=Net-(Dx-A)). (ai03 표준 −6.585/5.32·2.55×2.5는 패드가 배럴 홀과 0.025 겹쳐 solder_mask_bridge DRC 60건 → 바깥으로 0.45 이동 + 0.35 확폭. 마스크 클리어 + 손납땜 면적 확대)
- 중심 Ø4·5핀 고정 Ø1.75 NPTH는 기존 유지.

## 4.5 기존 자동배선 제거

- 원본은 kbplacer가 **이미 배선**(left 123 트랙) — 구 THT 핀 기준이라 NPTH 전환 후 전부 무효(hole_clearance 129건). **트랙·비아 전삭제**(클린 라우팅 전제, net은 패드에 남아 ratsnest로 표시).

## 5. 검증·산출 (매 수정 후)

```bash
KICAD=/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli
$KICAD pcb drc 65/pcb/left/keyboard/keyboard.kicad_pcb   # DRC 리포트
$KICAD pcb export svg ...                                 # 육안 확인용 F/B 렌더
```

- 전수 확인 항목: 다이오드 홀 60/70개(net 매핑 정합) · NPTH 6 좌표 · 외곽 치수 · SMD 패드 net.
- **최종 재검증(2026-07-07, 라우팅 직전 상태 확정)**: ① DRC error 0 / warning은 silk_over_copper 31/37(실크 라벨이 NPTH 위 — 제조 시 자동 클리핑, 무해)뿐 ② ERC는 lib_symbol_issues(kbplacer 'SW_stab' 심볼이 전역 라이브러리에 없음 — 스키마틱 내 임베드 캐시로 동작, 무해)뿐 ③ 기하·매트릭스 넷·sch↔pcb 넷리스트 diff 전부 재통과 ④ 스태빌 풋프린트도 로컬 라이브러리 역저장(전 풋프린트 로컬화 완료). **unconnected 78/92 = 라우팅 대상 그 자체 — 라우팅만 남음.**
- **결과(2026-07-07)**: 양측 **DRC error 0**(unconnected 78/92는 라우팅 전 ratsnest — 정상). 전수검증(`65/docs/utils/pcb-verify.py`) 통과: 외곽 146.35/165.40×108.25 · 마운트 6×Ø5.4 좌표 일치 · 다이오드 30/35 net 정합 · 스위치 30/35 SMD2+배럴2 · 잔여 트랙 0. 육안: `65/pcb/{left,right}/render-{top,bottom}.png`.
- **웹뷰어 연동(2026-07-07)**: `kicad-cli pcb export glb --board-only --include-pads --include-silkscreen --include-soldermask` → `assets/models/pcb/{left,right}.glb`(m 단위·Y-up). `65/viewer/pcb-model.ts`가 rotateX 90°+×1000+z=pcbBottom으로 케이스 좌표에 정합, `project.ts`가 절차적 PCB를 GLB로 스왑(로드 실패 시 절차적 유지). PCB 레이어 토글·색·투명도 그대로 적용. **PCB 재가공 시 glb 재export 필수.**
- **재현**: raw zip 전개 → `65/docs/utils/pcb-surgery.py`(KiCad 내장 python으로 실행, 원샷) → DRC 0 확인됨. `PCB_PATH` env로 대상 오버라이드 가능.
- **pcbnew 스크립팅 함정(재발 방지)**: ① `import wx; wx.App()` 선행 필수 ② 생성 객체(PAD/FOOTPRINT/PCB_SHAPE)는 `thisown=0` 후 Add(아니면 GC가 해제→C++ length_error) ③ `SMDMask().FlipStandardLayers()` 체이닝 금지 — 임시 LSET 해제된 참조 반환, 변수로 고정 ④ `board.Remove(track)`를 작업 앞에 두면 이후 SWIG 래퍼 깨짐 → **트랙 제거는 저장 직전에**.
- **스키마틱 정합 완료(2026-07-07)**: 다이오드 심볼(D_Small, 1=K/2=A) 유지 + Footprint를 `Diode_THT:D_DO-35_SOD27_P7.62mm_Horizontal`로, Value `D`→`1N4148`로 갱신(30/35개). 마운트홀 H1~6은 **board-only 속성**(스키마틱에 없어도 sync가 안 지움). 검증: `kicad-cli sch export netlist` ↔ 보드 패드 넷 **전수 diff — left 120/120, right 140/140 노드 일치, mismatch 0, 고아 패드 0**(`docs/utils` 아님, scratch `sch-pcb-diff.py` — 재검증 시 재작성 용이). 이제 "Update PCB from Schematic" 실행해도 안전(풋프린트 ID 일치·넷 동일). **"Update Footprints from Library"도 안전(2026-07-07)**: 보드의 수술본을 프로젝트 로컬 라이브러리 마스터로 역저장(`65/docs/utils/pcb-lib-sync.py`) — `footprints/Switch_Keyboard_Cherry_MX.pretty`(핫스왑판 덮어씀) + 신규 `Diode_THT.pretty`·`MountingHole.pretty` + fp-lib-table 등록(프로젝트 테이블이 전역 닉네임을 섀도잉). 보드↔라이브러리 마스터 pad 전수 diff **identical** 확인. 이후 풋프린트 형상 수정은 **로컬 .pretty를 고치고 Update Footprints from Library로 내리는** 정석 흐름 사용.

## 5.5 실크 전삭제 + JLCPCB 제조 룰 적용 (2026-07-07, 사용자 지시)

- **실크 전삭제**: 실크 도형(스위치 외곽·스태빌 외곽·keepout 링 등) left 132 / right 152개 제거 + 실크 레이어의 Reference/Value 필드 31/37개 hide. pcbnew 리스트 프록시가 제거 중 무효화되는 문제로 **s-expression 텍스트 처리**(`65/docs/utils/pcb-strip-silk.py`, 균형괄호 파서)로 수행. 라우팅도 재확인 삭제(0 유지). 로컬 라이브러리 마스터 재동기화(diff identical).
- **JLCPCB 룰**(공식 capabilities 페이지, 2레이어 1oz 기준) → `.kicad_pro` design rules + Default 넷클래스:

| 룰                              | JLC 스펙           | 적용값                                                                                                  |
| ------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------- |
| min track / clearance           | 0.10 / 0.10        | **0.15 / 0.15** (여유)                                                                                  |
| 넷클래스 기본 track / clearance | —                  | **0.25 / 0.2** (손라우팅 권장)                                                                          |
| via (dia/drill)                 | 0.25/0.15 min      | 넷클래스 **0.6/0.3**, min 0.5/애뉼러 0.13                                                               |
| min PTH drill                   | 0.15~              | 0.3                                                                                                     |
| copper↔board edge               | ±0.2 공차          | **0.5**                                                                                                 |
| hole-to-hole                    | pads 0.45          | **0.4** — 스위치 풋프린트 고유 기하(5핀 고정홀↔소켓 배럴 0.44)가 전 시판 핫스왑 보드 공통이라 예외 수용 |
| hole↔copper(타넷)               | NPTH-trace 0.2     | 0.25                                                                                                    |
| silk 최소                       | 폭 0.15 / 높이 1.0 | 1.0/0.15 (실크 없음, 향후 대비)                                                                         |

- 적용 후 **DRC error/warning 0** (unconnected 78/92 = 라우팅 대상만 잔존).

## 6. 라우팅 완결 + 발주 파일 (2026-07-08 최종)

- **최종 배선(사용자, J1 버스 포함)**: left 270 / right 340 트랙, 전부 0.25mm, **비아 0**(F.Cu=ROW 가로, B.Cu=COL 세로+다이오드 링크), 총 2,331 / 2,655mm.
- **최종 검증**: JLC 룰 DRC **위반 0 + 미연결 0**(양측) · sch↔pcb 넷리스트 132=132/153=153 mismatch 0. 이력: 1차에서 COL 전체 누락 발견→보완, 2차에서 J1 미배선→보완.
- **발주 파일(2026-07-08)**: `65/pcb/order/{left,right}/`(거버 7레이어 protel 확장 + 병합 엑셀론 드릴) → **`65/pcb/order/jlcpcb-{left,right}.zip`** 업로드용. 명령: `kicad-cli pcb export gerbers --layers F.Cu,B.Cu,F.Mask,B.Mask,F.SilkS,B.SilkS,Edge.Cuts` + `export drill --format excellon --excellon-units mm --drill-origin absolute`.
- **발주 전 최종 대조(거버 실측 ↔ 케이스 SSOT)**: 프리플라이트 DRC 0 · Edge.Cuts bbox 146.35/165.40×108.25 정확 일치(0.001mm) · Ø5.4 드릴 6좌표 = mountHoles 일치 · 공구별 홀 수 전수 일치(0.8×60/70 · 1.0×12/13 · 1.75 · 3.05 · 4.0 · 5.4×6 · 스태빌) · J1 = 크래들 직상부 · 기둥 관통 필요폭 5.052 < 5.4.
- **JLC 주문 옵션(확정)**: left·right **별도 주문 2건**(Different Design 1 유지) · 2층 · 1.6mm · **흰색** · FR4 TG135 · **LeadFree HASL 권장** · 1oz · Outline ±0.2 · Confirm production file No · Remove Mark · 실크 없음.
- 잔여 리스크(주문 시 인지): 케이스 실물(1/5→1:1) 미검증 상태의 선발주 — PCB↔케이스 인터페이스(외곽·6홀)는 확정 스펙이라 낮음.

## 7. 컨트롤러 — ESP32-C3 SuperMini (오프보드) + 와이어 패드열 J1

> 최초안(U1 풋프린트를 PCB에 직접 탑재)은 **폐기** — 보드가 스위치·소켓으로 꽉 차 모듈(18×23.5)이 앉을 자리가 없음(사용자 확인). **모듈은 케이스 하판에 부착**하고 PCB와 와이어로 연결한다.

- **PCB 쪽 연결점 = J1 와이어 패드열**(사용자 선택): 뒤쪽 여백(y −12)에 THT 패드 1줄 — **left 1×12, right 1×13**, 피치 2.54, Ø1.7/드릴 1.0, pin1 사각(방향 표식), 실크 0. 로컬 lib `footprints/Wire_Pads.pretty`.
- **핀 순서**: 1..N = **COL0..COL6(/7) → ROW0..ROW4** (left 7+5, right 8+5).
- **모듈 쪽 결선(조립 시 손배선)**: COLn↔GPIOn, ROW0~4↔GPIO8·9·10·20·21(LED·BOOT 핀은 입력측). 5V/3V3/GND는 모듈 USB 급전이라 불필요. 핀아웃 근거: sidharthmohannair/Tutorial-ESP32-C3-Super-Mini.
- **스키마틱**: J1 심볼(자작 1×N, 핀명=넷명) + 글로벌라벨 직결. 도구 `65/docs/utils/sch-add-wirepads.py` → `pcb-add-wirepads.py`(넷 배정+uuid 링크).
- **ESP32 콤보 풋프린트(THT 추가판)는 라이브러리에 보존**(`footprints/ESP32-C3_SuperMini.pretty`) — 미사용이지만 직탑재로 회귀 시 재사용 가능. SnapEDA 원본은 `65/raw/ESP32-C3_SUPERMINI_SMD.zip`.
- **검증**: sch↔pcb 넷리스트 diff **132=132 / 153=153, mismatch 0** · DRC 위반 0 · 미연결 12/13 = J1↔버스 라우팅 대상 · 라이브러리 마스터 identical.
- **잔여**: ① J1 위치 확정(사용자, 현재 뒤쪽 여백 중앙) ② COL/ROW 버스 → J1 라우팅 ③ ~~케이스 모듈 부착~~ → 완료: 하판 슬라이드 크래들(PROCESS §4.2) ④ 최종 DRC → 거버.
