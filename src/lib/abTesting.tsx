import { createContext, useContext, useState, useEffect } from 'react';

interface Experiment {
  id: string;
  name: string;
  variants: string[];
  weights?: number[];
}

interface ExperimentContextType {
  getVariant: (experimentId: string) => string;
  trackConversion: (experimentId: string, variant: string, value?: number) => void;
  activeExperiments: string[];
}

const ExperimentContext = createContext<ExperimentContextType | null>(null);

const experiments: Experiment[] = [
  {
    id: 'cta_button_color',
    name: 'CTA Button Color Test',
    variants: ['primary', 'secondary'],
    weights: [50, 50],
  },
  {
    id: 'homepage_layout',
    name: 'Homepage Layout Test',
    variants: ['grid', 'list'],
    weights: [50, 50],
  },
];

function getVariantFromStorage(experimentId: string): string | null {
  try {
    return localStorage.getItem(`ab_test_${experimentId}`);
  } catch {
    return null;
  }
}

function saveVariantToStorage(experimentId: string, variant: string) {
  try {
    localStorage.setItem(`ab_test_${experimentId}`, variant);
  } catch {}
}

function assignVariant(experiment: Experiment): string {
  const stored = getVariantFromStorage(experiment.id);
  if (stored && experiment.variants.includes(stored)) {
    return stored;
  }

  const weights = experiment.weights || new Array(experiment.variants.length).fill(100 / experiment.variants.length);
  const random = Math.random() * 100;
  
  let cumulative = 0;
  for (let i = 0; i < weights.length; i++) {
    cumulative += weights[i];
    if (random <= cumulative) {
      const variant = experiment.variants[i];
      saveVariantToStorage(experiment.id, variant);
      return variant;
    }
  }

  return experiment.variants[0];
}

export function ABTestProvider({ children }: { children: React.ReactNode }) {
  const [activeExperiments, setActiveExperiments] = useState<string[]>([]);

  const getVariant = (experimentId: string): string => {
    const experiment = experiments.find((e) => e.id === experimentId);
    if (!experiment) {
      console.warn(`[A/B Test] Experiment ${experimentId} not found`);
      return 'control';
    }

    const variant = assignVariant(experiment);
    
    if (!activeExperiments.includes(experimentId)) {
      setActiveExperiments((prev) => [...prev, experimentId]);
      
      // Track exposure
      console.log(`[A/B Test] ${experiment.name}: Assigned to ${variant}`);
      trackEvent('ab_test_exposure', {
        experiment_id: experimentId,
        variant,
      });
    }

    return variant;
  };

  const trackConversion = (experimentId: string, variant: string, value = 1) => {
    console.log(`[A/B Test] Conversion: ${experimentId} - ${variant} = ${value}`);
    trackEvent('ab_test_conversion', {
      experiment_id: experimentId,
      variant,
      value,
    });
  };

  return (
    <ExperimentContext.Provider value={{ getVariant, trackConversion, activeExperiments }}>
      {children}
    </ExperimentContext.Provider>
  );
}

export function useABTest() {
  const context = useContext(ExperimentContext);
  if (!context) {
    throw new Error('useABTest must be used within ABTestProvider');
  }
  return context;
}

function trackEvent(eventName: string, data: any) {
  // Send to analytics service (Google Analytics, Mixpanel, etc.)
  // For now, just log
  console.log(`[Analytics] ${eventName}:`, data);
  
  // Example: Send to backend
  // fetch('/api/analytics', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ event: eventName, data }),
  // });
}

export function ABTestComponent({
  experimentId,
  children,
}: {
  experimentId: string;
  children: (variant: string) => React.ReactNode;
}) {
  const { getVariant } = useABTest();
  const variant = getVariant(experimentId);
  
  return <>{children(variant)}</>;
}
