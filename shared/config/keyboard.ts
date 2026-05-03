/**
 * 49-pcba plate / housing 공통 좌표 상수.
 * .jscad 파일들과 동기 유지 — 변경 시 양쪽 모두 갱신.
 */
export const KEYBOARD_GEOMETRY = {
    plateCenterX: 123.825,
    plateCenterY: -28.575,
    plateWidth: 271.65,
    plateDepth: 81.15,
    plateThickness: 1.5,
    /** plate Y 최소값 (= 앞쪽 가장자리). tilt 회전 pivot용. */
    plateMinY: -69.15,
    /** plate 하면 Z (jscad coord, desk 기준). */
    plateFrontBottomZ: 7,
    /** tilt 없음 (외부 wedge로 처리). */
    plateTiltDeg: 0,
    /** PCB 두께 (mm). */
    pcbThickness: 1.6,
    /**
     * 케이스 floor 바닥 Z (jscad coord).
     * housing-top/bottom .jscad 의 (BC_FLOOR_THICKNESS - CASE_EXTRA_DEPTH) - BC_FLOOR_THICKNESS = -CASE_EXTRA_DEPTH 와 일치.
     * old STL 정렬 등 외부 비교 기준점.
     */
    caseFloorBottomZ: -5,
} as const
