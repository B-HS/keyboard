import { BoxGeometry, CylinderGeometry, Group, Mesh, MeshStandardMaterial, type Object3D } from 'three'
import { toBufferGeometry } from '@renderer/jscad-to-three'
import { buildTop3D, buildPlate3D, buildBottom3D } from '../parts/case'
import { Z, KEY_PITCH, KEYCAP_GAP, KEYCAP_HEIGHT, KEYCAP_BOTTOM_Z, PILLAR_TIP_CLEARANCE, M1, ESP32_CRADLE, ESP32_MODULE } from '../config/dimensions'
import type { LayerKey, Side } from '@renderer/types'

const SWITCH_BODY_HEIGHT = 11

export type CaseLayers = Partial<Record<LayerKey, Object3D | null>>

const mat = (color: number) => new MeshStandardMaterial({ color, metalness: 0.15, roughness: 0.65 })

const boltMaterial = new MeshStandardMaterial({ color: 0xc0c0c0, metalness: 0.7, roughness: 0.3 })
const insertMaterial = new MeshStandardMaterial({ color: 0xc0c0c0, metalness: 0.65, roughness: 0.35 })
const boardMaterial = new MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.3, roughness: 0.5 })

const jscadMesh = (geom: Parameters<typeof toBufferGeometry>[0], material: MeshStandardMaterial) => new Mesh(toBufferGeometry(geom), material)

const buildScrews = (side: Side) => {
    const group = new Group()
    const insertGeom = new CylinderGeometry(M1.insertOuterDiameter / 2, M1.insertOuterDiameter / 2, M1.insertLength, 12)
    const shaftGeom = new CylinderGeometry(M1.screwClearanceDiameter / 2, M1.screwClearanceDiameter / 2, M1.screwMaxLength, 12)
    const headGeom = new CylinderGeometry(M1.screwHeadDiameter / 2 + 0.4, M1.screwHeadDiameter / 2 + 0.4, M1.screwHeadHeight, 16)
    const insertZ = Z.bottomTop + PILLAR_TIP_CLEARANCE + M1.insertLength / 2
    const shaftZ = Z.bottomBottom + M1.headCounterbore.depth + M1.screwMaxLength / 2
    const headZ = Z.bottomBottom + M1.headCounterbore.depth - M1.screwHeadHeight / 2
    for (const hole of side.mountHoles) {
        const insert = new Mesh(insertGeom, insertMaterial)
        insert.rotation.x = Math.PI / 2
        insert.position.set(hole.x, hole.y, insertZ)
        const shaft = new Mesh(shaftGeom, boltMaterial)
        shaft.rotation.x = Math.PI / 2
        shaft.position.set(hole.x, hole.y, shaftZ)
        const head = new Mesh(headGeom, boltMaterial)
        head.rotation.x = Math.PI / 2
        head.position.set(hole.x, hole.y, headZ)
        group.add(insert, shaft, head)
    }
    return group
}

const buildEsp32Board = (side: Side) => {
    const m = ESP32_MODULE
    const backY = side.caseOutline.cy + side.caseOutline.h / 2
    const cx = side.caseOutline.cx
    const boardCy = backY - (m.boardLength + ESP32_CRADLE.lengthClearance) / 2
    const boardBackY = boardCy + m.boardLength / 2
    const pcbTopZ = Z.bottomTop + m.boardThickness

    const pcb = new Mesh(new BoxGeometry(m.boardWidth, m.boardLength, m.boardThickness), boardMaterial)
    pcb.position.set(cx, boardCy, Z.bottomTop + m.boardThickness / 2)
    const body = new Mesh(new BoxGeometry(m.bodyWidth, m.bodyLength, m.bodyHeight), boardMaterial)
    body.position.set(cx, boardCy, pcbTopZ + m.bodyHeight / 2)
    const usb = new Mesh(new BoxGeometry(m.usbWidth, m.usbLength, m.usbHeight), boardMaterial)
    usb.position.set(cx, boardBackY - m.usbLength / 2, pcbTopZ + m.usbHeight / 2)

    const group = new Group()
    group.add(pcb, body, usb)
    return group
}

export const buildCaseMeshes = (side: Side) => {
    const top = jscadMesh(buildTop3D(side), mat(0xffffff))
    const plate = jscadMesh(buildPlate3D(side), mat(0xdedede))
    const bottom = jscadMesh(buildBottom3D(side), mat(0xffffff))
    const screws = buildScrews(side)
    const esp32 = buildEsp32Board(side)
    const group = new Group()
    group.add(top, plate, bottom, screws, esp32)
    const layers: CaseLayers = { top, plate, bottom, esp32, bolts: screws, switches: null, keycaps: null }
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
        const capWidth = s.u * KEY_PITCH - KEYCAP_GAP
        const capDepth = (s.vSpan ?? 1) * KEY_PITCH - KEYCAP_GAP
        const cap = new Mesh(new BoxGeometry(capWidth, capDepth, KEYCAP_HEIGHT), mat(0xffffff))
        cap.position.set(s.x, s.y, KEYCAP_BOTTOM_Z + KEYCAP_HEIGHT / 2)
        keycaps.add(cap)
    }
    return { switches, keycaps }
}
