/**
 * 49-pcba 단일 출처 형상 상수.
 * 49-pcba/build/*.ts 가 이 객체를 직접 import — viewer / STL export 양쪽 동일.
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
    /** plate Y 최소값 (= 앞쪽 가장자리). tilt 회전 pivot. */
    plateMinY: -69.15,
    /** plate tilt 각도 (도, 양수 = 앞낮 뒤높). 케이스 wedge / plate / PCB / switch / keycap 모두 적용. */
    plateTiltDeg: 0,

    // === Z 스택 (앞쪽 = pivot 기준 y=plateMinY) ===
    /** plate 하면 앞쪽 Z. PCB 상면과 3.5mm 갭 (MX 스위치 클립 표준). */
    plateFrontBottomZ: 10.5,
    /** PCB 하면 앞쪽 Z. plate 와 독립 — 사이 3.5mm 는 스위치 본체 공간. */
    pcbFrontBottomZ: 5.4,
    pcbThickness: 1.6,
    /** 케이스 floor 바닥 Z (수평, desk 안착). */
    caseFloorBottomZ: -2,

    // === 케이스 두께 ===
    /** floor 두께 (평면, desk 안착부). */
    caseFloorThickness: 3.5,
    /** bottom housing 의 측벽 높이. magnetSizeZ(5) + magnetClearance(0.15) + magnetZRecess(0.3) + magnetEdgeMargin(1.5) = 6.95 — pocket 아래 살벽 1.5mm 정확. */
    bottomWallHeight: 6.95,
    /** plate 위 ㄱ자 lip 수직 두께. */
    lipThickness: 6,
    /** lip 안쪽 폭 (키캡 개구부 가림). */
    lipOverhang: 2,
    /** plate / PCB 외곽 ↔ 케이스 내벽 공차 (mm). 사포질로 finish 한다는 전제 하에 0.05 — 출력 후 사용자가 fitting. */
    plateClearance: 0.05,
    /** 케이스 외곽 4코너 round R. 자석 pocket 직각 모서리와 sliver 회피 위해 작게 (살벽 1.25 > R). */
    caseCornerRadius: 1,
    /** 코너 분할 segment 수. */
    caseCornerSegments: 36,

    // === 자석 결합 (네오디뮴 사각자석 10×5×2t, 세로 세움) ===
    /** 자석 X 방향 (측벽 길이 따라). 가로 10mm. */
    magnetSizeX: 10,
    /** 자석 Y 방향 (측벽 안 깊이, pocket 깊이 = 자석 두께 2t + clearance). */
    magnetSizeY: 2,
    /** 자석 Z 방향 (위/아래, 자석 세로 5mm). 자석을 일으켜 세운 형태. */
    magnetSizeZ: 5,
    /** 자석 pocket 측면 여유 (각 변). 글루건 고정이라 0.15 충분 (출력 -0.2 오차에도 자석 빡빡해도 들어감). */
    magnetClearance: 0.15,
    /** 자석을 pocket 안에 매립하는 추가 깊이 (각 housing 측, 결합 면 기준). 글루건 채움 공간. 두 자석 거리 = 2*값 → 흡착력 trade-off. */
    magnetZRecess: 0.3,
    /** 자석 ↔ case 외곽 살벽 (JLC3DP 1.2mm thin wall 임계 위 안전 마진 + 0.3 → 1.5mm). */
    magnetEdgeMargin: 1.5,

    // === Bottom supportRing (PCB 받침, 4면 둘러싸기, tilt 따라감) ===
    /** PCB 받침 ring 폭. */
    supportRingWidth: 3,
    /** ring 이 floor 안으로 묻히는 깊이 (coplanar 회피 + tilt 회전 후 floor 와 overlap 보장). */
    supportRingFloorOverlap: 0.5,

    // === PCB ===
    /** PCB 4코너 round R. */
    pcbCornerRadius: 1,
} as const

export type KeyboardGeometry = typeof KEYBOARD_GEOMETRY
