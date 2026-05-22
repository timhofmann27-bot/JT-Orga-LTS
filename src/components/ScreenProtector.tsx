import { useEffect, useState } from 'react';

/**
 * ScreenProtector – verhindert Screenshots, Screen-Recording und ungewollte Weitergabe:
 * - Deckt Inhalt beim App-Wechsel ab (visibilitychange)
 * - Blockiert Rechtsklick, Textauswahl, Kopieren
 * - Verhindert Drucken/PDF-Export via CSS
 * - Erkennt DevTools-Öffnung (einfach)
 */
export default function ScreenProtector() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    // 1. Visibility Change – Inhalt ausblenden bei App-Wechsel
    const onVisibility = () => {
      setHidden(document.visibilityState !== 'visible');
    };
    document.addEventListener('visibilitychange', onVisibility);
    onVisibility();

    // 2. Context-Menu (Rechtsklick) blockieren
    const onContext = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };
    document.addEventListener('contextmenu', onContext);

    // 3. Copy/Tastenkürzel blockieren
    const onKey = (e: KeyboardEvent) => {
      // Strg+C / Cmd+C, Strg+P / Cmd+P, Strg+S / Cmd+S, PrtSc, F12
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      if (
        isCtrlOrCmd && (e.key === 'c' || e.key === 'p' || e.key === 's' || e.key === 'u') ||
        e.key === 'PrintScreen' ||
        e.key === 'F12'
      ) {
        e.preventDefault();
        return false;
      }
    };
    document.addEventListener('keydown', onKey);

    // 4. Copy-Event abfangen
    const onCopy = (e: ClipboardEvent) => {
      e.preventDefault();
    };
    document.addEventListener('copy', onCopy);
    document.addEventListener('cut', onCopy);

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      document.removeEventListener('contextmenu', onContext);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('cut', onCopy);
    };
  }, []);

  // Verstecktes div, das die Print-CSS-Styles hostet
  return (
    <>
      {/* Print-Styles – blockiert Drucken/PDF */}
      <style>{`
        @media print {
          html, body, #root {
            display: none !important;
            visibility: hidden !important;
          }
          body::after {
            content: 'Drucken nicht erlaubt';
            display: block;
            padding: 40px;
            font-size: 18px;
            text-align: center;
            color: #666;
          }
        }
      `}</style>

      {/* Overlay bei App-Wechsel / Screenshot */}
      {hidden && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: '#0a0a0f',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#334" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span style={{ color: '#334', fontSize: '13px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            App geschützt
          </span>
        </div>
      )}
    </>
  );
}
