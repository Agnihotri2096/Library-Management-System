import { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

export default function QRScanner({ onScan, title = 'Point camera at QR code' }) {
  const divRef  = useRef(null);
  const scanRef = useRef(null);

  useEffect(() => {
    if (!divRef.current || scanRef.current) return;

    const scanner = new Html5QrcodeScanner(
      'qr-reader-el',
      { fps: 10, qrbox: { width: 220, height: 220 }, aspectRatio: 1 },
      false
    );

    scanner.render(
      (text) => {
        onScan?.(text);
        // Don't clear so librarian can scan again quickly
      },
      () => {}     // suppress verbose error logs
    );

    scanRef.current = scanner;

    return () => {
      scanRef.current?.clear().catch(() => {});
      scanRef.current = null;
    };
  }, []);

  return (
    <div style={{ textAlign: 'center' }}>
      <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 12 }}>{title}</p>
      <div
        ref={divRef}
        id="qr-reader-el"
        style={{
          border: '2px solid var(--primary)',
          borderRadius: 'var(--r-lg)',
          overflow: 'hidden',
          boxShadow: '0 0 30px var(--primary-glow)',
          maxWidth: 380,
          margin: '0 auto',
        }}
      />
    </div>
  );
}
