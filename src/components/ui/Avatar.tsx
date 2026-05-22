import React, { useState } from 'react';
import { cn } from '../../lib/utils';

interface AvatarProps {
  src?: string;
  alt?: string;
  fallback: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'circle' | 'square';
  className?: string;
}

export function Avatar({
  src,
  alt,
  fallback,
  size = 'md',
  variant = 'circle',
  className,
}: AvatarProps) {
  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
  };

  const shapes = {
    circle: 'rounded-full',
    square: 'rounded-xl',
  };

  const [hasError, setHasError] = useState(false);

  return (
    <div
      className={cn(
        'relative flex items-center justify-center bg-white/10 overflow-hidden',
        sizes[size],
        shapes[variant],
        className
      )}
    >
      {src && !hasError ? (
        <img
          src={src}
          alt={alt || fallback}
          className="w-full h-full object-cover"
          onError={() => setHasError(true)}
        />
      ) : (
        <span className="font-bold text-white uppercase">
          {fallback.slice(0, 2)}
        </span>
      )}
    </div>
  );
}

interface AvatarGroupProps {
  children: React.ReactNode;
  max?: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function AvatarGroup({
  children,
  max = 4,
  size = 'md',
  className,
}: AvatarGroupProps) {
  const childArray = React.Children.toArray(children);
  const shown = childArray.slice(0, max);
  const remaining = childArray.length - max;

  const sizes = {
    sm: '-space-x-2',
    md: '-space-x-3',
    lg: '-space-x-4',
    xl: '-space-x-5',
  };

  return (
    <div className={cn('flex items-center', sizes[size], className)}>
      {shown}
      {remaining > 0 && (
        <div
          className={cn(
            'relative flex items-center justify-center bg-white/10 text-white font-bold uppercase rounded-full',
            size === 'sm' ? 'w-8 h-8 text-xs' :
            size === 'md' ? 'w-10 h-10 text-sm' :
            size === 'lg' ? 'w-12 h-12 text-base' :
            'w-16 h-16 text-lg'
          )}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
}
