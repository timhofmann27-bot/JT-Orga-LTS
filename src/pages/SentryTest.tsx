import { ErrorBoundary } from '@sentry/react';
import { useEffect, useState } from 'react';

function SentryTestComponent() {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    throw new Error('Test error from Sentry integration!');
  }

  return (
    <div className="p-4">
      <h2 className="text-xl text-white font-bold mb-4">Sentry Integration Test</h2>
      <button
        onClick={() => setHasError(true)}
        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
      >
        Trigger Test Error
      </button>
      <p className="mt-4 text-white/60 text-sm">
        Click the button to test error tracking. Check Sentry dashboard to verify.
      </p>
    </div>
  );
}

export default function SentryTestPage() {
  useEffect(() => {
    console.log('[Sentry Test] Page loaded');
  }, []);

  return (
    <ErrorBoundary
      fallback={({ error, resetError }) => (
        <div className="p-8 text-center">
          <h2 className="text-2xl text-white font-bold mb-4">Oops!</h2>
          <p className="text-white/60 mb-4">
            {(error as any)?.message || 'Something went wrong'}
          </p>
          <button
            onClick={resetError}
            className="px-4 py-2 bg-white text-black rounded-lg"
          >
            Try Again
          </button>
        </div>
      )}
    >
      <SentryTestComponent />
    </ErrorBoundary>
  );
}
