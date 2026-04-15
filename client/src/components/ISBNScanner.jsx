import { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

/**
 * ISBNScanner — scans EAN-13/ISBN barcodes AND QR codes.
 * Uses a unique DOM id per instance to avoid React conflicts.
 */
export default function ISBNScanner({ onScan }) {
  const idRef   = useRef(`isbn-reader-${Math.random().toString(36).slice(2)}`);
  const scanRef = useRef(null);

  useEffect(() => {
    const id = idRef.current;

    // Small delay to ensure the DOM element is mounted
    const timer = setTimeout(() => {
      if (scanRef.current) return;

      try {
        const scanner = new Html5QrcodeScanner(
          id,
          {
            fps: 10,
            qrbox: { width: 280, height: 100 },  // wide box optimised for barcodes
            rememberLastUsedCamera: true,
            showTorchButtonIfSupported: true,
          },
          /* verbose= */ false
        );

        scanner.render(
          (decodedText) => {
            onScan?.(decodedText.trim());
          },
          () => {} // suppress error logs
        );

        scanRef.current = scanner;
      } catch (e) {
        console.warn('ISBNScanner init error:', e);
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      if (scanRef.current) {
        scanRef.current.clear().catch(() => {});
        scanRef.current = null;
      }
    };
  }, []);

  return (
    <div style={{ textAlign: 'center' }}>
      <p style={{ fontSize: 12.5, color: 'var(--text-3)', marginBottom: 10, lineHeight: 1.5 }}>
        Hold the camera <strong style={{ color: 'var(--text-2)' }}>steady</strong> over the barcode
        on the <strong style={{ color: 'var(--text-2)' }}>back cover</strong> —
        keep it flat and well-lit
      </p>
      <div
        id={idRef.current}
        style={{
          border: '2px solid var(--accent)',
          borderRadius: 'var(--r-lg)',
          overflow: 'hidden',
          boxShadow: '0 0 24px rgba(14,165,233,.2)',
          maxWidth: 440,
          margin: '0 auto',
        }}
      />
    </div>
  );
}
