# PROCESS — split-keypad 현재 상태

> split-keypad 프로젝트 단일 출처. 상위(monorepo) 상태는 루트 `docs/PROCESS.md`, 재편 계획은 `docs/acknowledge/monorepo-keypad-migration.md`.
> 최종 갱신: 2026-06-27 (브랜치 `v0.0.1`, Phase 2~3 완료 + 뷰어 통합 렌더·2U 키캡 수정. Phase 4 발주 준비 문서 완료, 물리 발주는 사용자).

---

## 0. 한 줄 정의

KLE-NG로 생성된 **19키 단일 플레이트 넘패드**. split-65를 바로 출력/PCB 발주하기엔 손실이 커, **저손실 prototype**으로 먼저 검증한다. 공유 three.js 렌더러를 재사용하고, 케이스 지오메트리(parts/case-meshes/export)는 65를 복사해 독립적으로 발전시킨다.

---

## 1. raw 출처 (`keypad/raw/`)

- `split-keypad.jscad` — KLE-NG 생성 플레이트(OpenJSCAD v2). 좌표·치수의 출처(SSOT).
- `split-keycad-pcb/` — KiCad 풀세트(`keyboard/keyboard.kicad_pcb` + footprints + svg). 65 PCB보다 완성도 높음.

raw 사실:

- 플레이트 외곽 `roundedRectangle [80.9, 101.95] r1` @ `[28.575, -39.1]`.
- 스위치 컷아웃 **13.75mm** r0.5 (KLE-NG `cherry-mx-basic` 기본). ⚠️ 65는 13.95로 튜닝 — keypad 케이스 설계 단계에서 끼움 테스트 후 확정.
- 스태빌라이저 패드 6.75×14.75 r0.5.
- 키 19개(5행), 2u 키 1개: 가로 2u "0"(switch_16, u2)뿐. (사용자 새 PCB/plate로 교체 — 이전 세로 2u 2개는 우측 열 1u로 분리됨, 2026-06-27)

---

## 2. 현재 코드 (`keypad/`)

```
config/dimensions.js   치수 + Z스택. 65 미러 + SWITCH_CUTOUT=13.75 + CASE_MARGIN=5
config/layout.js       SWITCHES 19 + STABS 2(가로) → computeBbox(vSpan)/expandedRect/computeMountHoles → SIDES={main}
parts/                 65 복사: shapes·bottom-plate·spacer (그대로), plate(rot 스태빌), top-frame(vSpan 셀)
viewer/case-meshes.js  65 복사(side 구동). 스택 조립
project.js             createProject()→씬 유닛{group,bounds,layerKeys,setLayerVisible,setOpacity}. src/main.js 셸이 65와 한 화면에 동시 배치(드롭다운 없음). @renderer/models에 MODEL_DIMS 주입
export/                export.js(→keypad/export-out 5장)·smoke.js
pcb/                   발주용 PCB 편집본(raw 복사 → Edge.Cuts·M2홀·다이오드 D0-35). KiCad
raw/                   split-keypad.jscad + split-keycad-pcb (좌표 SSOT 원본, 불변)
docs/                  PROCESS·pcb-requirements·bom·quality-assurance + utils(빌드 스크립트)
```

유도값(`SIDES.main`): 키 19 · 케이스 외곽 **86.2×105.25**(R1, cx28.575/cy−38.1) · 마운트홀 6개(좌표 `docs/pcb-requirements.md` §3). 실행: `bun run dev`(65+keypad 동시) · `bun run smoke:keypad` · `bun run export:keypad`.
키캡: 가로 2u "0"은 행 프로파일 평면 캡. 세로 2u는 새 레이아웃에서 없어짐(vSpan height 스트레치 로직은 향후 호환용으로 코드에 남아 있으나 미사용).

---

## 3. 65 대비 차이

- **컷아웃**: 13.75(raw) vs 65의 13.95. CNC면 kerf 무관 → 실물 끼움으로 확정(미정).
- **스태빌라이저**: 가로 2u "0" 1개(rot 0). 새 레이아웃에서 세로 2u 스태빌 제거. (`plate.js` rot 지원·`top-frame.js` vSpan 셀 로직은 코드에 남아 있으나 현재 미사용)
- **세로 2u 키 없음**: 새 PCB는 우측 열 전부 1u. vSpan 로직은 향후 호환용으로 유지.
- **단일 플레이트**: 좌/우 분리 없음(`SIDES={main}`). 좌우 레퍼런스 없음.
- **케이스 결착**: 65 v3(일체형 상판 + M2 하단진입 + 좌우 벽) 그대로 채택. 단순화 여부는 실물 후 판단.

---

## 4. 남은 일

- [x] Phase 1: 설정(config/layout) 스캐폴딩 + raw 이동.
- [x] Phase 2: 65 parts 복사(plate rot·top-frame vSpan) + case-meshes + project 실렌더. 셸이 65와 한 화면에 동시 배치(케이스+스위치+키캡).
- [x] Phase 3: 케이스 스택(65 v3와 동일) → `export.js` → DXF 5장 + smoke.
- [x] Phase 4(준비): PCB 상태 점검 + `pcb-requirements.md`·`bom.md`·`quality-assurance.md` 작성.
- [x] Phase 4(PCB, 미커밋): `keypad/pcb` 발주본 — 사용자 새 PCB/plate(19키, 세로2u 제거)로 raw 교체. Edge.Cuts 외곽 86.2×105.25 R1 · M2홀 6(Ø2.4 NPTH + 키프아웃 Ø5) · 다이오드 19 **손납땜 구멍만**(PCB는 외형·라벨 제거한 THT 구멍 + net 유지, 스키마틱은 심볼 삭제; 1N4148 직접 손납땜). 세로 스태빌 없어 여백 5 유지(DRC hole_to_hole 0). 컨트롤러 ESP32-S3-SuperMini 풋프린트 받음 → PCB 추가 보류(스키마틱 배선→Update PCB 정석, `docs/utils`). (`docs/pcb-requirements.md`·`docs/reference/1n4148-diode.md`·`docs/utils`)
    - (이전 접근, 폐기) 세로2u 레이아웃에선 좌우 여백 5→7로 우변중점 M2홀↔세로2u 스태빌 충돌(0.18 겹침→0.56 gap)을 회피했으나, 새 레이아웃(세로2u 제거)으로 불필요해져 여백 5로 복원.
- [ ] Phase 4(실행, **사용자**): 핫스왑/컨트롤러·ROW 매트릭스 라우팅 반영(`pcb-requirements.md`) → CNC·PCB 발주 → 실물 조립·검증(`quality-assurance.md` B).
- [ ] Phase 5: keypad 실물 검증값(컷아웃 끼움·볼트 길이·벽 강성) → split-65 반영 후 65 발주(`quality-assurance.md` C).

> **자동화 가능한 범위(설계·뷰어·DXF·발주 스펙) 완료.** 이후는 물리 발주·조립(사용자)에서 진행.
