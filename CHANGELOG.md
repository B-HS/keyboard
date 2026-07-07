# Changelog

이 저장소의 주요 변경을 버전별로 기록한다. 형식은 [Keep a Changelog](https://keepachangelog.com), 버저닝은 [SemVer](https://semver.org)를 따른다.

## [Unreleased]

### Added

- keypad 발주용 PCB `keypad/pcb`(raw 복사, KiCad): Edge.Cuts 외곽 86.2×105.25 R1 + M2 마운트홀 6개(Ø2.4 NPTH + 키프아웃 Ø5) + 다이오드 19개: SMD(`D_SOD-123`) 제거 → **PCB는 손납땜 구멍(THT 패드 2개, 외형·기호·라벨 제거, net 유지)만**, **스키마틱은 다이오드 심볼 삭제**. 1N4148(DO-35)을 구멍에 직접 손납땜.
- 다이오드 레퍼런스 `docs/reference/1n4148-diode.md`.
- PCB 빌드 재현 스크립트 `keypad/docs/utils/`(`build-pcb.py`·`dump-layout.mjs`, config SSOT 기반).

### Changed

- keypad 레이아웃 교체(사용자 제공 새 PCB/plate): **세로 2u 제거 → 우측 열 전부 1u, 19키**. config `SWITCHES` 19 / `STABS` 가로 2패드, raw(`split-keycad-pcb`·`split-keypad.jscad`) 교체. 세로 스태빌이 없어져 우변중점 M2홀 충돌이 사라져 케이스 여백은 원래 `CASE_MARGIN` 5 유지(외곽 86.2×105.25). (이전 세로2u 레이아웃에선 좌우 여백을 7로 늘려 회피했으나 폐기)
- 컨트롤러 ESP32-S3-SuperMini 풋프린트 받음(`keypad/docs/utils/ESP32-S3-SuperMini.kicad_mod`). PCB 추가는 보류 — KiCad 스키마틱에서 ESP32 배치 + GPIO(1~~5=ROW0~~4, 6~~9=COL0~~3) 배선 → Update PCB 정석으로 사용자가 진행.

## [0.0.1] - 2026-06-27

버저닝 시작(브랜치 `v0.0.1`). 단일 split-65 프로젝트를 **monorepo(공유 렌더러 + 프로젝트별 독립)** 로 재편하고, 저손실 prototype인 **split-keypad(17키)** 를 도입했다.

### Added

- `src/renderer/` 공유 three.js 렌더러(scene·jscad-to-three·instancing·models). models는 프로젝트 config를 주입(`dims`)받도록 파라미터화.
- `src/main.js` 공유 셸: 프로젝트들(65+keypad)을 씬 유닛으로 받아 한 화면에 동시 배치 + 통합 토글/투명도.
- `keypad/` — split-keypad 프로젝트: `config/`·`parts/`·`viewer/`·`export/`·`raw/`(jscad + KiCad PCB)·`docs/`.
- vite alias: `@renderer` · `@65` · `@keypad`.
- `CHANGELOG.md`, `docs/acknowledge/monorepo-keypad-migration.md`.
- keypad 뷰어 실렌더: `keypad/parts`(plate 회전 스태빌라이저·top-frame 세로 2u vSpan)·`keypad/viewer/case-meshes`·`keypad/project.js`(단일 플레이트 씬 유닛).
- keypad DXF export: `keypad/export`(측당 5장) + scripts `export:keypad`·`smoke:keypad`.
- keypad 발주 준비 docs: `pcb-requirements`·`bom`·`quality-assurance`(PCB 상태 점검 + 외곽 86.2×105.25·M2홀 6좌표).

### Changed

- split-65 전부 `65/`로 이동(`config`·`parts`·`viewer`·`export`·`raw`). 기존 `src/main.js` → `65/project.js`(`createProject`).
- export 산출물 → `65/export-out/`. npm script: `export`→`export:65`, `smoke`→`smoke:65`.
- `package.json` version 0.1.0 → 0.0.1, description를 monorepo로 갱신.
- 뷰어: 프로젝트 드롭다운 전환 → **65+keypad 한 화면 동시 렌더**(`b1bb12e`). project는 DOM/카메라 부수효과 없는 씬 유닛 반환, `src/renderer/opacity.js` 공통화.

### Fixed

- 세로 2U 키캡(+·Enter): 90° 회전 대신 `vSpan` 만큼 **height(세로) 스트레치**(`cbf2487`). `pickCap`이 행 프로파일 내 근접 폭 캡 선택 → 가로 2U "0"이 스페이스바형(R1)이 아닌 평면형(R4). 폴백 박스 프리뷰도 vSpan 반영.

### Verified

- `smoke:65` 통과, `export:65` DXF 10장 재편 이전과 **byte-identical**(md5 동일), `vite build` 통과(65·keypad 청크 분리).
- keypad: `smoke:keypad`(17키·bezel224/plate4720/bottom1316 polys)·`export:keypad`(DXF 5장)·`vite build`·`prettier` 통과.

### Deferred

- 65 전용 docs의 `65/docs/` 재배치는 cross-reference 보존을 위해 별도 단계로 보류(루트 `docs/`는 umbrella 유지).
