// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import React from 'react';
import { getAvatarImagePath, getPersonaAvatar } from '../utils/avatarUtils';

export interface AvatarProps {
  avatarId?: string;
  personaId?: string;
  size?: 'small' | 'medium' | 'large';
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const Avatar: React.FC<AvatarProps> = ({
  avatarId,
  personaId,
  size = 'medium',
  alt,
  className = '',
  style = {},
}) => {
  // Determine which avatar to use
  const finalAvatarId = avatarId || (personaId ? getPersonaAvatar(personaId) : 'avatar1');
  const imagePath = getAvatarImagePath(finalAvatarId);

  // Size configurations
  const sizeConfig = {
    small: { width: 32, height: 32 },
    medium: { width: 48, height: 48 },
    large: { width: 64, height: 64 },
  };

  const dimensions = sizeConfig[size];
  const altText = alt || `Avatar ${finalAvatarId}`;

  // Fallback if image fails to load
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.target as HTMLImageElement;
    target.style.display = 'none';

    // Show fallback div
    const fallback = target.nextElementSibling as HTMLElement;
    if (fallback) {
      fallback.style.display = 'flex';
    }
  };

  return (
    <div
      className={`avatar-container ${className}`}
      style={{
        position: 'relative',
        display: 'inline-block',
        ...dimensions,
        ...style,
      }}
    >
      {/* Avatar image */}
      <img
        src={imagePath}
        alt={altText}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          objectFit: 'cover',
          border: '2px solid #e9ebed',
          backgroundColor: '#fafbfc',
        }}
        onError={handleImageError}
      />

      {/* Fallback placeholder */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          backgroundColor: '#0073bb',
          color: 'white',
          display: 'none',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: size === 'small' ? '12px' : size === 'medium' ? '16px' : '20px',
          fontWeight: 'bold',
          border: '2px solid #e9ebed',
        }}
      >
        {personaId ? personaId.charAt(0).toUpperCase() : '?'}
      </div>
    </div>
  );
};

// Avatar with tooltip/hover info
export interface AvatarWithInfoProps extends AvatarProps {
  name?: string;
  role?: string;
  showTooltip?: boolean;
}

export const AvatarWithInfo: React.FC<AvatarWithInfoProps> = ({
  name,
  role,
  showTooltip = true,
  ...avatarProps
}) => {
  const tooltipText = name && role ? `${name} (${role})` : name || role || '';

  return (
    <div title={showTooltip ? tooltipText : undefined} style={{ display: 'inline-block' }}>
      <Avatar {...avatarProps} alt={tooltipText} />
    </div>
  );
};
