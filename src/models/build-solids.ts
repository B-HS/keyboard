import { colors, primitives, transforms } from '@jscad/modeling'
import type { Geom3 } from '@jscad/modeling/src/geometries/types'
import { keys49, computeBounds } from './layout'
import { buildCaseTop, buildCaseBottom, caseBounds, caseFrontTopZ, DEFAULT_CASE_PARAMS, getPlateTransform } from './case'
import { buildLolin } from './lolin'
import {
    buildPerfBoard,
    buildSlideSwitch,
    buildStabilizers,
    buildFootPads,
    buildBatteryCover,
    buildBatteries,
    buildBatteryContacts,
} from './accessories'
import { normalizeSwitch, placeSwitches, DEFAULT_SWITCH_ORIENT, type SwitchOrient } from './switch'
import { buildKeycapsForKeys, DEFAULT_KEYCAP_ORIENT, type KeycapOrient } from './keycap'
import { normalizeStabilizer, placeStabilizers, DEFAULT_STABILIZER_ORIENT, type StabilizerOrient } from './stabilizer'
import type { BuildParams } from './build-params'

const { colorize } = colors
const { cuboid } = primitives
const { translate, rotateX } = transforms

export type PartVisibility = {
    caseTop: boolean
    caseBottom: boolean
    switches: boolean
    lolin: boolean
    perfBoard: boolean
    slideSwitch: boolean
    stabilizers: boolean
    keycaps: boolean
    footPads: boolean
    batteryCover: boolean
    batteries: boolean
    batteryContacts: boolean
    phone: boolean
    wobkeyZen65: boolean
}

const PHONE_SIZE: [number, number, number] = [77.6, 160.7, 7.85]
const PHONE_GAP = 10

const WOBKEY_ZEN65_SIZE: [number, number, number] = [315, 112, 28]
const WOBKEY_ZEN65_GAP = 15

const CASE_TOP_COLOR: [number, number, number, number] = [0.77, 0.77, 0.77, 1]
const CASE_BOTTOM_COLOR: [number, number, number, number] = [0.77, 0.77, 0.77, 1]
const SWITCH_COLOR: [number, number, number, number] = [0.77, 0.77, 0.77, 1]
const LOLIN_COLOR: [number, number, number, number] = [0.1, 0.5, 0.2, 1]
const PERFBOARD_COLOR: [number, number, number, number] = [0.75, 0.6, 0.3, 1]
const SLIDE_COLOR: [number, number, number, number] = [0.7, 0.7, 0.7, 1]
const STAB_COLOR: [number, number, number, number] = [0.77, 0.77, 0.77, 1]
const KEYCAP_COLOR: [number, number, number, number] = [0.77, 0.77, 0.77, 1]
const FOOTPAD_COLOR: [number, number, number, number] = [0.1, 0.1, 0.1, 1]
const BATTERY_COVER_COLOR: [number, number, number, number] = [0.77, 0.77, 0.77, 1]
const BATTERY_COLOR: [number, number, number, number] = [0.85, 0.75, 0.3, 1]
const CONTACT_COLOR: [number, number, number, number] = [0.8, 0.8, 0.85, 1]
const PHONE_COLOR: [number, number, number, number] = [0.4, 0.6, 0.8, 0.6]
const WOBKEY_COLOR: [number, number, number, number] = [0.75, 0.45, 0.35, 0.6]

export const buildSolids = (
    visibility: PartVisibility,
    params: BuildParams,
    switchGeom: Geom3 | null = null,
    switchOrient: SwitchOrient = DEFAULT_SWITCH_ORIENT,
    keycapOrient: KeycapOrient = DEFAULT_KEYCAP_ORIENT,
    stabilizerGeom: Geom3 | null = null,
    stabilizerOrient: StabilizerOrient = DEFAULT_STABILIZER_ORIENT,
): Geom3[] => {
    const solids: Geom3[] = []

    if (visibility.caseTop) {
        solids.push(colorize(CASE_TOP_COLOR, buildCaseTop(keys49, params)))
    }
    if (visibility.caseBottom) {
        solids.push(colorize(CASE_BOTTOM_COLOR, buildCaseBottom(keys49, params)))
    }

    const plateBounds = computeBounds(keys49, params.plate.padding)
    const { pivotY, tiltAngle, liftZ } = getPlateTransform(plateBounds, DEFAULT_CASE_PARAMS)
    const applyPlateTransform = (g: Geom3): Geom3 => {
        let t = translate([0, -pivotY, 0], g)
        t = rotateX(tiltAngle, t)
        t = translate([0, pivotY, liftZ], t)
        return t
    }

    if (visibility.switches && switchGeom) {
        const normalized = normalizeSwitch(switchGeom, switchOrient)
        const placed = placeSwitches(normalized, keys49)
        for (const s of placed) {
            solids.push(colorize(SWITCH_COLOR, applyPlateTransform(s)))
        }
    }

    if (visibility.lolin) {
        solids.push(colorize(LOLIN_COLOR, buildLolin(plateBounds, DEFAULT_CASE_PARAMS)))
    }

    if (visibility.perfBoard) {
        solids.push(colorize(PERFBOARD_COLOR, buildPerfBoard(plateBounds, DEFAULT_CASE_PARAMS)))
    }

    if (visibility.slideSwitch) {
        solids.push(colorize(SLIDE_COLOR, buildSlideSwitch(plateBounds, DEFAULT_CASE_PARAMS)))
    }

    if (visibility.stabilizers) {
        if (stabilizerGeom) {
            const normalized = normalizeStabilizer(stabilizerGeom, stabilizerOrient)
            const placed = placeStabilizers(normalized, keys49, stabilizerOrient)
            for (const s of placed) {
                solids.push(colorize(STAB_COLOR, applyPlateTransform(s)))
            }
        } else {
            const stabs = buildStabilizers(keys49)
            if (stabs) solids.push(colorize(STAB_COLOR, applyPlateTransform(stabs)))
        }
    }

    if (visibility.keycaps) {
        const caps = buildKeycapsForKeys(keys49, keycapOrient)
        for (const c of caps) {
            solids.push(colorize(KEYCAP_COLOR, applyPlateTransform(c)))
        }
    }

    if (visibility.footPads) {
        solids.push(colorize(FOOTPAD_COLOR, buildFootPads(plateBounds, DEFAULT_CASE_PARAMS)))
    }

    if (visibility.batteryCover) {
        solids.push(colorize(BATTERY_COVER_COLOR, buildBatteryCover(DEFAULT_CASE_PARAMS)))
    }

    if (visibility.batteries) {
        solids.push(colorize(BATTERY_COLOR, buildBatteries(DEFAULT_CASE_PARAMS)))
    }

    if (visibility.batteryContacts) {
        solids.push(colorize(CONTACT_COLOR, buildBatteryContacts(DEFAULT_CASE_PARAMS)))
    }

    if (visibility.phone) {
        const caseMinX = caseBounds(plateBounds, DEFAULT_CASE_PARAMS).minX
        const phoneCenterX = caseMinX - PHONE_GAP - PHONE_SIZE[0] / 2
        const phoneCenterY = (plateBounds.minY + plateBounds.maxY) / 2
        const phoneCenterZ = caseFrontTopZ(plateBounds) - PHONE_SIZE[2] / 2
        const phone = translate(
            [phoneCenterX, phoneCenterY, phoneCenterZ],
            cuboid({ size: PHONE_SIZE }),
        )
        solids.push(colorize(PHONE_COLOR, phone))
    }

    if (visibility.wobkeyZen65) {
        const caseMaxX = caseBounds(plateBounds, DEFAULT_CASE_PARAMS).maxX
        const centerX = caseMaxX + WOBKEY_ZEN65_GAP + WOBKEY_ZEN65_SIZE[0] / 2
        const centerY = (plateBounds.minY + plateBounds.maxY) / 2
        const centerZ = WOBKEY_ZEN65_SIZE[2] / 2
        const ref = translate(
            [centerX, centerY, centerZ],
            cuboid({ size: WOBKEY_ZEN65_SIZE }),
        )
        solids.push(colorize(WOBKEY_COLOR, ref))
    }

    return solids
}
