/**
 * 49-pcba 키 배치 정의.
 * keyboard-plate-extended.jscad 의 switch_NN 좌표와 1:1 일치한다.
 * (cx, cy) 는 jscad 좌표계 (origin = layout 좌상단, +X 우, +Y 위, plate Z 무관).
 * row 는 keycap profile 매핑용 (R1=0, R2=1, R3=2, R4=3).
 */

export type KeyDef = {
    id: string
    cx: number
    cy: number
    /** width in U (1, 1.25, 1.5, 2, 2.75, ...) */
    w: number
    row: 0 | 1 | 2 | 3
    /** Cherry MX 스타빌라이저 장착 여부 */
    hasStab?: boolean
}

const ROW_Y = [0, -19.05, -38.1, -57.15] as const

const row0: KeyDef[] = Array.from({ length: 14 }, (_, i) => ({
    id: `r0-${i}`,
    cx: i * 19.05,
    cy: ROW_Y[0],
    w: 1,
    row: 0,
}))

const row1: KeyDef[] = [
    { id: 'r1-0', cx: 4.763, cy: ROW_Y[1], w: 1.5, row: 1 },
    ...Array.from({ length: 11 }, (_, i) => ({
        id: `r1-${i + 1}`,
        cx: 28.575 + i * 19.05,
        cy: ROW_Y[1],
        w: 1,
        row: 1 as const,
    })),
    { id: 'r1-12', cx: 242.888, cy: ROW_Y[1], w: 1.5, row: 1 },
]

const row2: KeyDef[] = [
    { id: 'r2-0', cx: 9.525, cy: ROW_Y[2], w: 2, row: 2, hasStab: true },
    ...Array.from({ length: 10 }, (_, i) => ({
        id: `r2-${i + 1}`,
        cx: 38.1 + i * 19.05,
        cy: ROW_Y[2],
        w: 1,
        row: 2 as const,
    })),
    { id: 'r2-11', cx: 238.125, cy: ROW_Y[2], w: 2, row: 2, hasStab: true },
]

const row3: KeyDef[] = [
    { id: 'r3-0', cx: 0, cy: ROW_Y[3], w: 1, row: 3 },
    { id: 'r3-1', cx: 21.431, cy: ROW_Y[3], w: 1.25, row: 3 },
    { id: 'r3-2', cx: 45.244, cy: ROW_Y[3], w: 1.25, row: 3 },
    { id: 'r3-3', cx: 83.344, cy: ROW_Y[3], w: 2.75, row: 3, hasStab: true },
    { id: 'r3-4', cx: 119.063, cy: ROW_Y[3], w: 1, row: 3 },
    { id: 'r3-5', cx: 154.781, cy: ROW_Y[3], w: 2.75, row: 3, hasStab: true },
    { id: 'r3-6', cx: 190.5, cy: ROW_Y[3], w: 1, row: 3 },
    { id: 'r3-7', cx: 209.55, cy: ROW_Y[3], w: 1, row: 3 },
    { id: 'r3-8', cx: 228.6, cy: ROW_Y[3], w: 1, row: 3 },
    { id: 'r3-9', cx: 247.65, cy: ROW_Y[3], w: 1, row: 3 },
]

export const KEY_DEFS: ReadonlyArray<KeyDef> = [...row0, ...row1, ...row2, ...row3]

/**
 * Cherry MX 스타빌라이저 와이어 간격 (mm). 와이어 끝이 스템 중심에서 ±값.
 */
export const STAB_SPACING_BY_WIDTH: Record<number, number> = {
    2: 11.938,
    2.25: 11.938,
    2.5: 11.938,
    2.75: 11.938,
    3: 11.938,
    6.25: 50,
    7: 57.15,
}
