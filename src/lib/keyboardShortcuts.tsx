import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { hapticFeedback } from './utils';

interface Shortcut {
  key: string;
  handler: () => void;
  description: string;
  category: 'navigation' | 'actions' | 'global';
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
}

const shortcuts: Shortcut[] = [
  {
    key: 'g',
    handler: () => {},
    description: 'Go to Dashboard',
    category: 'navigation',
  },
  {
    key: 'e',
    handler: () => {},
    description: 'Go to Events',
    category: 'navigation',
  },
  {
    key: 'm',
    handler: () => {},
    description: 'Go to Members',
    category: 'navigation',
  },
  {
    key: 's',
    handler: () => {},
    description: 'Go to Stats',
    category: 'navigation',
  },
  {
    key: 'n',
    handler: () => {},
    description: 'Open Notifications',
    category: 'actions',
  },
  {
    key: '?',
    handler: () => {},
    description: 'Show Keyboard Shortcuts',
    category: 'global',
    shift: true,
  },
  {
    key: 'Escape',
    handler: () => {},
    description: 'Close Modal/Menu',
    category: 'global',
  },
];

export function useKeyboardShortcuts() {
  const navigate = useNavigate();

  const handleShortcut = useCallback((key: string) => {
    hapticFeedback('light');
    
    switch (key) {
      case 'g':
        navigate('/');
        break;
      case 'e':
        navigate('/events');
        break;
      case 'm':
        navigate('/persons');
        break;
      case 's':
        navigate('/stats');
        break;
      case 'n':
        // Open notifications - would need ref to notifications component
        break;
      default:
        break;
    }
  }, [navigate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input/textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Handle single key shortcuts
      if (!e.ctrlKey && !e.altKey && !e.metaKey) {
        const key = e.key.toLowerCase();
        if (['g', 'e', 'm', 's', 'n'].includes(key)) {
          e.preventDefault();
          handleShortcut(key);
        }
        
        // Show help with Shift+?
        if (e.shiftKey && key === '/') {
          e.preventDefault();
          // Open shortcuts modal
          console.log('Show keyboard shortcuts');
        }
      }

      // Handle Escape
      if (e.key === 'Escape') {
        // Close modals, menus, etc.
        document.dispatchEvent(new CustomEvent('close-modals'));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleShortcut]);
}

export function getShortcuts() {
  return shortcuts;
}

export function ShortcutsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  const categories = ['global', 'navigation', 'actions'];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
    >
      <div
        className="glass rounded-3xl p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 id="shortcuts-title" className="text-2xl font-serif font-bold">
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-white/50 hover:text-white transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          {categories.map((category) => {
            const categoryShortcuts = shortcuts.filter((s) => s.category === category);
            if (categoryShortcuts.length === 0) return null;

            return (
              <div key={category}>
                <h3 className="text-xs font-black uppercase tracking-widest text-white/40 mb-3">
                  {category}
                </h3>
                <div className="space-y-2">
                  {categoryShortcuts.map((shortcut) => (
                    <div
                      key={shortcut.key}
                      className="flex items-center justify-between p-3 bg-white/5 rounded-xl"
                    >
                      <span className="text-white/80">{shortcut.description}</span>
                      <kbd className="px-3 py-1.5 bg-white/10 rounded-lg text-sm font-mono">
                        {shortcut.shift && 'Shift + '}
                        {shortcut.key === ' ' ? 'Space' : shortcut.key.toUpperCase()}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 pt-6 border-t border-white/10">
          <p className="text-xs text-white/40 text-center">
            Press <kbd className="px-2 py-0.5 bg-white/10 rounded">?</kbd> to open this help anytime
          </p>
        </div>
      </div>
    </div>
  );
}
