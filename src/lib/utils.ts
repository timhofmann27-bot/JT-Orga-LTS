import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function hapticFeedback(pattern: 'light' | 'medium' | 'heavy' | 'success' | 'error' = 'light') {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    const patterns = {
      light: 10,
      medium: 20,
      heavy: 40,
      success: [10, 50, 10],
      error: [40, 50, 40],
    };
    navigator.vibrate(patterns[pattern]);
  }
}

export function triggerHaptic(event: React.MouseEvent | React.TouchEvent, pattern: 'light' | 'medium' | 'heavy' | 'success' | 'error' = 'light') {
  hapticFeedback(pattern);
}
