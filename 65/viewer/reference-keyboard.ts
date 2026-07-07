import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three'

const KEY_PITCH = 19.05
const KEYCAP_GAP = 1.05
const KEYCAP_HEIGHT = 9.4

// WOBKEY Zen 65 — 65% 레이아웃(67키). 각 행 = 키 폭(u) 목록
const ROWS = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1],
    [1.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5, 1],
    [1.75, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.25, 1],
    [2.25, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.75, 1, 1],
    [1.25, 1.25, 1.25, 6.25, 1, 1, 1, 1, 1],
]

const CASE_W = 315
const CASE_D = 112
const FRONT_TOP_H = 17.9
const BACK_TOP_H = 36
const ANGLE = Math.atan2(BACK_TOP_H - FRONT_TOP_H, CASE_D)
const BODY_FRONT_H = FRONT_TOP_H - KEYCAP_HEIGHT
const BODY_BACK_H = BACK_TOP_H - KEYCAP_HEIGHT

const caseMat = new MeshStandardMaterial({ color: 0x8a8a92, metalness: 0.7, roughness: 0.4 })
const capMat = new MeshStandardMaterial({ color: 0xd8d8de, metalness: 0.05, roughness: 0.7 })

// 바닥 평평(z 0) + 윗면 사다리꼴 wedge
const buildWedge = (w: number, d: number, hFront: number, hBack: number) => {
    const geo = new BoxGeometry(w, d, 1)
    const pos = geo.attributes.position
    if (!pos) return geo
    for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i)
        if (pos.getZ(i) > 0) {
            const t = (y + d / 2) / d
            pos.setZ(i, hFront + t * (hBack - hFront))
        } else {
            pos.setZ(i, 0)
        }
    }
    pos.needsUpdate = true
    geo.computeVertexNormals()
    return geo
}

export const buildReferenceKeyboard = () => {
    const group = new Group()

    group.add(new Mesh(buildWedge(CASE_W, CASE_D, BODY_FRONT_H, BODY_BACK_H), caseMat))

    const keys: { cx: number; cy: number; u: number }[] = []
    let maxX = 0
    ROWS.forEach((row, r) => {
        let x = 0
        for (const u of row) {
            keys.push({ cx: x + (u * KEY_PITCH) / 2, cy: -r * KEY_PITCH, u })
            x += u * KEY_PITCH
        }
        maxX = Math.max(maxX, x)
    })
    const clusterCx = maxX / 2
    const clusterCy = (-(ROWS.length - 1) * KEY_PITCH) / 2

    const keyBank = new Group()
    for (const k of keys) {
        const capW = k.u * KEY_PITCH - KEYCAP_GAP
        const cap = new Mesh(new BoxGeometry(capW, KEY_PITCH - KEYCAP_GAP, KEYCAP_HEIGHT), capMat)
        cap.position.set(k.cx - clusterCx, k.cy - clusterCy, KEYCAP_HEIGHT / 2)
        keyBank.add(cap)
    }
    keyBank.rotation.x = ANGLE
    keyBank.position.z = BODY_FRONT_H + (CASE_D / 2) * Math.tan(ANGLE)
    group.add(keyBank)

    group.userData = { caseWidth: CASE_W, caseDepth: CASE_D }
    return group
}
