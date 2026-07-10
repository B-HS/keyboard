# plate 조립 경로 부재 (captive plate) — 홀 확대 + 기둥 일정화 + 틸트 삭제

## 증상

- 분리 plate(기둥 홀 Ø3.4)를 top(베젤+기둥 일체)에 **물리적으로 설치할 방법이 없음**.
- CAD 단면상 최종 위치(넥 Ø3.0 관통, 렛지 안착)는 성립하지만, 그 위치에 **도달하는 삽입 경로가 존재하지 않음**.
- 사용자 실출력(right-top)에서 발견. 웹 export(`stl-parts.ts`)에는 plate 자체가 누락되어 있었음(top/bottom/mock-pcb만 6장).

## 원인

기둥 단면이 베젤→끝단으로 넥 Ø3.0 → 몸통 Ø4.8 → 캡 Ø5.8 → 몸통 Ø4.8 순이라, plate가 넥 구간에 도달하려면 Ø3.4 홀이 Ø4.8·Ø5.8을 통과해야 함. 반대 방향(plate 선치 후 top 하강)도 동일 간섭. 설계 시 **최종 배치만 검증하고 조립(삽입) 경로를 검증하지 않은 것**이 근본 원인. `fdm-m1-case.md`의 "plate·PCB는 고정 슬롯에 갇힘(무나사 캡처)" 서술이 실제로는 "설치 불가"였음.

## 해결 (2026-07-10, 사용자 확정)

1. **plate 홀 Ø3.4 → Ø6.4** (`PLATE_NECK_CLEARANCE_DIAMETER` → `PLATE_PILLAR_CLEARANCE_DIAMETER`): 기둥 최대 단면(캡 Ø5.8)을 통과. plate는 top이 아니라 **스위치 클립으로 PCB와 샌드위치**가 되어 고정(트레이마운트 표준 방식). 상하 = 베젤 밑면(plateTop 5.0)과 스위치 스택이 클램프, 좌우 = 스위치가 plate 컷아웃·PCB 홀에 동시 결합.
2. **기둥 넥 제거** (`PILLAR_PLATE_NECK_DIAMETER` 삭제): 렛지·넥의 존재 이유(plate 안착) 소멸 → 캡 위부터 베젤 밑면까지 몸통 Ø4.8 일정.
3. **7.5° 틸트 삭제** (`TILT_DEG = 0`): 틸트 기하 유틸(tiltGeom/tiltRise/tiltY/경사면 컷)은 파라메트릭 기능으로 유지하되 각도 0으로 항등화. top 높이 26.8→15.1, bottom 17.0→5.0, 총 스택 16.6mm.
4. **웹 export에 plate 추가**: 측당 4장(top/plate/bottom/mock-pcb), 좌우 8장.
5. **발주된 PCB(마운트홀 Ø5.4)는 무변경 호환** — 캡 Ø5.8에 걸려 정지하는 시트 기능 유지.

## 조립 순서 (확정)

책상에서 plate에 스위치 체결 + PCB 결합(샌드위치) → 뒤집은 top 기둥에 샌드위치 삽입(plate Ø6.4 전부 통과, PCB Ø5.4 캡에 정지) → bottom(보스 보어 Ø5.0에 기둥 끝 Ø4.8) → 하단 M1 체결 → 뒤집기.

## 교훈

- **조립성 검증은 최종 배치가 아니라 삽입 경로**: 단차 있는 축(기둥)을 지나는 모든 판의 홀은 "최종 위치의 단면"이 아니라 "경로상 최대 단면"보다 커야 한다.
- 1/5 검증 출력 항목에 "plate 안착"이 있었지만 실제 관통 시도가 없어 잡지 못함 — 검증 체크는 실동작으로.

## 대상 파일

- `65/config/dimensions.ts` — TILT_DEG 0, PLATE_PILLAR_CLEARANCE_DIAMETER 6.4, 넥 상수 삭제
- `65/parts/case-fdm.ts` — pillarSolid 넥 구간 제거(몸통 Ø4.8을 plateTop까지), plate 홀 상수 교체
- `65/export/stl-parts.ts` — plate 파트 추가
