/**
 * 49-pcba viewer 시각 상수 단일 출처.
 * 형상 상수 (KEYBOARD_GEOMETRY) 와 분리 — viewer 렌더링 옵션만.
 *
 * 부품별 (color / metalness / roughness / opacity) 묶음.
 * mesh 컴포넌트들이 default 로 참조 — viewer page 에서 prop 으로 override 가능.
 */
export const VIEWER_STYLE = {
    plate: {
        // JLC3DP 9600 photopolymer 레진 (매트 흰색).
        color: '#ebebe5',
        metalness: 0,
        roughness: 0.75,
        opacity: 0.5,
    },
    pcb: {
        color: '#0d4a2a',
        metalness: 0.1,
        roughness: 0.75,
        opacity: 0.5,
    },
    housingTop: {
        // 9600 레진 (plate 와 동일 출력본).
        color: '#ebebe5',
        metalness: 0,
        roughness: 0.75,
        opacity: 0.5,
    },
    housingBottom: {
        // 9600 레진 (plate / housing-top 과 동일 출력본).
        color: '#ebebe5',
        metalness: 0,
        roughness: 0.75,
        opacity: 0.5,
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
        roughness: 0.75,
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
    lolinPcb: {
        // LOLIN S3 Mini V1.0.0 보라 솔더마스크.
        color: '#5a2a8a',
        metalness: 0.15,
        roughness: 0.7,
        opacity: 1,
    },
    lolinUsbC: {
        // USB-C 단자 메탈 쉘.
        color: '#9095a0',
        metalness: 0.7,
        roughness: 0.4,
        opacity: 1,
    },
} as const

export type ViewerStyle = typeof VIEWER_STYLE
