export const KEY_PITCH = 19.05

export const PLATE_THICKNESS = 1.5
export const TOP_FRAME_THICKNESS = 5.0
export const BOTTOM_THICKNESS = 1.5
export const PCB_THICKNESS = 1.6

export const SWITCH_CUTOUT = 13.75
export const SWITCH_CUTOUT_RADIUS = 0.5
export const STAB_PAD = { width: 6.75, height: 14.75, radius: 0.5 }
export const OUTLINE_RADIUS = 1

export const LATERAL_CLEARANCE = 1.25
export const CASE_MARGIN = 5
export const KEYCAP_GAP = 1.05

export const MOUNT_HOLE_DIAMETER = 2.4
export const MOUNT_KEEPOUT_DIAMETER = 5
export const MOUNT_HOLE_INSET_FROM_EDGE = 2.5

export const PLATE_BOTTOM_TO_PCB_TOP = 3.5
export const BOTTOM_GAP = 5.0
export const PLATE_TOP_TO_STEM_TOP = 11.6

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
