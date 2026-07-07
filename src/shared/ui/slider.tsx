import type { ComponentProps, FC } from 'react'
import * as SliderPrimitive from '@radix-ui/react-slider'
import { cn } from '@shared/lib/cn'

export const Slider: FC<ComponentProps<typeof SliderPrimitive.Root>> = ({ className, ...props }) => (
    <SliderPrimitive.Root className={cn('relative flex h-4 w-full touch-none items-center select-none', className)} {...props}>
        <SliderPrimitive.Track className='relative h-1 grow bg-muted'>
            <SliderPrimitive.Range className='absolute h-full bg-accent' />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb className='block size-3 bg-foreground outline-none focus-visible:ring-1 focus-visible:ring-accent' />
    </SliderPrimitive.Root>
)
