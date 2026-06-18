import * as React from 'react';
import { cn } from '@/lib/utils';

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
}

/** Toggle simple (sin dependencias extra). */
export function Switch({ checked, onCheckedChange, disabled, className, ...rest }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-transparent transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-ink',
        'disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-gold' : 'bg-secondary',
        className
      )}
      {...rest}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 transform rounded-full bg-ink transition-transform',
          checked ? 'translate-x-6' : 'translate-x-1'
        )}
      />
    </button>
  );
}
