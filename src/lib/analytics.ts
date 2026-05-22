import { useEffect } from 'react';

export interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
}

const thresholds = {
  FCP: { good: 1800, poor: 3000 },
  LCP: { good: 2500, poor: 4000 },
  FID: { good: 100, poor: 300 },
  CLS: { good: 0.1, poor: 0.25 },
  TTFB: { good: 800, poor: 1800 },
};

function getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const threshold = thresholds[name as keyof typeof thresholds];
  if (!threshold) return 'good';
  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}

export function useWebVitals(onReport?: (metric: PerformanceMetric) => void) {
  useEffect(() => {
    const reportMetric = (metric: PerformanceMetric) => {
      try {
        const key = `vital_${metric.name.toLowerCase()}`;
        const data = {
          value: metric.value,
          rating: metric.rating,
          timestamp: Date.now(),
        };
        localStorage.setItem(key, JSON.stringify(data));
      } catch (e) {}

      onReport?.(metric);
    };

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          reportMetric({
            name: 'FCP',
            value: entry.startTime,
            rating: getRating('FCP', entry.startTime),
            delta: entry.startTime,
          });
        }
      }
    });

    try {
      observer.observe({ entryTypes: ['paint'] });
    } catch (e) {}

    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      reportMetric({
        name: 'LCP',
        value: lastEntry.startTime,
        rating: getRating('LCP', lastEntry.startTime),
        delta: lastEntry.startTime,
      });
    });

    try {
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (e) {}

    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value || 0;
          reportMetric({
            name: 'CLS',
            value: clsValue,
            rating: getRating('CLS', clsValue),
            delta: (entry as any).value || 0,
          });
        }
      }
    });

    try {
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    } catch (e) {}

    const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigationEntry) {
      const ttfb = navigationEntry.responseStart - navigationEntry.startTime;
      reportMetric({
        name: 'TTFB',
        value: ttfb,
        rating: getRating('TTFB', ttfb),
        delta: ttfb,
      });
    }

    return () => {
      observer.disconnect();
      lcpObserver.disconnect();
      clsObserver.disconnect();
    };
  }, [onReport]);
}

export function reportInteraction(name: string, duration: number) {
  try {
    const key = `interaction_${name.toLowerCase().replace(/\s+/g, '_')}`;
    const data = { duration, timestamp: Date.now() };
    const previous = localStorage.getItem(key);
    const history = previous ? JSON.parse(previous) : [];
    history.push(data);
    localStorage.setItem(key, JSON.stringify(history.slice(-100)));
  } catch (e) {}
}

export function trackPageView(page: string, duration?: number) {
  
  try {
    const key = 'page_views';
    const previous = localStorage.getItem(key);
    const history = previous ? JSON.parse(previous) : [];
    history.push({
      page,
      duration,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      connection: (navigator as any).connection?.effectiveType || 'unknown',
    });
    localStorage.setItem(key, JSON.stringify(history.slice(-100)));
  } catch (e) {}
}

export function getVitalsHistory() {
  const vitals = ['FCP', 'LCP', 'CLS', 'TTFB'];
  const history: Record<string, any> = {};
  
  vitals.forEach((vital) => {
    try {
      const data = localStorage.getItem(`vital_${vital.toLowerCase()}`);
      if (data) {
        history[vital] = JSON.parse(data);
      }
    } catch (e) {}
  });
  
  return history;
}
