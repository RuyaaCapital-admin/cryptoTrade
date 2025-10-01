import React from 'react';
import { cn } from '@/lib/utils';

export interface NeumorphCardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  pressed?: boolean;
}

const NeumorphCard = React.forwardRef<HTMLDivElement, NeumorphCardProps>(
  ({ className, interactive = false, pressed = false, ...props }, ref) => {
    const baseClasses = 'rounded-xl transition-all duration-200';
    const interactiveClasses = interactive
      ? 'cursor-pointer hover:-translate-y-0.5 active:translate-y-0 active:shadow-neumorph-inner'
      : '';
    const shadowClasses = pressed ? 'shadow-neumorph-inner' : 'shadow-neumorph-outer';

    return (
      <div
        ref={ref}
        className={cn(baseClasses, shadowClasses, interactiveClasses, className)}
        {...props}
      />
    );
  }
);

NeumorphCard.displayName = 'NeumorphCard';

export { NeumorphCard };
