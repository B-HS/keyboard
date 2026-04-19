import { colors, primitives, transforms } from '@jscad/modeling'
import type { Geom3 } from '@jscad/modeling/src/geometries/types'
import { keys49, computeBounds } from './layout'
import { buildPlate } from './plate'
import { buildCase, caseBounds, DEFAULT_CASE_PARAMS, getPlateTransform } from './case'
import { buildLolin } from './lolin'
import {
    buildPerfBoard,
    buildSlideSwitch,
    buildStabilizers,
    buildKeycaps,
    buildFootPads,
    buildBatteryCover,
    buildBatteries,
    buildBatteryContacts,
} from './accessories'
import { normalizeSwitch, placeSwitches, DEFAULT_SWITCH_ORIENT, type SwitchOrient } from './switch'
import { normalizeKeycap, placeKeycaps, DEFAULT_KEYCAP_ORIENT, type KeycapOrient } from './keycap'
import type { BuildParams } from './build-params'

const { colorize } = colors
const { cuboid } = primitives
const { translate, rotateX } = transforms

export type PartVisibility = {
    plate: boolean
    case: boolean
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
}

const PHONE_SIZE: [number, number, number] = [77.6, 160.7, 7.85]
const PHONE_GAP = 10

const PLATE_COLOR: [number, number, number, number] = [0.88, 0.88, 0.92, 1]
const CASE_COLOR: [number, number, number, number] = [0.2, 0.2, 0.24, 1]
const SWITCH_COLOR: [number, number, number, number] = [0.12, 0.12, 0.14, 1]
const LOLIN_COLOR: [number, number, number, number] = [0.1, 0.5, 0.2, 1]
const PERFBOARD_COLOR: [number, number, number, number] = [0.75, 0.6, 0.3, 1]
const SLIDE_COLOR: [number, number, number, number] = [0.7, 0.7, 0.7, 1]
const STAB_COLOR: [number, number, number, number] = [0.95, 0.95, 0.95, 1]
const KEYCAP_COLOR: [number, number, number, number] = [0.85, 0.85, 0.9, 0.85]
const FOOTPAD_COLOR: [number, number, number, number] = [0.1, 0.1, 0.1, 1]
const BATTERY_COVER_COLOR: [number, number, number, number] = [0.25, 0.25, 0.3, 1]
const BATTERY_COLOR: [number, number, number, number] = [0.85, 0.75, 0.3, 1]
const CONTACT_COLOR: [number, number, number, number] = [0.8, 0.8, 0.85, 1]
const PHONE_COLOR: [number, number, number, number] = [0.4, 0.6, 0.8, 0.6]

export const buildSolids = (
    visibility: PartVisibility,
    params: BuildParams,
    switchGeom: Geom3 | null = null,
    switchOrient: SwitchOrient = DEFAULT_SWITCH_ORIENT,
    keycapGeom: Geom3 | null = null,
    keycapOrient: KeycapOrient = DEFAULT_KEYCAP_ORIENT,
): Geom3[] => {
    const solids: Geom3[] = []

    if (visibility.case) {
        solids.push(colorize(CASE_COLOR, buildCase(keys49, params)))
    }

    const plateBounds = computeBounds(keys49, params.plate.padding)
    const { pivotY, tiltAngle, liftZ } = getPlateTransform(plateBounds, DEFAULT_CASE_PARAMS)
    const applyPlateTransform = (g: Geom3): Geom3 => {
        let t = translate([0, -pivotY, 0], g)
        t = rotateX(tiltAngle, t)
        t = translate([0, pivotY, liftZ], t)
        return t
    }

    if (visibility.plate) {
        const plate = buildPlate(keys49, params.plate)
        solids.push(colorize(PLATE_COLOR, applyPlateTransform(plate)))
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
        const stabs = buildStabilizers(keys49)
        if (stabs) solids.push(colorize(STAB_COLOR, applyPlateTransform(stabs)))
    }

    if (visibility.keycaps) {
        if (keycapGeom) {
            const normalized = normalizeKeycap(keycapGeom, keycapOrient)
            const placed = placeKeycaps(normalized, keys49)
            for (const c of placed) {
                solids.push(colorize(KEYCAP_COLOR, applyPlateTransform(c)))
            }
        } else {
            const caps = buildKeycaps(keys49)
            const capsOnPlate = translate([0, 0, 1.5], caps)
            solids.push(colorize(KEYCAP_COLOR, applyPlateTransform(capsOnPlate)))
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
        const phoneCenterZ = PHONE_SIZE[2] / 2
        const phone = translate(
            [phoneCenterX, phoneCenterY, phoneCenterZ],
            cuboid({ size: PHONE_SIZE }),
        )
        solids.push(colorize(PHONE_COLOR, phone))
    }

    return solids
}
