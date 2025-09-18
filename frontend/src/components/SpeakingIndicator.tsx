// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import React from 'react';

interface SpeakingIndicatorProps {
  isActive: boolean;
  children: React.ReactNode;
  glowColor?: string;
}

export const SpeakingIndicator: React.FC<SpeakingIndicatorProps> = ({
  isActive,
  children,
  glowColor = '#0073bb',
}) => {
  const pulsingKeyframes = `
    @keyframes speaking-pulse {
      0% {
        box-shadow: 0 0 0 0 ${glowColor}40;
        transform: scale(1);
      }
      50% {
        box-shadow: 0 0 0 8px ${glowColor}20;
        transform: scale(1.05);
      }
      100% {
        box-shadow: 0 0 0 0 ${glowColor}00;
        transform: scale(1);
      }
    }
  `;

  return (
    <>
      <style>{pulsingKeyframes}</style>
      <div
        style={{
          position: 'relative',
          display: 'inline-block',
          borderRadius: '50%',
          animation: isActive ? 'speaking-pulse 1.5s ease-in-out infinite' : 'none',
          transition: 'all 0.3s ease-in-out',
        }}
      >
        {children}
      </div>
    </>
  );
};
