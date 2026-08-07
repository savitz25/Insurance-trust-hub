import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Insurance Trust Hub buttons — Shield Blue primary (#0284C7).
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0284C7] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-[#0284C7] text-white hover:bg-[#1E3A8A]',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline:
          'border border-[#E2E8F0] bg-white text-[#0A2540] hover:border-[#0284C7]/40 hover:bg-[#E0F2FE]/50',
        secondary: 'bg-[#E0F2FE] text-[#0A2540] hover:bg-[#E0F2FE]/80',
        ghost: 'text-[#0A2540] hover:bg-[#E0F2FE]/60 hover:text-[#0284C7]',
        link: 'text-[#0284C7] underline-offset-4 hover:underline',
        trust: 'bg-[#0284C7] text-white hover:bg-[#1E3A8A]',
        navy: 'bg-[#0A2540] text-white hover:bg-[#0A2540]/90',
      },
      size: {
        default: 'h-10 px-5 py-2',
        sm: 'h-8 rounded-lg px-3 text-xs',
        lg: 'h-12 px-8 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
