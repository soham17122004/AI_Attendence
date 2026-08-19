import React from 'react';
import { Scan, Sparkles } from 'lucide-react';

export default function FaceFrame({ scanning }) {
  return (
    <div className="face-frame-overlay">
      <div className={`target-frame ${scanning ? 'is-scanning' : ''}`}>
        {/* Biometric Face Guide Oval */}
        <div className="biometric-face-oval" />
        
        {/* Target Corners */}
        <div className="corner top-left" />
        <div className="corner top-right" />
        <div className="corner bottom-left" />
        <div className="corner bottom-right" />
        
        {/* Scanning Laser Line */}
        {scanning && (
          <div className="scanning-bar-container">
            <div className="scanning-bar" />
            <div className="scan-glow-particle" />
          </div>
        )}
      </div>

      <div className={`frame-instruction-pill ${scanning ? 'scanning-active' : ''}`}>
        {scanning ? (
          <>
            <Sparkles size={14} className="spin text-accent" />
            <span>Scanning Neural Face Profile...</span>
          </>
        ) : (
          <>
            <Scan size={14} />
            <span>Position your face inside the guide</span>
          </>
        )}
      </div>
    </div>
  );
}
