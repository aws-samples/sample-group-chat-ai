// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import React from 'react';
import { Box, SpaceBetween, Badge, Button, Header } from '@cloudscape-design/components';
import { AvatarWithInfo } from './Avatar';
import { getPersonaAvatar } from '../utils/avatarUtils';
import { useTranslation } from 'react-i18next';

export interface PersonaTileData {
  personaId: string;
  name: string;
  role: string;
  details: string; // Free text field for all persona details
  avatarId?: string;
  voiceId?: string;
  isCustom: boolean;
  isSelected: boolean;
}

interface PersonaTileProps {
  persona: PersonaTileData;
  onSelect: (personaId: string) => void;
  onEdit: (personaId: string) => void;
  onDelete?: (personaId: string) => void;
}

export const PersonaTile: React.FC<PersonaTileProps> = ({
  persona,
  onSelect,
  onEdit,
  onDelete,
}) => {
  const { t } = useTranslation();
  return (
    <div
      style={{
        border: persona.isSelected ? '2px solid #0073bb' : '1px solid #e9ebed',
        borderRadius: '8px',
        padding: '16px',
        backgroundColor: persona.isSelected ? '#f0f8ff' : '#ffffff',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        position: 'relative',
        minHeight: '200px',
      }}
      onClick={() => onSelect(persona.personaId)}
    >
      <SpaceBetween size='s'>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
            <AvatarWithInfo
              avatarId={getPersonaAvatar(persona.personaId, persona.avatarId)}
              personaId={persona.personaId}
              name={persona.name}
              role={persona.role}
              size='medium'
            />
            <div style={{ flex: 1 }}>
              <Header variant='h3'>{persona.name}</Header>
            </div>
          </div>
          {persona.isSelected && <Badge color='blue'>{/*nosemgrep: i18next-key-format */t('common:labels.selected')}</Badge>}
        </div>

        <SpaceBetween direction='horizontal' size='xs'>
          <Badge>{persona.role}</Badge>
          {persona.isCustom && <Badge color='green'>{/*nosemgrep: i18next-key-format */ t('common:labels.custom')}</Badge>}
        </SpaceBetween>

        <Box>
          <div
            style={{
              fontSize: '12px',
              color: '#5f6b7a',
              lineHeight: '1.4',
              maxHeight: '80px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 4,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {persona.details || t('common:labels.noDetailsProvided') /* nosemgrep: i18next-key-format*/}
          </div>
        </Box>

        <div
          style={{
            position: 'absolute',
            bottom: '12px',
            right: '12px',
            display: 'flex',
            gap: '8px',
          }}
        >
          <Button
            variant='link'
            onClick={e => {
              e.stopPropagation();
              onEdit(persona.personaId);
            }}
            iconName='edit'
            ariaLabel={`Edit ${persona.name}`}
          />
          {persona.isCustom && onDelete && (
            <Button
              variant='link'
              onClick={e => {
                e.stopPropagation();
                onDelete(persona.personaId);
              }}
              ariaLabel={`Delete ${persona.name}`}
            />
          )}
        </div>
      </SpaceBetween>
    </div>
  );
};
