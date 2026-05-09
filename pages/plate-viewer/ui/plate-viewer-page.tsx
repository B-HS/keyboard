import { useMemo, useState, type CSSProperties, type FC } from 'react'
import { Viewport } from '@widgets/viewport'
import { PlateMesh } from '@features/plate-render'
import { HousingTopMesh, HousingBottomMesh } from '@features/housing-render'
import { PcbMesh } from '@features/pcb-render'
import { LolinMesh } from '@features/lolin-render'
import { OldStlMesh } from '@features/old-render'
import { SwitchMesh, KeycapMesh } from '@features/keys-render'
import { KEYBOARD_GEOMETRY } from '@shared/config/keyboard'
import { VIEWER_STYLE } from '@shared/config/viewer'
import { evaluateJscadSource } from '@shared/lib/jscad'
import {
    buildHousingTopGeom,
    buildHousingBottomGeom,
    buildPcbGeom,
    buildLolinPcbGeom,
    buildLolinUsbCGeom,
} from '../../../49-pcba/build'
import plateSource from '../../../49-pcba/keyboard-plate-extended.jscad?raw'
import oldTopUrl from '../../../49-old/docs/export/1_case-top.stl?url'
import oldBottomUrl from '../../../49-old/docs/export/2_case-bottom.stl?url'

type CurrentPartKey = 'plate' | 'pcb' | 'housingTop' | 'housingBottom' | 'lolin' | 'switches' | 'keycaps'
type OldPartKey = 'oldTop' | 'oldBottom'
type PartKey = CurrentPartKey | OldPartKey

type PartVisibility = Record<PartKey, boolean>

const CURRENT_LABELS: Record<CurrentPartKey, string> = {
    plate: 'Plate',
    pcb: 'PCB',
    housingTop: 'Housing Top',
    housingBottom: 'Housing Bottom',
    lolin: 'LOLIN S3 Mini',
    switches: 'Switches',
    keycaps: 'Keycaps',
}

const OLD_LABELS: Record<OldPartKey, string> = {
    oldTop: 'Case Top',
    oldBottom: 'Case Bottom',
}

const OLD_OFFSET_X = -330

export const PlateViewerPage: FC = () => {
    const [visibility, setVisibility] = useState<PartVisibility>({
        plate: true,
        pcb: true,
        housingTop: true,
        housingBottom: true,
        lolin: true,
        switches: true,
        keycaps: true,
        oldTop: true,
        oldBottom: true,
    })

    const toggle = (key: PartKey) => setVisibility((prev) => ({ ...prev, [key]: !prev[key] }))

    const plateGeom = useMemo(() => evaluateJscadSource(plateSource), [])
    const housingTopGeom = useMemo(() => buildHousingTopGeom(), [])
    const housingBottomGeom = useMemo(() => buildHousingBottomGeom(), [])
    const pcbGeom = useMemo(() => buildPcbGeom(), [])
    const lolinPcbGeom = useMemo(() => buildLolinPcbGeom(), [])
    const lolinUsbCGeom = useMemo(() => buildLolinUsbCGeom(), [])

    return (
        <div style={{ display: 'flex', width: '100%', height: '100vh' }}>
            <Sidebar visibility={visibility} onToggle={toggle} />
            <div style={{ flex: 1, position: 'relative' }}>
                <Viewport>
                    <group rotation={[0, Math.PI, 0]}>
                        {visibility.plate && (
                            <PlateMesh
                                geom={plateGeom}
                                plateCenterX={KEYBOARD_GEOMETRY.plateCenterX}
                                plateCenterY={KEYBOARD_GEOMETRY.plateCenterY}
                                plateMinY={KEYBOARD_GEOMETRY.plateMinY}
                                frontBottomZ={KEYBOARD_GEOMETRY.plateFrontBottomZ}
                                tiltDeg={KEYBOARD_GEOMETRY.plateTiltDeg}
                            />
                        )}
                        {visibility.pcb && (
                            <PcbMesh
                                geom={pcbGeom}
                                plateCenterX={KEYBOARD_GEOMETRY.plateCenterX}
                                plateCenterY={KEYBOARD_GEOMETRY.plateCenterY}
                                plateMinY={KEYBOARD_GEOMETRY.plateMinY}
                                frontBottomZ={KEYBOARD_GEOMETRY.pcbFrontBottomZ}
                                tiltDeg={KEYBOARD_GEOMETRY.plateTiltDeg}
                            />
                        )}
                        {visibility.housingTop && (
                            <HousingTopMesh
                                geom={housingTopGeom}
                                plateCenterX={KEYBOARD_GEOMETRY.plateCenterX}
                                plateCenterY={KEYBOARD_GEOMETRY.plateCenterY}
                                baseZ={0}
                            />
                        )}
                        {visibility.housingBottom && (
                            <HousingBottomMesh
                                geom={housingBottomGeom}
                                plateCenterX={KEYBOARD_GEOMETRY.plateCenterX}
                                plateCenterY={KEYBOARD_GEOMETRY.plateCenterY}
                                baseZ={0}
                            />
                        )}
                        {visibility.lolin && (
                            <LolinMesh
                                pcbGeom={lolinPcbGeom}
                                usbCGeom={lolinUsbCGeom}
                                plateCenterX={KEYBOARD_GEOMETRY.plateCenterX}
                                plateCenterY={KEYBOARD_GEOMETRY.plateCenterY}
                                baseZ={0}
                            />
                        )}
                        {visibility.switches && <SwitchMesh />}
                        {visibility.keycaps && <KeycapMesh />}
                        {visibility.oldTop && (
                            <OldStlMesh
                                url={oldTopUrl}
                                plateCenterX={KEYBOARD_GEOMETRY.plateCenterX}
                                plateCenterY={KEYBOARD_GEOMETRY.plateCenterY}
                                offsetX={OLD_OFFSET_X}
                                zOffset={KEYBOARD_GEOMETRY.caseFloorBottomZ}
                                color={VIEWER_STYLE.oldTop.color}
                            />
                        )}
                        {visibility.oldBottom && (
                            <OldStlMesh
                                url={oldBottomUrl}
                                plateCenterX={KEYBOARD_GEOMETRY.plateCenterX}
                                plateCenterY={KEYBOARD_GEOMETRY.plateCenterY}
                                offsetX={OLD_OFFSET_X}
                                zOffset={KEYBOARD_GEOMETRY.caseFloorBottomZ}
                                color={VIEWER_STYLE.oldBottom.color}
                            />
                        )}
                    </group>
                </Viewport>
            </div>
        </div>
    )
}

type SidebarProps = {
    visibility: PartVisibility
    onToggle: (key: PartKey) => void
}

const Sidebar: FC<SidebarProps> = ({ visibility, onToggle }) => (
    <aside style={sidebarStyle}>
        <div style={brandStyle}>49-pcba viewer</div>
        <div style={sectionStyle}>
            <div style={sectionTitleStyle}>Parts</div>
            {(Object.keys(CURRENT_LABELS) as CurrentPartKey[]).map((key) => (
                <Toggle
                    key={key}
                    label={CURRENT_LABELS[key]}
                    checked={visibility[key]}
                    onChange={() => onToggle(key)}
                />
            ))}
        </div>
        <div style={sectionStyle}>
            <div style={sectionTitleStyle}>49-old (compare)</div>
            {(Object.keys(OLD_LABELS) as OldPartKey[]).map((key) => (
                <Toggle key={key} label={OLD_LABELS[key]} checked={visibility[key]} onChange={() => onToggle(key)} />
            ))}
        </div>
    </aside>
)

type ToggleProps = {
    label: string
    checked: boolean
    onChange: () => void
}

const Toggle: FC<ToggleProps> = ({ label, checked, onChange }) => (
    <label style={toggleLabelStyle}>
        <input type='checkbox' checked={checked} onChange={onChange} style={checkboxStyle} />
        <span>{label}</span>
    </label>
)

const sidebarStyle: CSSProperties = {
    width: 220,
    flexShrink: 0,
    height: '100vh',
    background: '#1c1d20',
    borderRight: '1px solid #2e2f33',
    color: '#e6e6e6',
    fontSize: 12,
    display: 'flex',
    flexDirection: 'column',
    padding: '16px 14px',
    gap: 18,
    boxSizing: 'border-box',
}

const brandStyle: CSSProperties = {
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: 0.3,
    color: '#f4f4f5',
    paddingBottom: 12,
    borderBottom: '1px solid #2e2f33',
}

const sectionStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
}

const sectionTitleStyle: CSSProperties = {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: '#8a8a90',
    marginBottom: 4,
}

const toggleLabelStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    cursor: 'pointer',
    userSelect: 'none',
    padding: '4px 0',
}

const checkboxStyle: CSSProperties = {
    width: 14,
    height: 14,
    accentColor: '#3b82f6',
    cursor: 'pointer',
}
