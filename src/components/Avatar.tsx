import React from 'react';
import { getAvatarColor, getInitials } from '../lib/avatar';

interface AvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-xl'
};

export default function Avatar({ name, avatarUrl, size = 'md', className = '' }: AvatarProps) {
  const sizeClass = sizeClasses[size];
  const bgColor = getAvatarColor(name || 'User');
  const initials = getInitials(name || 'User');

  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center text-white font-bold shadow-md ring-2 ring-white/10 overflow-hidden ${className}`}
      style={{
        backgroundColor: avatarUrl ? 'transparent' : bgColor
      }}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name}
          className="w-full h-full object-cover"
        />
      ) : (
        initials
      )}
    </div>
  );
}