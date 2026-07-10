# top STL이 7.5° 틸트가 남은 채 export되던 문제

> 2026-07-10 · 수정 커밋 `ebfd2b5` · 원인 도입 커밋 `d81435d`(7.5° 틸트)

## 증상

`export:65-fdm`(CLI)·웹패널 STL Export 양쪽에서 **top 파츠가 7.5° 기운 채** STL로 나옴. 슬라이서에서 베젤이 베드 대비 기울고 기둥은 그 베젤 대비 또 기울어 보여 "각도에 각도가 들어간" 형태. 베드(z=0) 접촉면 실측 **146.3 × 0.8mm** — 베젤 한쪽 모서리 띠만 닿아 출력 불가 자세.

## 원인

`d81435d`에서 `buildTopFdm3D`의 베젤이 `tiltGeom`(+7.5°)으로 기울게 되었는데, export 시 **plate에만 `untiltGeom`(−7.5° 역회전)을 적용하고 top에는 누락**. top은 `flipZ`만 거쳐 틸트가 STL에 그대로 baked. 기둥은 케이스 좌표에서 수직이므로 실제로는 베젤만 기운 상태.

- 누락 지점: `65/export/export-fdm.ts`(CLI) · `65/export/stl-parts.ts`(웹) 의 top 라인

## 해결

두 export 경로의 top을 `flipZ(untiltGeom(buildTopFdm3D(side)))` 로 변경 — **untilt 먼저, flip 다음** 순서. 뷰어 렌더(`buildTopFdm3D` 자체)는 미변경이라 화면에서는 틸트 유지, export 시에만 제거.

결과 자세: 베젤 상면이 베드에 평평히 밀착, 기둥이 7.5° 기운 채 위로 서는 무서포트 출력 자세(마감 결정과 부합).

## 검증

- 베드 접촉 footprint(z 0~0.1 슬랩 교집합): 수정 전 146.3 × **0.8** → 수정 후 146.4 × **108.2mm**(베젤 면 전체)
- `export:65-fdm` 재실행: left-top **146.4 × 108.2 × 26.8mm**(수정 전 z 27.0)
- `typecheck` · `format:check` · `smoke:65` 통과

## 교훈

틸트처럼 파츠 공통 변환을 도입할 때는 **모든 export 경로(CLI + 웹)의 전 파츠**에 untilt 필요 여부를 일괄 점검한다. plate만 고치고 top을 빠뜨린 것이 원인.
