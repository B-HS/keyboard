import { booleans, extrusions, primitives, transforms } from '@jscad/modeling'
import { buildTopFrame2D } from './top-frame'
import { rect } from './shapes'
import {
    Z,
    TOP_FRAME_THICKNESS,
    PLATE_THICKNESS,
    BOTTOM_THICKNESS,
    SWITCH_CUTOUT_FDM,
    SWITCH_CUTOUT_RADIUS,
    STAB_SLOT_FDM,
    PILLAR_BODY_DIAMETER,
    PILLAR_TIP_CHAMFER,
    PILLAR_ROOT_FILLET,
    PILLAR_TIP_CLEARANCE,
    PLATE_PILLAR_HOLE_DIAMETER,
    PLATE_PILLAR_COUNTERSINK,
    BOTTOM_BOSS_OUTER_DIAMETER,
    BOTTOM_BOSS_BORE_DIAMETER,
    BOSS_BORE_ENTRY_CHAMFER,
    M1,
    ESP32_CRADLE,
    ESP32_MODULE,
} from '../config/dimensions'
import type { Geom3 } from '@jscad/modeling'
import type { MountHole, Side } from '@renderer/types'

const { subtract, union } = booleans
const { extrudeLinear } = extrusions
const { circle, roundedRectangle, cylinder, cylinderElliptic, cuboid } = primitives
const { translate } = transforms

const SEG = 32

const atZ = (z: number, geom: Geom3) => translate([0, 0, z], geom)

const post = (h: { x: number; y: number }, z0: number, z1: number, diameter: number) =>
    translate([h.x, h.y, (z0 + z1) / 2], cylinder({ height: z1 - z0, radius: diameter / 2, segments: SEG }))

const cone = (h: { x: number; y: number }, z0: number, z1: number, d0: number, d1: number) =>
    translate(
        [h.x, h.y, (z0 + z1) / 2],
        cylinderElliptic({ height: z1 - z0, startRadius: [d0 / 2, d0 / 2], endRadius: [d1 / 2, d1 / 2], segments: SEG }),
    )

const pillarTipZ = Z.bottomTop + PILLAR_TIP_CLEARANCE

const pillarSolid = (h: MountHole) =>
    union(
        cone(h, pillarTipZ, pillarTipZ + PILLAR_TIP_CHAMFER.height, PILLAR_TIP_CHAMFER.diameter, PILLAR_BODY_DIAMETER),
        post(h, pillarTipZ + PILLAR_TIP_CHAMFER.height, Z.topFrameBottom - PILLAR_ROOT_FILLET.height, PILLAR_BODY_DIAMETER),
        cone(h, Z.topFrameBottom - PILLAR_ROOT_FILLET.height, Z.topFrameBottom, PILLAR_BODY_DIAMETER, PILLAR_ROOT_FILLET.diameter),
    )

const insertPocket = (h: MountHole) =>
    union(
        post(h, pillarTipZ, pillarTipZ + M1.insertPocketDepth, M1.insertBoreDiameter),
        cone(h, pillarTipZ, pillarTipZ + M1.insertEntryChamfer.depth, M1.insertEntryChamfer.diameter, M1.insertBoreDiameter),
    )

export const buildTop3D = (side: Side) => {
    const bezel = atZ(Z.topFrameBottom, extrudeLinear({ height: TOP_FRAME_THICKNESS }, buildTopFrame2D(side)))
    const solids = union(bezel, ...side.mountHoles.map(pillarSolid))
    return subtract(solids, union(...side.mountHoles.map(insertPocket)))
}

const stabSlotSize = (rot: number | undefined): [number, number] =>
    rot === 90 ? [STAB_SLOT_FDM.height, STAB_SLOT_FDM.width] : [STAB_SLOT_FDM.width, STAB_SLOT_FDM.height]

const plateCuts2D = (side: Side) =>
    union(
        ...side.switches.map((s) =>
            translate([s.x, s.y, 0], roundedRectangle({ size: [SWITCH_CUTOUT_FDM, SWITCH_CUTOUT_FDM], roundRadius: SWITCH_CUTOUT_RADIUS })),
        ),
        ...side.stabs.map((p) => translate([p.x, p.y, 0], roundedRectangle({ size: stabSlotSize(p.rot), roundRadius: STAB_SLOT_FDM.radius }))),
        ...side.mountHoles.map((h) => translate([h.x, h.y, 0], circle({ radius: PLATE_PILLAR_HOLE_DIAMETER / 2, segments: SEG }))),
    )

export const buildPlate3D = (side: Side) => {
    const slab = atZ(Z.plateBottom, extrudeLinear({ height: PLATE_THICKNESS }, subtract(rect(side.caseOutline), plateCuts2D(side))))
    const csOver = 1
    const csOverDiameter =
        PLATE_PILLAR_COUNTERSINK.topDiameter +
        (csOver * (PLATE_PILLAR_COUNTERSINK.topDiameter - PLATE_PILLAR_HOLE_DIAMETER)) / PLATE_PILLAR_COUNTERSINK.height
    const countersinks = side.mountHoles.map((h) =>
        cone(h, Z.plateTop - PLATE_PILLAR_COUNTERSINK.height, Z.plateTop + csOver, PLATE_PILLAR_HOLE_DIAMETER, csOverDiameter),
    )
    return subtract(slab, union(...countersinks))
}

const buildEsp32Cradle3D = (side: Side) => {
    const c = ESP32_CRADLE
    const slotW = ESP32_MODULE.boardWidth + c.widthClearance
    const slotL = ESP32_MODULE.boardLength + c.lengthClearance
    const cx = side.caseOutline.cx
    const backY = side.caseOutline.cy + side.caseOutline.h / 2
    const frontY = backY - slotL
    const railCy = frontY + slotL / 2
    const z0 = Z.bottomTop
    const wallBox = (wcx: number, w: number, len: number, cy: number, z: number, h: number) =>
        translate([wcx, cy, z + h / 2], cuboid({ size: [w, len, h] }))
    const parts: Geom3[] = []
    for (const dir of [-1, 1]) {
        const wallCx = cx + dir * (slotW / 2 + c.wall / 2)
        parts.push(wallBox(wallCx, c.wall, slotL, railCy, z0, c.railHeight))
        const lipCx = cx + dir * (slotW / 2 - c.lip / 2)
        parts.push(wallBox(lipCx, c.lip, slotL, railCy, z0 + c.slotHeight, c.railHeight - c.slotHeight))
    }
    parts.push(wallBox(cx, slotW + 2 * c.wall, c.stopWall, frontY - c.stopWall / 2, z0, c.railHeight))
    return union(...parts)
}

export const buildBottom3D = (side: Side) => {
    const base = atZ(Z.bottomBottom, extrudeLinear({ height: BOTTOM_THICKNESS }, rect(side.caseOutline)))
    const cradle = buildEsp32Cradle3D(side)
    const bosses = side.mountHoles.map((h) => post(h, Z.bottomTop, Z.plateBottom, BOTTOM_BOSS_OUTER_DIAMETER))
    const bores = side.mountHoles.map((h) => post(h, Z.bottomTop, Z.plateBottom + 1, BOTTOM_BOSS_BORE_DIAMETER))
    const chamferOver = 1
    const chamferOverDiameter =
        BOSS_BORE_ENTRY_CHAMFER.diameter +
        (chamferOver * (BOSS_BORE_ENTRY_CHAMFER.diameter - BOTTOM_BOSS_BORE_DIAMETER)) / BOSS_BORE_ENTRY_CHAMFER.depth
    const entryChamfers = side.mountHoles.map((h) =>
        cone(h, Z.plateBottom - BOSS_BORE_ENTRY_CHAMFER.depth, Z.plateBottom + chamferOver, BOTTOM_BOSS_BORE_DIAMETER, chamferOverDiameter),
    )
    const screwHoles = side.mountHoles.map((h) => post(h, Z.bottomBottom, Z.bottomTop, M1.screwClearanceDiameter))
    const headCounterbores = side.mountHoles.map((h) =>
        post(h, Z.bottomBottom - 1, Z.bottomBottom + M1.headCounterbore.depth, M1.headCounterbore.diameter),
    )
    return subtract(union(base, cradle, ...bosses), union(...bores, ...entryChamfers, ...screwHoles, ...headCounterbores))
}
