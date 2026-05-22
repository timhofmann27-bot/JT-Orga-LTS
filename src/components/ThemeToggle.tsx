import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme, type Theme } from './ThemeProvider';
import { cn } from '../lib/utils';
import { hapticFeedback } from '../lib/utils';

export function ThemeToggle() {
  const { theme, setTheme, actualTheme } = useTheme();

  const themes: { value: Theme; icon: React.ReactNode; label: string }[] = [
    { value: 'light', icon: <Sun className="w-4 h-4" />, label: 'Light' },
    { value: 'dark', icon: <Moon className="w-4 h-4" />, label: 'Dark' },
    { value: 'system', icon: <Monitor className="w-4 h-4" />, label: 'System' },
  ];

  const handleThemeChange = (newTheme: Theme) => {
    hapticFeedback('light');
    setTheme(newTheme);
  };

  return (
    <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1 border border-white/10">
      {themes.map(({ value, icon, label }) => (
        <button
          key={value}
          onClick={() => handleThemeChange(value)}
          className={cn(
            'relative flex items-center justify-center w-9 h-9 rounded-lg transition-all',
            theme === value
              ? 'bg-white text-black shadow-lg'
              : 'text-white/50 hover:text-white hover:bg-white/5'
          )}
          aria-label={label}
          aria-pressed={theme === value}
          title={label}
        >
          {icon}
        </button>
      ))}
    </div>
  );
}
