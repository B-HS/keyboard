/**
 * 49-pcba viewer 시각 상수 단일 출처.
 * 형상 상수 (KEYBOARD_GEOMETRY) 와 분리 — viewer 렌더링 옵션만.
 *
 * 부품별 (color / metalness / roughness / opacity) 묶음.
 * mesh 컴포넌트들이 default 로 참조 — viewer page 에서 prop 으로 override 가능.
 */
export const VIEWER_STYLE = {
    plate: {
        color: '#a8acb3',
        metalness: 0.85,
        roughness: 0.35,
        opacity: 1,
    },
    pcb: {
        color: '#0d4a2a',
        metalness: 0.1,
        roughness: 0.7,
        opacity: 1,
    },
    housingTop: {
        color: '#1a1d24',
        metalness: 0.25,
        roughness: 0.55,
        opacity: 1,
    },
    housingBottom: {
        color: '#22262e',
        metalness: 0.2,
        roughness: 0.6,
        opacity: 1,
    },
    switch: {
        color: '#1d2024',
        metalness: 0.2,
        roughness: 0.65,
        opacity: 1,
    },
    keycap: {
        color: '#d6d6d9',
        metalness: 0.05,
        roughness: 0.7,
        opacity: 1,
    },
    oldTop: {
        color: '#5a5d63',
        opacity: 1,
    },
    oldBottom: {
        color: '#3a3d43',
        opacity: 1,
    },
} as const

export type ViewerStyle = typeof VIEWER_STYLE
