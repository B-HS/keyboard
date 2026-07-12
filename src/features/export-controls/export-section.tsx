import { useState, type FC } from 'react'

type ExportSectionProps = {
    busy: boolean
    onExport: (scale: number) => void
}

export const ExportSection: FC<ExportSectionProps> = ({ busy, onExport }) => {
    const [scaleText, setScaleText] = useState('0.2')
    const scale = Number(scaleText)
    const valid = Number.isFinite(scale) && scale > 0 && scale <= 1

    return (
        <div className='mt-2 border-t border-border pt-2'>
            <div className='mb-1 text-[10px] text-muted-foreground'>STL Export — 상판·플레이트·하판 (3장)</div>
            <div className='flex items-center gap-2'>
                <label className='flex items-center gap-1 text-xs'>
                    scale
                    <input
                        type='number'
                        min={0.05}
                        max={1}
                        step={0.05}
                        value={scaleText}
                        onChange={(e) => setScaleText(e.target.value)}
                        className='w-16 border border-border bg-input px-1 py-0.5 text-xs text-foreground outline-none focus-visible:ring-1 focus-visible:ring-accent'
                    />
                </label>
                <div className='flex gap-1'>
                    {['0.2', '0.5', '1'].map((preset) => (
                        <button
                            key={preset}
                            type='button'
                            className='cursor-pointer border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-foreground'
                            onClick={() => setScaleText(preset)}>
                            {preset === '1' ? '1:1' : `1/${Math.round(1 / Number(preset))}`}
                        </button>
                    ))}
                </div>
                <button
                    type='button'
                    disabled={!valid || busy}
                    className='ml-auto cursor-pointer border border-accent bg-accent/20 px-2 py-0.5 text-xs text-foreground hover:bg-accent/40 disabled:cursor-not-allowed disabled:opacity-40'
                    onClick={() => onExport(scale)}>
                    {busy ? '생성 중…' : 'Export'}
                </button>
            </div>
        </div>
    )
}
