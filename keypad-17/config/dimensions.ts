export const KEY_PITCH = 19.05

export const PLATE_THICKNESS = 1.5
export const TOP_FRAME_THICKNESS = 5.0
export const BOTTOM_THICKNESS = 1.5

export const SWITCH_CUTOUT_FDM = 14.0
export const SWITCH_CUTOUT_RADIUS = 0.5
export const STAB_SLOT_FDM = { width: 6.65, height: 12.3, radius: 0.5 }
export const OUTLINE_RADIUS = 3

export const LATERAL_CLEARANCE = 1.25
export const CASE_MARGIN = 6
export const KEYCAP_GAP = 1.05
export const MOUNT_HOLE_OUTSET = 2.0

export const PILLAR_BODY_DIAMETER = 4.8
export const PILLAR_TIP_CHAMFER = { height: 0.5, diameter: 3.8 }
export const PILLAR_ROOT_FILLET = { height: 1.0, diameter: 5.8 }
export const PILLAR_TIP_CLEARANCE = 0.2
export const PLATE_PILLAR_HOLE_DIAMETER = 5.4
export const PLATE_PILLAR_COUNTERSINK = { height: 1.0, topDiameter: 6.0 }
export const BOTTOM_BOSS_OUTER_DIAMETER = 7.4
export const BOTTOM_BOSS_BORE_DIAMETER = 5.5
export const BOSS_BORE_ENTRY_CHAMFER = { depth: 0.3, diameter: 6.1 }

export const M1 = {
    insertOuterDiameter: 2.0,
    insertLength: 2.5,
    insertBoreDiameter: 1.75,
    insertPocketDepth: 3.6,
    insertEntryChamfer: { depth: 0.3, diameter: 2.2 },
    screwClearanceDiameter: 1.2,
    screwHeadDiameter: 2.0,
    screwHeadHeight: 0.8,
    screwMaxLength: 4.0,
    headCounterbore: { diameter: 2.8, depth: 0.9 },
}

export const HOUSING_BELOW_PLATE_TOP = 5.0
export const SWITCH_PIN_BELOW_HOUSING = 3.3
export const HANDWIRE_ALLOWANCE_BELOW_PIN = 1.2

export const ESP32_MODULE = {
    boardWidth: 18.0,
    boardLength: 22.52,
    boardThickness: 1.0,
    bodyWidth: 16.0,
    bodyLength: 12.0,
    bodyHeight: 2.4,
    usbWidth: 9.0,
    usbLength: 7.35,
    usbHeight: 3.2,
}
export const ESP32_CLEARANCE_MARGIN = 1.1

export const BOTTOM_GAP =
    SWITCH_PIN_BELOW_HOUSING + HANDWIRE_ALLOWANCE_BELOW_PIN + ESP32_MODULE.boardThickness + ESP32_MODULE.bodyHeight + ESP32_CLEARANCE_MARGIN

export const Z = {
    plateTop: 0,
    plateBottom: -PLATE_THICKNESS,
    topFrameBottom: 0,
    topFrameTop: TOP_FRAME_THICKNESS,
    housingBottom: -HOUSING_BELOW_PLATE_TOP,
    bottomTop: -HOUSING_BELOW_PLATE_TOP - BOTTOM_GAP,
    bottomBottom: -HOUSING_BELOW_PLATE_TOP - BOTTOM_GAP - BOTTOM_THICKNESS,
}

export const KEYCAP_HEIGHT = 9.4
export const KEYCAP_BOTTOM_Z = Z.plateTop + 4.3
export const SWITCH_STEM_TOP_Z = Z.plateTop + 8.5

export const ESP32_CRADLE = {
    widthClearance: 0.3,
    lengthClearance: 0.3,
    wall: 1.8,
    lip: 0.5,
    slotHeight: 1.8,
    railHeight: 2.8,
    stopWall: 1.8,
}
