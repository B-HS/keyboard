import { useState, type FC } from 'react'
import stlSerializer from '@jscad/stl-serializer'
import type { LayerKey, LayerStyle, ReferenceToggle } from '@renderer/types'
import { buildPrintParts } from '@65/export/stl-parts'
import { createDefaultSettings, type ViewerSettings } from '@entities/viewer-settings/viewer-settings'
import { LayerControlRow } from '@features/layer-control/layer-control-row'
import { ExportSection } from '@features/export-controls/export-section'
import { Checkbox } from '@shared/ui/checkbox'

const LAYER_LABELS: Record<LayerKey, string> = {
    top: '상판',
    pcb: 'PCB',
    bottom: '하판',
    esp32: 'ESP32',
    spacers: '스페이서',
    bolts: '볼트',
    switches: '스위치',
    keycaps: '키캡',
}

type ControlPanelProps = {
    settings: ViewerSettings
    references: ReferenceToggle[]
    layerKeys: LayerKey[]
    onChange: (settings: ViewerSettings) => void
}

export const ControlPanel: FC<ControlPanelProps> = ({ settings, references, layerKeys, onChange }) => {
    const [exporting, setExporting] = useState(false)

    const setLayer = (key: LayerKey, style: LayerStyle) => onChange({ ...settings, layers: { ...settings.layers, [key]: style } })

    const handleExport = (scale: number) => {
        setExporting(true)
        setTimeout(() => {
            try {
                for (const part of buildPrintParts(scale)) {
                    const blob = new Blob(stlSerializer.serialize({ binary: true }, part.geom), { type: 'model/stl' })
                    const url = URL.createObjectURL(blob)
                    const anchor = document.createElement('a')
                    anchor.href = url
                    anchor.download = `${part.name}-x${scale}.stl`
                    anchor.click()
                    URL.revokeObjectURL(url)
                }
            } finally {
                setExporting(false)
            }
        }, 0)
    }

    return (
        <div className='fixed top-3 left-3 w-72 border border-border bg-card p-3 text-sm text-card-foreground select-none backdrop-blur'>
            <div className='mb-2 flex items-baseline justify-between'>
                <h1 className='text-sm font-semibold'>split-65 (좌+우)</h1>
                <button
                    type='button'
                    className='cursor-pointer text-[10px] text-muted-foreground hover:text-foreground'
                    onClick={() => onChange(createDefaultSettings())}>
                    초기화
                </button>
            </div>
            <div className='mb-1 grid grid-cols-[1rem_4.5rem_1.5rem_1fr_2.5rem] gap-2 text-[10px] text-muted-foreground'>
                <span />
                <span>부품</span>
                <span>색</span>
                <span>투명도</span>
                <span />
            </div>
            {layerKeys.map((key) => (
                <LayerControlRow key={key} label={LAYER_LABELS[key]} style={settings.layers[key]} onChange={(style) => setLayer(key, style)} />
            ))}
            {references.length > 0 && (
                <div className='mt-2 border-t border-border pt-2'>
                    <div className='mb-1 text-[10px] text-muted-foreground'>비교 레퍼런스</div>
                    <div className='flex flex-wrap gap-x-4 gap-y-1'>
                        {references.map((ref) => (
                            <label key={ref.key} className='flex cursor-pointer items-center gap-1.5 text-xs'>
                                <Checkbox
                                    checked={settings.references[ref.key] ?? false}
                                    onCheckedChange={(v) => onChange({ ...settings, references: { ...settings.references, [ref.key]: v === true } })}
                                />
                                {ref.label}
                            </label>
                        ))}
                    </div>
                </div>
            )}
            <ExportSection busy={exporting} onExport={handleExport} />
            <p className='mt-2 text-[10px] text-muted-foreground'>드래그 회전 · 휠 확대 · 우클릭 이동 · 설정은 자동 저장</p>
        </div>
    )
}
