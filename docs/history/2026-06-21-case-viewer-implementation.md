# 2026-06-21 — 케이스 + three.js 뷰어 구현

> ⚠️ **이 문서는 2026-06-21 구현 시점의 스냅샷이다.** 이후 설계가 **관통 볼트 클램프(인서트 0)** 로 바뀌어 일부 서술은 현재와 다르다: 상판 프레임은 **2겹**(frame-upper/lower)으로 분리, 보강판은 둘레벽 없는 1겹, export는 **DXF만**(STL 미생성) 측당 4장(=8장), 개구부 클리어런스는 LATERAL_CLEARANCE **1.25/side**. 현재 상태는 `docs/PROCESS.md` + `case-construction.md` §12. 아래는 당시 기록(원문 유지).

## 한 일

설계 B(스페이서 샌드위치) 케이스를 JSCAD로 모델링하고, three.js 실시간 뷰어와 CNC(DXF)/3D(STL) export를 구현했다.

### 스택

- Bun 1.3.11 + Vite 8 + three.js 0.184 + @jscad/modeling 2.13 + @jscad/stl-serializer·dxf-serializer 2.1.

### 구조

```
src/
  config/dimensions.js   확정 치수·Z스택 상수 (SSOT)
  config/layout.js       좌30·우35 스위치 좌표 + bbox/케이스외곽/개구부/M3홀 유도
  parts/shapes.js        rect, mountHoleCuts 공용
  parts/plate.js         보강판 1.5mm + 컷아웃 + 스태빌라이저 + M3홀
  parts/top-frame.js     상판 프레임 3mm (개구부 = 키+3mm/side) + M3홀
  parts/bottom-plate.js  하판 3mm + M3홀
  viewer/jscad-to-three.js  geom3.toPolygons → BufferGeometry (fan)
  viewer/scene.js        three 씬/카메라/조명/OrbitControls (root는 -90°X로 Z-up→Y-up)
  viewer/case-meshes.js  5계층 메시 + 스위치/키캡 박스
  viewer/models.js       실제 스위치 WRL 로더 (KiCad 2.54 스케일)
  main.js                토글 UI · 측 전환
  export/export.js       부품별 STL+DXF → export-out/
  export/smoke.js        부품 생성 검증
assets/models/switch/silent_alpaca.wrl, keycap/keycaps.json
```

## 검증

- `bun run smoke`: 좌30·우35키, 케이스 좌 151.35×113.25 / 우 170.4×113.25, 홀 8.
- `bun run export`: 12파일(좌우 × plate/top-frame/bottom × STL+DXF). DXF 유효 AutoCAD, STL 바이너리.
- `bun run build`: 427모듈 OK.
- 브라우저 라이브 렌더: 노란 프레임·파란 보강판·초록 PCB·검은 하판·키캡 well, M3홀 8개, Z스택 정확. 스위치 WRL 토글 시 모델 로드 확인.

## 발견 / 결정

1. **케이스 외곽 확대 필수**: KLE-NG plate 외곽은 키 테두리 2.35~3.35mm뿐 → M3홀 불가. `CASE_MARGIN=9mm`로 키 bbox에서 확대. PCB 외곽도 이에 맞춤(→ `pcb-outline-requirements.md` 갱신).
2. **M3홀 8개/측**: 키 bbox+6mm(=클리어런스3+마진9의 중앙선)의 모서리·변중점. 키 간섭 없음.
3. **WRL 스케일**: KiCad VRML 1unit=2.54mm. 6.14→15.6mm.
4. **코드 규약**: 주석 없음, arrow function, named export, kebab-case, 추론 우선. JS(ESM) — JSCAD 생태계 JS-first 및 OpenJSCAD 호환 고려.

## 남은 일

- 실제 스위치 WRL의 수직 정렬(z 오프셋)·키캡 실제 모델은 라이브에서 미세조정.
- `left.jscad`/`right.jscad`(KLE-NG 원본)는 보존. 보강판 SSOT는 `src/parts/plate.js`(M3홀 포함). 필요 시 원본 .jscad도 동기화.
- PCB Edge.Cuts·M3홀(사용자), 컨트롤러 연결.
