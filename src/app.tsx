import { useEffect, useMemo, useState, type FC } from 'react'
import { serialize } from '@jscad/stl-serializer'
import type { Geom3 } from '@jscad/modeling/src/geometries/types'
import { Viewer } from './components/viewer'
import { Controls } from './components/controls'
import {
    buildSolids,
    DEFAULT_BUILD_PARAMS,
    DEFAULT_SWITCH_ORIENT,
    DEFAULT_KEYCAP_ORIENT,
    loadSwitchGeom,
    loadKeycapGeoms,
    keys49,
    type BuildParams,
    type PartVisibility,
    type SwitchOrient,
    type KeycapOrient,
} from './models'

export const App: FC = () => {
    const [visibility, setVisibility] = useState<PartVisibility>({
        caseTop: true,
        caseBottom: true,
        switches: false,
        lolin: false,
        perfBoard: false,
        slideSwitch: false,
        stabilizers: false,
        keycaps: false,
        footPads: false,
        batteryCover: false,
        batteries: false,
        batteryContacts: false,
        phone: false,
    })
    const [params, setParams] = useState<BuildParams>(DEFAULT_BUILD_PARAMS)
    const [switchOrient, setSwitchOrient] = useState<SwitchOrient>(DEFAULT_SWITCH_ORIENT)
    const [switchGeom, setSwitchGeom] = useState<Geom3 | null>(null)
    const [keycapOrient, setKeycapOrient] = useState<KeycapOrient>(DEFAULT_KEYCAP_ORIENT)
    const [keycapsReady, setKeycapsReady] = useState(0)

    useEffect(() => {
        loadSwitchGeom()
            .then(setSwitchGeom)
            .catch((e) => console.error('Switch STL load failed', e))
        loadKeycapGeoms(keys49)
            .then(() => setKeycapsReady((n) => n + 1))
            .catch((e) => console.error('Keycap STL load failed', e))
    }, [])

    const solids = useMemo(
        () => buildSolids(visibility, params, switchGeom, switchOrient, keycapOrient),
        [visibility, params, switchGeom, switchOrient, keycapOrient, keycapsReady],
    )

    const handleExportStl = () => {
        const rawData = serialize({ binary: true }, ...solids)
        const blob = new Blob(rawData, { type: 'application/sla' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'keyboard-49.stl'
        a.click()
        URL.revokeObjectURL(url)
    }

    return (
        <div className='app'>
            <Controls
                visibility={visibility}
                setVisibility={setVisibility}
                params={params}
                setParams={setParams}
                switchOrient={switchOrient}
                setSwitchOrient={setSwitchOrient}
                keycapOrient={keycapOrient}
                setKeycapOrient={setKeycapOrient}
                onExportStl={handleExportStl}
            />
            <div className='viewer-wrap'>
                <Viewer solids={solids} />
                <div className='help'>드래그: 회전 · Shift+드래그 or 우클릭: 이동 · 휠: 줌</div>
            </div>
        </div>
    )
}
