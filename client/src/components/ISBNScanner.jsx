import { useEffect, useRef } from 'react';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';

/**
 * ISBNScanner — scans EAN-13 barcodes (ISBN) on physical books.
 * Calls onScan(isbn) when a barcode is detected.
 */
export default function ISBNScanner({ onScan }) {
  const divRef  = useRef(null);
  const scanRef = useRef(null);

  useEffect(() => {
    if (!divRef.current || scanRef.current) return;

    const scanner = new Html5QrcodeScanner(
      'isbn-reader-el',
      {
        fps: 10,
        qrbox: { width: 300, height: 120 },   // wider box for barcodes
        aspectRatio: 2.5,
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,  // standard ISBN barcode
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.QR_CODE, // also support QR just in case
        ],
      },
      false
    );

    scanner.render(
      (text) => { onScan?.(text); },
      () => {}  // suppress error logs
    );

    scanRef.current = scanner;

    return () => {
      scanRef.current?.clear().catch(() => {});
      scanRef.current = null;
    };
  }, []);

  return (
    <div style={{ textAlign:'center' }}>
      <p style={{ fontSize:12.5, color:'var(--text-3)', marginBottom:10 }}>
        Point camera at the <strong style={{ color:'var(--text-2)' }}>barcode on the back</strong> of the book
      </p>
      <div
        ref={divRef}
        id="isbn-reader-el"
        style={{
          border:'2px solid var(--accent)',
          borderRadius:'var(--r-lg)',
          overflow:'hidden',
          boxShadow:'0 0 24px rgba(14,165,233,.25)',
          maxWidth:420,
          margin:'0 auto',
        }}
      />
    </div>
  );
}
