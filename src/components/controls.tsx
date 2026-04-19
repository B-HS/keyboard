import type { FC } from 'react'
import type { PartVisibility, BuildParams, SwitchOrient, KeycapOrient } from '../models'

type ControlsProps = {
    visibility: PartVisibility
    setVisibility: (v: PartVisibility) => void
    params: BuildParams
    setParams: (p: BuildParams) => void
    switchOrient: SwitchOrient
    setSwitchOrient: (o: SwitchOrient) => void
    keycapOrient: KeycapOrient
    setKeycapOrient: (o: KeycapOrient) => void
    onExportStl: () => void
}

const NumberRow: FC<{
    label: string
    value: number
    step?: number
    min?: number
    onChange: (v: number) => void
}> = ({ label, value, step = 0.5, min = 0, onChange }) => (
    <div className='row'>
        <span>{label}</span>
        <input type='number' value={value} step={step} min={min} onChange={(e) => onChange(parseFloat(e.target.value) || 0)} />
    </div>
)

export const Controls: FC<ControlsProps> = ({
    visibility,
    setVisibility,
    params,
    setParams,
    switchOrient,
    setSwitchOrient,
    keycapOrient,
    setKeycapOrient,
    onExportStl,
}) => {
    const togglePart = (key: keyof PartVisibility) => {
        setVisibility({ ...visibility, [key]: !visibility[key] })
    }

    const updatePlate = (patch: Partial<BuildParams['plate']>) => {
        setParams({ ...params, plate: { ...params.plate, ...patch } })
    }

    const updateSwitch = (patch: Partial<SwitchOrient>) => {
        setSwitchOrient({ ...switchOrient, ...patch })
    }

    const updateKeycap = (patch: Partial<KeycapOrient>) => {
        setKeycapOrient({ ...keycapOrient, ...patch })
    }

    const toDeg = (r: number) => (r * 180) / Math.PI
    const fromDeg = (d: number) => (d * Math.PI) / 180

    return (
        <aside className='sidebar'>
            <h1>49 Keyboard CAD</h1>

            <h2>Parts</h2>
            <label>
                <input type='checkbox' checked={visibility.plate} onChange={() => togglePart('plate')} />
                Switch Plate
            </label>
            <label>
                <input type='checkbox' checked={visibility.case} onChange={() => togglePart('case')} />
                Case
            </label>
            <label>
                <input type='checkbox' checked={visibility.switches} onChange={() => togglePart('switches')} />
                Switches (Cherry MX)
            </label>
            <label>
                <input type='checkbox' checked={visibility.lolin} onChange={() => togglePart('lolin')} />
                LOLIN S3 Mini
            </label>
            <label>
                <input type='checkbox' checked={visibility.perfBoard} onChange={() => togglePart('perfBoard')} />
                Perf Board (50×40×1.6)
            </label>
            <label>
                <input type='checkbox' checked={visibility.slideSwitch} onChange={() => togglePart('slideSwitch')} />
                Slide Switch
            </label>
            <label>
                <input type='checkbox' checked={visibility.stabilizers} onChange={() => togglePart('stabilizers')} />
                Stabilizers
            </label>
            <label>
                <input type='checkbox' checked={visibility.keycaps} onChange={() => togglePart('keycaps')} />
                Keycaps
            </label>
            <label>
                <input type='checkbox' checked={visibility.footPads} onChange={() => togglePart('footPads')} />
                Foot Pads
            </label>
            <label>
                <input type='checkbox' checked={visibility.batteryCover} onChange={() => togglePart('batteryCover')} />
                Battery Cover
            </label>
            <label>
                <input type='checkbox' checked={visibility.batteries} onChange={() => togglePart('batteries')} />
                Batteries (3×AAA)
            </label>
            <label>
                <input type='checkbox' checked={visibility.batteryContacts} onChange={() => togglePart('batteryContacts')} />
                Battery Contacts
            </label>
            <label>
                <input type='checkbox' checked={visibility.phone} onChange={() => togglePart('phone')} />
                Phone (77.6×160.7×7.85mm)
            </label>

            <h2>Plate (from docs/models/49-final.jscad)</h2>
            <NumberRow label='Thickness' value={params.plate.thickness} onChange={(v) => updatePlate({ thickness: v })} />
            <NumberRow label='Corner R' value={params.plate.cornerRadius} onChange={(v) => updatePlate({ cornerRadius: v })} />
            <NumberRow label='Switch Cut' value={params.plate.switchCutoutSize} step={0.1} onChange={(v) => updatePlate({ switchCutoutSize: v })} />
            <NumberRow label='Screw R' value={params.plate.screwHoleRadius} step={0.1} onChange={(v) => updatePlate({ screwHoleRadius: v })} />

            <h2>Switch Orient</h2>
            <NumberRow
                label='Z Offset (mm)'
                value={switchOrient.mountZOffset}
                step={0.1}
                min={-50}
                onChange={(v) => updateSwitch({ mountZOffset: v })}
            />
            <NumberRow
                label='Rot X (°)'
                value={toDeg(switchOrient.rotationX)}
                step={5}
                min={-360}
                onChange={(v) => updateSwitch({ rotationX: fromDeg(v) })}
            />
            <NumberRow
                label='Rot Y (°)'
                value={toDeg(switchOrient.rotationY)}
                step={5}
                min={-360}
                onChange={(v) => updateSwitch({ rotationY: fromDeg(v) })}
            />
            <NumberRow
                label='Rot Z (°)'
                value={toDeg(switchOrient.rotationZ)}
                step={5}
                min={-360}
                onChange={(v) => updateSwitch({ rotationZ: fromDeg(v) })}
            />

            <h2>Keycap Orient</h2>
            <NumberRow
                label='Z Offset (mm)'
                value={keycapOrient.mountZOffset}
                step={0.1}
                min={-50}
                onChange={(v) => updateKeycap({ mountZOffset: v })}
            />
            <NumberRow
                label='Rot X (°)'
                value={toDeg(keycapOrient.rotationX)}
                step={5}
                min={-360}
                onChange={(v) => updateKeycap({ rotationX: fromDeg(v) })}
            />
            <NumberRow
                label='Rot Y (°)'
                value={toDeg(keycapOrient.rotationY)}
                step={5}
                min={-360}
                onChange={(v) => updateKeycap({ rotationY: fromDeg(v) })}
            />
            <NumberRow
                label='Rot Z (°)'
                value={toDeg(keycapOrient.rotationZ)}
                step={5}
                min={-360}
                onChange={(v) => updateKeycap({ rotationZ: fromDeg(v) })}
            />

            <h2>Export</h2>
            <button onClick={onExportStl}>Download STL</button>
        </aside>
    )
}
