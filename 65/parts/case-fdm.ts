import { booleans, extrusions, primitives, transforms } from '@jscad/modeling'
import { buildTopFrame2D } from './top-frame'
import { rect } from './shapes'
import {
    Z,
    TOP_FRAME_THICKNESS,
    PLATE_THICKNESS,
    BOTTOM_THICKNESS,
    PILLAR_BODY_DIAMETER,
    PILLAR_PCB_CAP_DIAMETER,
    PILLAR_PCB_CAP_HEIGHT,
    PILLAR_PLATE_NECK_DIAMETER,
    PLATE_NECK_CLEARANCE_DIAMETER,
    BOTTOM_BOSS_OUTER_DIAMETER,
    BOTTOM_BOSS_BORE_DIAMETER,
    FDM_MARGIN_EXTRA,
    SWITCH_CUTOUT_FDM,
    SWITCH_CUTOUT_RADIUS,
    STAB_PAD_FDM,
    M1,
    ESP32_CRADLE,
    tiltRise,
    tiltY,
    TILT_ANGLE,
    TILT_PIVOT_Y,
} from '../config/dimensions'
import type { Geom3 } from '@jscad/modeling'
import type { MountHole, Side } from '@renderer/types'

const { subtract, union, intersect } = booleans
const { extrudeLinear } = extrusions
const { circle, roundedRectangle, cylinder, cuboid } = primitives
const { translate, rotateX } = transforms

const SEG = 32
const SLAB = 600

const atZ = (z: number, geom: Geom3) => translate([0, 0, z], geom)

const tiltGeom = (geom: Geom3) => translate([0, TILT_PIVOT_Y, Z.pcbBottom], rotateX(TILT_ANGLE, translate([0, -TILT_PIVOT_Y, -Z.pcbBottom], geom)))

export const untiltGeom = (geom: Geom3) =>
    translate([0, TILT_PIVOT_Y, Z.pcbBottom], rotateX(-TILT_ANGLE, translate([0, -TILT_PIVOT_Y, -Z.pcbBottom], geom)))

const belowTiltPlane = (z: number, geom: Geom3) => intersect(geom, tiltGeom(translate([0, 0, z - SLAB / 2], cuboid({ size: [SLAB, SLAB, SLAB] }))))
const aboveTiltPlane = (z: number, geom: Geom3) => intersect(geom, tiltGeom(translate([0, 0, z + SLAB / 2], cuboid({ size: [SLAB, SLAB, SLAB] }))))

export const fdmOutline = (side: Side) => ({
    ...side.caseOutline,
    w: side.caseOutline.w + 2 * FDM_MARGIN_EXTRA,
    h: side.caseOutline.h + 2 * FDM_MARGIN_EXTRA,
})

const post = (h: { x: number; y: number }, z0: number, z1: number, diameter: number) =>
    translate([h.x, h.y, (z0 + z1) / 2], cylinder({ height: z1 - z0, radius: diameter / 2, segments: SEG }))

const pillarSolid = (h: MountHole) => {
    const hp = { x: h.x, y: tiltY(h.y) }
    const r = tiltRise(h.y)
    const over = 3
    return union(
        belowTiltPlane(Z.pcbTop, post(hp, Z.bottomTop, Z.pcbTop + r + over, PILLAR_BODY_DIAMETER)),
        aboveTiltPlane(
            Z.pcbTop,
            belowTiltPlane(
                Z.pcbTop + PILLAR_PCB_CAP_HEIGHT,
                post(hp, Z.pcbTop + r - over, Z.pcbTop + PILLAR_PCB_CAP_HEIGHT + r + over, PILLAR_PCB_CAP_DIAMETER),
            ),
        ),
        aboveTiltPlane(
            Z.pcbTop + PILLAR_PCB_CAP_HEIGHT,
            belowTiltPlane(Z.plateBottom, post(hp, Z.pcbTop + r - over, Z.plateBottom + r + over, PILLAR_BODY_DIAMETER)),
        ),
        aboveTiltPlane(
            Z.plateBottom,
            belowTiltPlane(Z.plateTop, post(hp, Z.plateBottom + r - over, Z.plateTop + r + over, PILLAR_PLATE_NECK_DIAMETER)),
        ),
    )
}

const insertPocket = (h: MountHole) => post({ x: h.x, y: tiltY(h.y) }, Z.bottomTop, Z.bottomTop + M1.insertPocketDepth, M1.insertBoreDiameter)

export const buildTopFdm3D = (side: Side) => {
    const bezel = tiltGeom(atZ(Z.topFrameBottom, extrudeLinear({ height: TOP_FRAME_THICKNESS }, buildTopFrame2D(side, fdmOutline(side)))))
    const solids = union(bezel, ...side.mountHoles.map(pillarSolid))
    return subtract(solids, union(...side.mountHoles.map(insertPocket)))
}

const plateCuts2D = (side: Side) =>
    union(
        ...side.switches.map((s) =>
            translate([s.x, s.y, 0], roundedRectangle({ size: [SWITCH_CUTOUT_FDM, SWITCH_CUTOUT_FDM], roundRadius: SWITCH_CUTOUT_RADIUS })),
        ),
        ...side.stabs.map((p) =>
            translate([p.x, p.y, 0], roundedRectangle({ size: [STAB_PAD_FDM.width, STAB_PAD_FDM.height], roundRadius: STAB_PAD_FDM.radius })),
        ),
        ...side.mountHoles.map((h) => translate([h.x, h.y, 0], circle({ radius: PLATE_NECK_CLEARANCE_DIAMETER / 2, segments: SEG }))),
    )

export const buildPlateFdm3D = (side: Side) =>
    tiltGeom(atZ(Z.plateBottom, extrudeLinear({ height: PLATE_THICKNESS }, subtract(rect(fdmOutline(side)), plateCuts2D(side)))))

const buildEsp32Cradle3D = (side: Side) => {
    const c = ESP32_CRADLE
    const slotW = c.boardWidth + c.widthClearance
    const slotL = c.boardLength + c.lengthClearance
    const cx = side.caseOutline.cx
    const backY = side.caseOutline.cy + (side.caseOutline.h + 2 * FDM_MARGIN_EXTRA) / 2
    const frontY = backY - slotL
    const railLen = slotL
    const railCy = frontY + railLen / 2
    const z0 = Z.bottomTop
    const wallBox = (wcx: number, w: number, len: number, cy: number, z: number, h: number) =>
        translate([wcx, cy, z + h / 2], cuboid({ size: [w, len, h] }))
    const parts: Geom3[] = []
    for (const dir of [-1, 1]) {
        const wallCx = cx + dir * (slotW / 2 + c.wall / 2)
        parts.push(wallBox(wallCx, c.wall, railLen, railCy, z0, c.railHeight))
        const lipCx = cx + dir * (slotW / 2 - c.lip / 2)
        parts.push(wallBox(lipCx, c.lip, railLen, railCy, z0 + c.slotHeight, c.railHeight - c.slotHeight))
    }
    parts.push(wallBox(cx, slotW + 2 * c.wall, c.stopWall, frontY - c.stopWall / 2, z0, c.railHeight))
    return union(...parts)
}

export const buildBottomFdm3D = (side: Side) => {
    const base = atZ(Z.bottomBottom, extrudeLinear({ height: BOTTOM_THICKNESS }, rect(fdmOutline(side))))
    const cradle = buildEsp32Cradle3D(side)
    const bosses = side.mountHoles.map((h) =>
        belowTiltPlane(Z.pcbBottom, post({ x: h.x, y: tiltY(h.y) }, Z.bottomTop, Z.pcbBottom + tiltRise(h.y) + 3, BOTTOM_BOSS_OUTER_DIAMETER)),
    )
    const bores = side.mountHoles.map((h) => post({ x: h.x, y: tiltY(h.y) }, Z.bottomTop, Z.pcbBottom + tiltRise(h.y) + 4, BOTTOM_BOSS_BORE_DIAMETER))
    const screwHoles = side.mountHoles.map((h) => post({ x: h.x, y: tiltY(h.y) }, Z.bottomBottom, Z.bottomTop, M1.screwClearanceDiameter))
    return subtract(union(base, cradle, ...bosses), union(...bores, ...screwHoles))
}
