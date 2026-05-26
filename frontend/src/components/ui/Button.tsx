/**
 * Button Component
 * Professional button component with multiple variants
 */

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-primary-600 text-white hover:bg-primary-700 focus-visible:ring-primary-600',
        secondary: 'bg-secondary-600 text-white hover:bg-secondary-700 focus-visible:ring-secondary-600',
        outline: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus-visible:ring-primary-600',
        ghost: 'text-gray-700 hover:bg-gray-100 focus-visible:ring-primary-600',
        danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600',
        success: 'bg-green-600 text-white hover:bg-green-700 focus-visible:ring-green-600',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
        icon: 'h-10 w-10',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
      loading: {
        true: 'pointer-events-none opacity-70',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false,
      loading: false,
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
  loadingText?: string;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      isLoading,
      loadingText,
      children,
      disabled,
      ...props
    },
    ref
  ) => (
    <button
      className={cn(
        buttonVariants({
          variant,
          size,
          fullWidth,
          loading: isLoading,
        }),
        className
      )}
      disabled={disabled || isLoading}
      ref={ref}
      {...props}
    >
      {isLoading ? loadingText || 'Loading...' : children}
    </button>
  )
);

Button.displayName = 'Button';

export { Button, buttonVariants };
