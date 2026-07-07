export const KEY_PITCH = 19.05

export const PLATE_THICKNESS = 1.5
export const TOP_FRAME_THICKNESS = 5.0
export const BOTTOM_THICKNESS = 1.5
export const PCB_THICKNESS = 1.6

export const SWITCH_CUTOUT = 13.95
export const SWITCH_CUTOUT_FDM = 14.0
export const SWITCH_CUTOUT_RADIUS = 0.5
export const STAB_PAD = { width: 6.75, height: 14.75, radius: 0.5 }
export const STAB_PAD_FDM = { width: 6.8, height: 14.8, radius: 0.5 }
export const OUTLINE_RADIUS = 1

export const LATERAL_CLEARANCE = 1.25
export const CASE_MARGIN = 5
export const KEYCAP_GAP = 1.05

export const MOUNT_HOLE_DIAMETER = 2.4
export const MOUNT_KEEPOUT_DIAMETER = 5
export const MOUNT_HOLE_INSET_FROM_EDGE = 2.5

export const PILLAR_BODY_DIAMETER = 4.8
export const PILLAR_PCB_CAP_DIAMETER = 5.8
export const PILLAR_PCB_CAP_HEIGHT = 0.8
export const PILLAR_PLATE_NECK_DIAMETER = 3.0
export const PLATE_NECK_CLEARANCE_DIAMETER = 3.4
export const PCB_MOUNT_HOLE_FDM = 5.4
export const BOTTOM_BOSS_OUTER_DIAMETER = 6.6
export const BOTTOM_BOSS_BORE_DIAMETER = 5.0
export const FDM_MARGIN_EXTRA = 1.5

export const M1 = {
    insertOuterDiameter: 2.0,
    insertLength: 2.5,
    insertBoreDiameter: 1.75,
    insertPocketDepth: 3.0,
    screwClearanceDiameter: 1.2,
    screwHeadDiameter: 2.0,
    screwHeadHeight: 0.8,
    screwMaxLength: 4.0,
}

export const PLATE_BOTTOM_TO_PCB_TOP = 3.5
export const BOTTOM_GAP = 3.5
export const PLATE_TOP_TO_STEM_TOP = 11.6

export const TILT_DEG = 7.5
export const TILT_ANGLE = (TILT_DEG * Math.PI) / 180
export const TILT_PIVOT_Y = -4 * KEY_PITCH
export const tiltRise = (y: number) => (y - TILT_PIVOT_Y) * Math.sin(TILT_ANGLE)
export const tiltY = (y: number) => TILT_PIVOT_Y + (y - TILT_PIVOT_Y) * Math.cos(TILT_ANGLE)

const plateTopZ = PLATE_BOTTOM_TO_PCB_TOP + PLATE_THICKNESS

export const Z = {
    pcbTop: 0,
    pcbBottom: -PCB_THICKNESS,
    plateBottom: PLATE_BOTTOM_TO_PCB_TOP,
    plateTop: plateTopZ,
    topFrameBottom: plateTopZ,
    topFrameTop: plateTopZ + TOP_FRAME_THICKNESS,
    bottomTop: -PCB_THICKNESS - BOTTOM_GAP,
    bottomBottom: -PCB_THICKNESS - BOTTOM_GAP - BOTTOM_THICKNESS,
    stemTop: plateTopZ + PLATE_TOP_TO_STEM_TOP,
}

export const KEYCAP_HEIGHT = 9.4
export const KEYCAP_BOTTOM_SIZE = 18
export const KEYCAP_BOTTOM_Z = Z.plateTop + 4.3

export const ESP32_CRADLE = {
    boardWidth: 18.0,
    boardLength: 22.52,
    widthClearance: 0.3,
    lengthClearance: 0.3,
    wall: 1.8,
    lip: 0.5,
    slotHeight: 1.8,
    railHeight: 2.8,
    stopWall: 1.8,
}
