import type { FC } from 'react'
import type { LayerStyle } from '@renderer/types'
import { DEFAULT_LAYER_STYLE } from '@entities/viewer-settings/viewer-settings'
import { Checkbox } from '@shared/ui/checkbox'
import { Slider } from '@shared/ui/slider'
import { cn } from '@shared/lib/cn'

type LayerControlRowProps = {
    label: string
    style: LayerStyle
    onChange: (style: LayerStyle) => void
}

export const LayerControlRow: FC<LayerControlRowProps> = ({ label, style, onChange }) => (
    <div className={cn('grid grid-cols-[1rem_4.5rem_1.5rem_1fr_2.5rem] items-center gap-2 py-0.5', !style.visible && 'opacity-50')}>
        <Checkbox checked={style.visible} onCheckedChange={(v) => onChange({ ...style, visible: v === true })} />
        <button
            type='button'
            className='cursor-pointer text-left text-xs text-foreground'
            onClick={() => onChange({ ...style, visible: !style.visible })}>
            {label}
        </button>
        <div className='relative size-4'>
            <input
                type='color'
                value={style.color ?? '#ffffff'}
                className='absolute inset-0 size-4 cursor-pointer'
                onChange={(e) => onChange({ ...style, color: e.target.value })}
            />
            {style.color === null && (
                <div className='pointer-events-none absolute inset-0 border border-border bg-[linear-gradient(135deg,#3a3b43_50%,#22232b_50%)]' />
            )}
        </div>
        <Slider
            min={0}
            max={100}
            step={5}
            value={[Math.round(style.opacity * 100)]}
            onValueChange={([v]) => onChange({ ...style, opacity: (v ?? 100) / 100 })}
        />
        <button
            type='button'
            className='cursor-pointer text-right text-[10px] tabular-nums text-muted-foreground hover:text-foreground'
            title='기본값으로'
            onClick={() => onChange({ ...DEFAULT_LAYER_STYLE })}>
            {Math.round(style.opacity * 100)}%
        </button>
    </div>
)
