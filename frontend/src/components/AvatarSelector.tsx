// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import React, { useState } from 'react';
import { Box, SpaceBetween, Button, ColumnLayout } from '@cloudscape-design/components';
import { useTranslation } from 'react-i18next';
import { Avatar } from './Avatar';
import { AVAILABLE_AVATARS, getPersonaAvatar } from '../utils/avatarUtils';

interface AvatarSelectorProps {
  personaId: string;
  selectedAvatarId?: string;
  onAvatarSelect: (avatarId: string | undefined) => void;
}

export const AvatarSelector: React.FC<AvatarSelectorProps> = ({
  personaId,
  selectedAvatarId,
  onAvatarSelect,
}) => {
  const { t } = useTranslation('components');
  const [isExpanded, setIsExpanded] = useState(false);

  const currentAvatarId = selectedAvatarId || getPersonaAvatar(personaId);

  const handleAvatarClick = (avatarId: string) => {
    const defaultAvatarId = getPersonaAvatar(personaId);
    // If clicking the default avatar, pass undefined to clear custom selection
    onAvatarSelect(avatarId === defaultAvatarId ? undefined : avatarId);
    setIsExpanded(false);
  };

  return (
    <SpaceBetween size='m'>
      <Box>
        <SpaceBetween size='s'>
          <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{t('avatarSelector.currentAvatar')}:</div>
          <Avatar avatarId={currentAvatarId} personaId={personaId} size='large' />
          <Button
            variant='normal'
            onClick={() => setIsExpanded(!isExpanded)}
            iconName={isExpanded ? 'angle-up' : 'angle-down'}
          >
            {isExpanded ? t('avatarSelector.hideAvatars') : t('avatarSelector.changeAvatar')}
          </Button>
        </SpaceBetween>
      </Box>

      {isExpanded && (
        <Box>
          <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px' }}>
            {t('avatarSelector.selectAvatar')}:
          </div>
          <ColumnLayout columns={4} variant='text-grid'>
            {AVAILABLE_AVATARS.map(avatar => (
              <div
                key={avatar.id}
                style={{
                  cursor: 'pointer',
                  padding: '8px',
                  border: currentAvatarId === avatar.id ? '2px solid #0073bb' : '1px solid #e9ebed',
                  borderRadius: '8px',
                  backgroundColor: currentAvatarId === avatar.id ? '#f0f8ff' : '#ffffff',
                  textAlign: 'center',
                  transition: 'all 0.2s ease',
                }}
                onClick={() => handleAvatarClick(avatar.id)}
              >
                <Avatar avatarId={avatar.id} personaId={personaId} size='large' />
              </div>
            ))}
          </ColumnLayout>
        </Box>
      )}
    </SpaceBetween>
  );
};
