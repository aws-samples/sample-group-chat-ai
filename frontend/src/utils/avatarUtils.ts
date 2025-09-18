// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

// Avatar metadata and utilities for Group Chat AI

import { getPersonaById } from '@group-chat-ai/shared';

export interface AvatarInfo {
  id: string;
  imagePath: string;
}

export const AVAILABLE_AVATARS: AvatarInfo[] = [
  {
    id: 'avatar1',
    imagePath: '/avatars/Avatar1.svg',
  },
  {
    id: 'avatar2',
    imagePath: '/avatars/Avatar2.svg',
  },
  {
    id: 'avatar3',
    imagePath: '/avatars/Avatar3.svg',
  },
  {
    id: 'avatar4',
    imagePath: '/avatars/Avatar4.svg',
  },
  {
    id: 'avatar5',
    imagePath: '/avatars/Avatar5.svg',
  },
  {
    id: 'avatar6',
    imagePath: '/avatars/Avatar6.svg',
  },
  {
    id: 'avatar7',
    imagePath: '/avatars/Avatar7.svg',
  },
  {
    id: 'avatar8',
    imagePath: '/avatars/Avatar8.svg',
  },
  {
    id: 'avatar9',
    imagePath: '/avatars/Avatar9.svg',
  },
  {
    id: 'avatar10',
    imagePath: '/avatars/Avatar10.svg',
  },
  {
    id: 'avatar11',
    imagePath: '/avatars/Avatar11.svg',
  },
  {
    id: 'avatar12',
    imagePath: '/avatars/Avatar12.svg',
  },
  {
    id: 'avatar13',
    imagePath: '/avatars/Avatar13.svg',
  },
  {
    id: 'avatar14',
    imagePath: '/avatars/Avatar14.svg',
  },
  {
    id: 'avatar15',
    imagePath: '/avatars/Avatar15.svg',
  },
  {
    id: 'avatar16',
    imagePath: '/avatars/Avatar16.svg',
  },
  {
    id: 'avatar17',
    imagePath: '/avatars/Avatar17.svg',
  },
  {
    id: 'avatar18',
    imagePath: '/avatars/Avatar18.svg',
  },
  {
    id: 'avatar19',
    imagePath: '/avatars/Avatar19.svg',
  },
  {
    id: 'avatar20',
    imagePath: '/avatars/Avatar20.svg',
  },
  {
    id: 'avatar21',
    imagePath: '/avatars/Avatar21.svg',
  },
  {
    id: 'avatar22',
    imagePath: '/avatars/Avatar22.svg',
  },
  {
    id: 'avatar23',
    imagePath: '/avatars/Avatar23.svg',
  },
  {
    id: 'avatar24',
    imagePath: '/avatars/Avatar24.svg',
  },
  {
    id: 'avatar25',
    imagePath: '/avatars/Avatar25.svg',
  },
  {
    id: 'avatar26',
    imagePath: '/avatars/Avatar26.svg',
  },
  {
    id: 'avatar27',
    imagePath: '/avatars/Avatar27.svg',
  },
];

// Default avatar assignments for personas (using generic persona IDs)
export const DEFAULT_PERSONA_AVATARS: Record<string, string> = {
  persona_1: 'avatar3', 
  persona_2: 'avatar5',
  persona_3: 'avatar1',
  persona_4: 'avatar12',
  persona_5: 'avatar10',
  persona_6: 'avatar6',
  persona_7: 'avatar16',
  persona_8: 'avatar8', 
  persona_9: 'avatar2',
  persona_10: 'avatar4',
  persona_11: 'avatar9',
  persona_12: 'avatar11',
  persona_13: 'avatar7',
  persona_14: 'avatar13',
  persona_15: 'avatar16',
  persona_16: 'avatar23'
};

// Get avatar info by ID
export const getAvatarInfo = (avatarId: string): AvatarInfo | null => {
  return AVAILABLE_AVATARS.find(avatar => avatar.id === avatarId) || null;
};

// Get avatar image path by ID
export const getAvatarImagePath = (avatarId: string): string => {
  const avatar = getAvatarInfo(avatarId);
  return avatar ? avatar.imagePath : '';
};

// Get default avatar for a persona
export const getDefaultAvatarForPersona = (personaId: string): string => {
  return DEFAULT_PERSONA_AVATARS[personaId] || 'avatar1';
};

// Get avatar options for dropdowns
export const getAvatarOptions = () => {
  return AVAILABLE_AVATARS.map(avatar => ({
    value: avatar.id,
    imagePath: avatar.imagePath,
  }));
};

// Validate avatar ID
export const isValidAvatarId = (avatarId: string): boolean => {
  return AVAILABLE_AVATARS.some(avatar => avatar.id === avatarId);
};

// Get avatar for persona with fallback
export const getPersonaAvatar = (personaId: string, customAvatarId?: string): string => {
  // Use custom avatar if provided and valid
  if (customAvatarId && isValidAvatarId(customAvatarId)) {
    return customAvatarId;
  }

  // Fall back to default avatar for persona
  return getDefaultAvatarForPersona(personaId);
};

// Get persona display name (use the actual persona data)
export const getPersonaDisplayName = (personaId: string): string => {
  const persona = getPersonaById(personaId);
  return persona ? persona.name : personaId.toUpperCase();
};

// Get persona role (from persona data)
export const getPersonaRole = (personaId: string): string => {
  const persona = getPersonaById(personaId);
  return persona ? persona.role : 'AI Persona';
};
