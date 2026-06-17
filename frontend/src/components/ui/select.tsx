import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

// Select nativo estilizado (suficiente para formularios; sin dependencias extra).
export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ className, children, ...props }, ref) => (
  <div className="relative">
    <select
      ref={ref}
      className={cn(
        'flex h-11 w-full appearance-none rounded-md border border-input bg-coal px-3 py-2 pr-9 text-sm text-cream',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-gold/50',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    >
      {children}
    </select>
    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cream/50" />
  </div>
));
Select.displayName = 'Select';

export { Select };
