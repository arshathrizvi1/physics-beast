"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Critical Global Error:", error);
    
    // Auto-reload on chunk load errors
    if (
      error.message?.toLowerCase().includes("chunk") || 
      error.message?.toLowerCase().includes("fetch") ||
      error.message?.toLowerCase().includes("network") ||
      error.message?.toLowerCase().includes("failed to load")
    ) {
      window.location.reload();
    }
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', padding: '20px', fontFamily: 'system-ui, sans-serif', backgroundColor: '#000', color: '#fff', textAlign: 'center' }}>
          <h2 style={{ fontSize: '24px', marginBottom: '10px' }}>App crashed</h2>
          <p style={{ color: '#aaa', marginBottom: '20px', maxWidth: '400px' }}>
            We encountered a critical error. Please refresh the app to continue.
          </p>
          <button 
            onClick={() => window.location.reload()}
            style={{ padding: '12px 24px', backgroundColor: '#d4af37', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}
          >
            Reload App
          </button>
        </div>
      </body>
    </html>
  );
}
