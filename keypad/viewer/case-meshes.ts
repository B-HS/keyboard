import { BoxGeometry, CylinderGeometry, Group, Mesh, MeshStandardMaterial, type Object3D } from 'three'
import { extrusions } from '@jscad/modeling'
import { toBufferGeometry } from '@renderer/jscad-to-three'
import type { LayerKey, Side } from '@renderer/types'
import { buildPlate3D } from '../parts/plate'
import { buildTopFrame3D } from '../parts/top-frame'
import { buildBottom3D } from '../parts/bottom-plate'
import { rect } from '../parts/shapes'
import { buildSpacers3D } from '../parts/spacer'
import {
    Z,
    PCB_THICKNESS,
    PLATE_THICKNESS,
    KEY_PITCH,
    KEYCAP_HEIGHT,
    KEYCAP_BOTTOM_Z,
    PLATE_BOTTOM_TO_PCB_TOP,
    BOTTOM_GAP,
} from '../config/dimensions'

const { extrudeLinear } = extrusions

const SWITCH_BODY_HEIGHT = 11

export type CaseLayers = Partial<Record<LayerKey, Object3D | null>>

const mat = (color: number) => new MeshStandardMaterial({ color, metalness: 0.15, roughness: 0.65 })

const spacerMaterial = new MeshStandardMaterial({ color: 0xc0c0c0, metalness: 0.45, roughness: 0.4 })
const boltMaterial = new MeshStandardMaterial({ color: 0xc0c0c0, metalness: 0.7, roughness: 0.3 })
const insertMaterial = new MeshStandardMaterial({ color: 0xc0c0c0, metalness: 0.65, roughness: 0.35 })

const jscadMesh = (geom: Parameters<typeof toBufferGeometry>[0], z: number, material: MeshStandardMaterial) => {
    const mesh = new Mesh(toBufferGeometry(geom), material)
    mesh.position.z = z
    return mesh
}

const buildSpacerMeshes = (side: Side) => {
    const group = new Group()
    group.add(jscadMesh(buildSpacers3D(side, PLATE_BOTTOM_TO_PCB_TOP), Z.pcbTop, spacerMaterial))
    group.add(jscadMesh(buildSpacers3D(side, BOTTOM_GAP), Z.bottomTop, spacerMaterial))
    return group
}

const buildBolts = (side: Side) => {
    const group = new Group()
    const insertGeom = new CylinderGeometry(1.6, 1.6, PLATE_THICKNESS + 1.5, 12)
    const shaftGeom = new CylinderGeometry(1.0, 1.0, Z.plateTop - Z.bottomBottom, 12)
    const headGeom = new CylinderGeometry(2.2, 2.2, 1.6, 16)
    for (const hole of side.mountHoles) {
        const insert = new Mesh(insertGeom, insertMaterial)
        insert.rotation.x = Math.PI / 2
        insert.position.set(hole.x, hole.y, Z.plateTop - (PLATE_THICKNESS + 1.5) / 2)
        const shaft = new Mesh(shaftGeom, boltMaterial)
        shaft.rotation.x = Math.PI / 2
        shaft.position.set(hole.x, hole.y, (Z.plateTop + Z.bottomBottom) / 2)
        const head = new Mesh(headGeom, boltMaterial)
        head.rotation.x = Math.PI / 2
        head.position.set(hole.x, hole.y, Z.bottomBottom - 0.8)
        group.add(insert, shaft, head)
    }
    return group
}

export const buildCaseMeshes = (side: Side) => {
    const bottom = jscadMesh(buildBottom3D(side), Z.bottomBottom, mat(0xffffff))
    const pcb = jscadMesh(extrudeLinear({ height: PCB_THICKNESS }, rect(side.caseOutline)), Z.pcbBottom, mat(0xffffff))
    const plate = jscadMesh(buildPlate3D(side), Z.plateBottom, mat(0xffffff))
    const bezel = jscadMesh(buildTopFrame3D(side), Z.topFrameBottom, mat(0xffffff))

    const top = new Group()
    top.add(plate, bezel)
    const spacers = buildSpacerMeshes(side)
    const bolts = buildBolts(side)

    const group = new Group()
    group.add(bottom, pcb, top, spacers, bolts)
    const layers: CaseLayers = { top, pcb, bottom, spacers, bolts, switches: null, keycaps: null }
    return { group, layers }
}

export const buildBoxPreview = (side: Side) => {
    const switches = new Group()
    const keycaps = new Group()
    const switchGeom = new BoxGeometry(14, 14, SWITCH_BODY_HEIGHT)
    for (const s of side.switches) {
        const sw = new Mesh(switchGeom, mat(0x141414))
        sw.position.set(s.x, s.y, SWITCH_BODY_HEIGHT / 2)
        switches.add(sw)
        const capWidth = s.u * KEY_PITCH - 1.05
        const capDepth = (s.vSpan ?? 1) * KEY_PITCH - 1.05
        const cap = new Mesh(new BoxGeometry(capWidth, capDepth, KEYCAP_HEIGHT), mat(0xffffff))
        cap.position.set(s.x, s.y, KEYCAP_BOTTOM_Z + KEYCAP_HEIGHT / 2)
        keycaps.add(cap)
    }
    return { switches, keycaps }
}
