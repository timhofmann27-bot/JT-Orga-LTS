import { useState, useEffect, useCallback } from 'react';

export interface Widget {
  id: string;
  title: string;
  visible: boolean;
  order: number;
}

const DEFAULT_WIDGETS: Widget[] = [
  { id: 'upcoming', title: 'Kommende Events', visible: true, order: 0 },
  { id: 'stats', title: 'Meine Statistik', visible: true, order: 1 },
  { id: 'weather', title: 'Wetter', visible: true, order: 2 },
  { id: 'notifications', title: 'Benachrichtigungen', visible: true, order: 3 },
  { id: 'quick-actions', title: 'Schnellaktionen', visible: true, order: 4 },
];

const STORAGE_KEY = 'jt-orga-dashboard-widgets';

export function useDashboardWidgets() {
  const [widgets, setWidgets] = useState<Widget[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge with defaults to handle new widgets
        return DEFAULT_WIDGETS.map(defaultWidget => {
          const saved = parsed.find((w: Widget) => w.id === defaultWidget.id);
          return saved || defaultWidget;
        }).sort((a, b) => a.order - b.order);
      }
    } catch (e) {
      console.error('Error loading dashboard widgets:', e);
    }
    return DEFAULT_WIDGETS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets));
    } catch (e) {
      console.error('Error saving dashboard widgets:', e);
    }
  }, [widgets]);

  const toggleWidget = useCallback((id: string) => {
    setWidgets(prev =>
      prev.map(w => (w.id === id ? { ...w, visible: !w.visible } : w))
    );
  }, []);

  const moveWidget = useCallback((id: string, direction: 'up' | 'down') => {
    setWidgets(prev => {
      const sorted = [...prev].sort((a, b) => a.order - b.order);
      const index = sorted.findIndex(w => w.id === id);
      if (index === -1) return prev;

      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= sorted.length) return prev;

      // Swap orders
      const temp = sorted[index].order;
      sorted[index].order = sorted[newIndex].order;
      sorted[newIndex].order = temp;

      return sorted;
    });
  }, []);

  const resetWidgets = useCallback(() => {
    setWidgets(DEFAULT_WIDGETS);
  }, []);

  return { widgets, toggleWidget, moveWidget, resetWidgets };
}