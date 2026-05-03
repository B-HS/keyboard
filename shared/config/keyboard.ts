/**
 * 49-pcba 단일 출처 형상 상수.
 * jscad 파일들은 evaluator 가 prelude 로 주입하는 KEYBOARD_GEOMETRY 를 직접 참조한다 —
 * 여기만 수정하면 viewer / STL export 양쪽이 동일하게 갱신된다.
 *
 * 좌표계: jscad coord, desk 면 = z 0.
 */
export const KEYBOARD_GEOMETRY = {
    // === Plate 외곽 ===
    plateCenterX: 123.825,
    plateCenterY: -28.575,
    plateWidth: 271.65,
    plateDepth: 81.15,
    plateThickness: 1.5,
    /** plate Y 최소값 (= 앞쪽 가장자리). tilt 회전 pivot용. */
    plateMinY: -69.15,
    /** tilt 없음 (외부 wedge로 처리). */
    plateTiltDeg: 0,

    // === Z 스택 ===
    /** plate 하면 Z. PCB 상면과 3.5mm 갭 (MX 스위치 클립 표준). */
    plateFrontBottomZ: 10.5,
    /** PCB 하면 Z. plate 와 독립 — 사이 3.5mm 는 스위치 본체 공간. */
    pcbFrontBottomZ: 5.4,
    pcbThickness: 1.6,
    /** 케이스 floor 바닥 Z. */
    caseFloorBottomZ: -2,

    // === 케이스 두께 ===
    /** floor 두께. */
    caseFloorThickness: 4,
    /** plate 위 ㄱ자 lip 수직 두께. */
    lipThickness: 6,
    /** lip 안쪽 폭 (키캡 개구부 가림). */
    lipOverhang: 2,
    /** plate 외곽 ↔ 케이스 내벽 클리어런스. */
    plateClearance: 0.25,
    /** 케이스 외곽 4코너 round R. */
    caseCornerRadius: 1.5,
    /** 코너 분할 segment 수. */
    caseCornerSegments: 32,

    // === M2 인서트 / 나사 ===
    /** M2 인서트 외경 R. */
    insertRadius: 1.6,
    /** M2 인서트 박힘 깊이 (top housing 외벽 안). */
    insertDepth: 4,
    /** 나사 끝 ↔ 코너 round tip 여유 (WALL_THICKNESS / SCREW_OFFSET 산출용). */
    screwTipMargin: 3.0,
    /** through hole R (bottom). */
    screwThroughRadius: 1.25,
    /** 나사 머리 자리 R. */
    screwHeadRadius: 2.0,
    /** 나사 머리 자리 깊이 (floor 하면에서). */
    screwHeadDepth: 2.0,

    // === Bottom supportRing ===
    /** PCB 받침 ring 폭. 두꺼우면 스위치 핀 / 핫스왑 간섭. */
    supportRingWidth: 3,
    /** ring 이 floor 안으로 묻히는 깊이 (coplanar 회피). */
    supportRingFloorOverlap: 0.5,

    // === PCB ===
    /** PCB 4코너 round R. */
    pcbCornerRadius: 1,
} as const

export type KeyboardGeometry = typeof KEYBOARD_GEOMETRY
