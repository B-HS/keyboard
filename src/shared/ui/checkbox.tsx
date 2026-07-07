import type { ComponentProps, FC } from 'react'
import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import { cn } from '@shared/lib/cn'

export const Checkbox: FC<ComponentProps<typeof CheckboxPrimitive.Root>> = ({ className, ...props }) => (
    <CheckboxPrimitive.Root
        className={cn(
            'size-4 shrink-0 border border-border bg-input outline-none',
            'data-[state=checked]:border-accent data-[state=checked]:bg-accent',
            'focus-visible:ring-1 focus-visible:ring-accent disabled:opacity-40',
            className,
        )}
        {...props}>
        <CheckboxPrimitive.Indicator className='flex items-center justify-center text-primary-foreground'>
            <svg viewBox='0 0 12 12' className='size-3 fill-none stroke-white stroke-[2]'>
                <path d='M2.5 6.5 5 9l4.5-6' />
            </svg>
        </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
)
