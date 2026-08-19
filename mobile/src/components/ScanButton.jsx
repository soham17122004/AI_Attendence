import React from 'react';
import { Camera, RefreshCw } from 'lucide-react';

export default function ScanButton({ onScan, disabled, scanning }) {
  return (
    <div className="scan-button-container">
      <button
        onClick={onScan}
        disabled={disabled || scanning}
        className="btn-mobile btn-scan"
      >
        {scanning ? (
          <>
            <RefreshCw size={24} className="spin" />
            <span>Scanning Face...</span>
          </>
        ) : (
          <>
            <Camera size={24} />
            <span>SCAN FACE</span>
          </>
        )}
      </button>
    </div>
  );
}
