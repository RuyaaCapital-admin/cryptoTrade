import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Loader as Loader2 } from 'lucide-react';

const neumoButtonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-xl font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary:
          'bg-elevated text-text shadow-neumorph-outer hover:-translate-y-0.5 active:translate-y-0 active:shadow-neumorph-inner',
        ghost: 'text-text hover:bg-elevated hover:shadow-neumorph-outer',
        danger:
          'bg-down text-white shadow-neumorph-outer hover:-translate-y-0.5 active:translate-y-0 active:shadow-neumorph-inner',
      },
      size: {
        sm: 'h-9 px-4 text-sm',
        md: 'h-11 px-6 text-base',
        lg: 'h-13 px-8 text-lg',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface NeumoButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof neumoButtonVariants> {
  loading?: boolean;
}

const NeumoButton = React.forwardRef<HTMLButtonElement, NeumoButtonProps>(
  ({ className, variant, size, loading, children, disabled, ...props }, ref) => {
    return (
      <button
        className={cn(neumoButtonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);

NeumoButton.displayName = 'NeumoButton';

export { NeumoButton, neumoButtonVariants };
